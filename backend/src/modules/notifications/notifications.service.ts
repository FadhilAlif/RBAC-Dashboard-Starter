import { Inject, Injectable } from "@nestjs/common";
import { desc, eq, inArray } from "drizzle-orm";
import { Subject, type Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import { DRIZZLE_DB } from "../../database/database.module.js";
import type { DrizzleDatabase } from "../../database/connection.js";
import {
  notificationReads,
  notificationRoles,
  notifications,
  userRoles,
} from "../../database/schema/index.js";
import type { BroadcastNotificationInput } from "./notifications.schemas.js";

export interface SseNotificationEvent {
  userId: number;
  type: string;
  data: unknown;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<SseNotificationEvent>();

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  getUserSseStream(userId: number): Observable<MessageEvent> {
    return this.events$.asObservable().pipe(
      filter((e) => e.userId === userId),
      map(
        (e) =>
          ({
            type: e.type,
            data: e.data,
          }) as unknown as MessageEvent,
      ),
    );
  }

  async broadcast(
    senderId: number,
    input: BroadcastNotificationInput,
  ): Promise<{ id: number; title: string; message: string; createdAt: Date }> {
    const createdNotification = await this.db.transaction(async (tx) => {
      const [newNotif] = await tx
        .insert(notifications)
        .values({
          title: input.title,
          message: input.message,
          createdBy: senderId,
        })
        .returning();

      if (!newNotif) throw new Error("Failed to create notification");

      for (const roleId of input.role_ids) {
        await tx
          .insert(notificationRoles)
          .values({ notificationId: newNotif.id, roleId })
          .onConflictDoNothing();
      }

      return newNotif;
    });

    // Cari user IDs yang memiliki role tersebut
    const matchedUsers = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(inArray(userRoles.roleId, input.role_ids));

    const uniqueUserIds = Array.from(new Set(matchedUsers.map((u) => u.userId)));

    // Emit event ke semua user yang sedang online
    for (const userId of uniqueUserIds) {
      this.events$.next({
        userId,
        type: "new_notification",
        data: {
          id: createdNotification.id,
          title: createdNotification.title,
          message: createdNotification.message,
          createdAt: createdNotification.createdAt,
        },
      });
    }

    return createdNotification;
  }

  async getNotifications(userId: number): Promise<{
    data: NotificationItem[];
    meta: { unread_count: number };
  }> {
    const userRoleRows = await this.db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    const roleIds = userRoleRows.map((r) => r.roleId);
    if (roleIds.length === 0) {
      return { data: [], meta: { unread_count: 0 } };
    }

    const notifRows = await this.db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .innerJoin(
        notificationRoles,
        eq(notifications.id, notificationRoles.notificationId),
      )
      .where(inArray(notificationRoles.roleId, roleIds))
      .orderBy(desc(notifications.createdAt));

    const readRows = await this.db
      .select({ notificationId: notificationReads.notificationId })
      .from(notificationReads)
      .where(eq(notificationReads.userId, userId));

    const readSet = new Set(readRows.map((r) => r.notificationId));

    const uniqueMap = new Map<number, NotificationItem>();
    for (const n of notifRows) {
      if (!uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, {
          id: n.id,
          title: n.title,
          message: n.message,
          is_read: readSet.has(n.id),
          created_at: n.createdAt,
        });
      }
    }

    const items = Array.from(uniqueMap.values());
    const unreadCount = items.filter((n) => !n.is_read).length;

    return {
      data: items,
      meta: { unread_count: unreadCount },
    };
  }

  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await this.db
      .insert(notificationReads)
      .values({ notificationId, userId })
      .onConflictDoNothing();
  }

  async markAllAsRead(userId: number): Promise<void> {
    const { data } = await this.getNotifications(userId);
    const unreadItems = data.filter((n) => !n.is_read);

    for (const item of unreadItems) {
      await this.db
        .insert(notificationReads)
        .values({ notificationId: item.id, userId })
        .onConflictDoNothing();
    }
  }
}
