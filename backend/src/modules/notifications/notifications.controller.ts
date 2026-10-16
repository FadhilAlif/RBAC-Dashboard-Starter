import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Sse,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Observable } from "rxjs";
import { NotificationsService } from "./notifications.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../common/guards/permissions.guard.js";
import { RequirePermissions } from "../../common/decorators/permissions.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Audit } from "../../common/decorators/audit.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type.js";
import {
  broadcastNotificationSchema,
  type BroadcastNotificationInput,
} from "./notifications.schemas.js";

@ApiTags("Notifications")
@Controller("api/notifications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Sse("stream")
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.notificationsService.getUserSseStream(user.id);
  }

  @Get()
  async getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getNotifications(user.id);
  }

  @Audit({ action: "notifications:broadcast", resourceType: "notifications" })
  @Post(["", "broadcast"])
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("notifications:create")
  @UsePipes(new ZodValidationPipe(broadcastNotificationSchema))
  async broadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BroadcastNotificationInput,
  ) {
    const result = await this.notificationsService.broadcast(user.id, input);
    return {
      message: "Notification broadcasted successfully",
      data: result,
    };
  }

  @Patch(":id/read")
  async markAsRead(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.notificationsService.markAsRead(id, user.id);
    return {
      message: "Notification marked as read",
      data: null,
    };
  }

  @Patch("read-all")
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return {
      message: "All notifications marked as read",
      data: null,
    };
  }
}
