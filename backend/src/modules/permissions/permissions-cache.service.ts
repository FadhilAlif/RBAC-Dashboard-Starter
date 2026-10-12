import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import type { DrizzleDatabase } from "../../database/connection.js";
import { DRIZZLE_DB } from "../../database/database.module.js";
import {
  permissions,
  rolePermissions,
  userRoles,
} from "../../database/schema/index.js";

interface CacheEntry {
  permissions: string[];
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = 600; // 10 minutes TTL
const CACHE_PREFIX = "rbac:perms:user:";

@Injectable()
export class PermissionsCacheService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(PermissionsCacheService.name);
  private redis: Redis | null = null;
  private readonly memoryCache = new Map<number, CacheEntry>();

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
    if (redisUrl) {
      try {
        const client = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        client.on("error", (err: Error) => {
          this.logger.warn(`Redis client warning: ${err.message}`);
        });

        await client.connect();
        this.redis = client;
        this.logger.log("Redis connected successfully for RBAC permission caching.");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Redis connection failed (${errorMsg}). Falling back to In-Memory Cache with TTL.`,
        );
        this.redis = null;
      }
    } else {
      this.logger.log(
        "REDIS_URL not configured. Using high-performance in-memory cache (10 min TTL).",
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
      this.redis = null;
    }
    this.memoryCache.clear();
  }

  /**
   * Mengambil permissions dari cache (Redis atau In-Memory). Mengembalikan null jika cache miss atau expired.
   */
  async getUserPermissions(userId: number): Promise<string[] | null> {
    if (this.redis) {
      try {
        const key = `${CACHE_PREFIX}${userId}`;
        const raw = await this.redis.get(key);
        if (raw) {
          return JSON.parse(raw) as string[];
        }
      } catch (err) {
        this.logger.warn(`Error reading from Redis for user ${userId}: ${err}`);
      }
    }

    // Fallback atau default ke Memory Cache
    const entry = this.memoryCache.get(userId);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(userId);
      return null;
    }

    return entry.permissions;
  }

  /**
   * Menyimpan permissions user ke cache dengan TTL (detik)
   */
  async setUserPermissions(
    userId: number,
    userPermissions: string[],
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    if (this.redis) {
      try {
        const key = `${CACHE_PREFIX}${userId}`;
        await this.redis.set(key, JSON.stringify(userPermissions), "EX", ttlSeconds);
      } catch (err) {
        this.logger.warn(`Error writing to Redis for user ${userId}: ${err}`);
      }
    }

    // Selalu simpan di memory cache juga sebagai L1 cache
    this.memoryCache.set(userId, {
      permissions: userPermissions,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Fetch langsung daftar permission user dari Database (PostgreSQL/NeonDB)
   */
  async fetchUserPermissionsFromDb(userId: number): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ name: permissions.name })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(userRoles, eq(rolePermissions.roleId, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    return rows.map((r) => r.name);
  }

  /**
   * Mengambil permissions user: cek cache terlebih dahulu, jika miss fetch dari DB dan cache hasilnya.
   */
  async getUserPermissionsOrFetch(
    userId: number,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<string[]> {
    const cached = await this.getUserPermissions(userId);
    if (cached !== null) {
      return cached;
    }

    const freshPermissions = await this.fetchUserPermissionsFromDb(userId);
    await this.setUserPermissions(userId, freshPermissions, ttlSeconds);
    return freshPermissions;
  }

  /**
   * Invalidate cache untuk user tertentu (misal saat admin mengganti role user)
   */
  async invalidateUser(userId: number): Promise<void> {
    this.memoryCache.delete(userId);

    if (this.redis) {
      try {
        const key = `${CACHE_PREFIX}${userId}`;
        await this.redis.del(key);
      } catch (err) {
        this.logger.warn(`Error invalidating user ${userId} in Redis: ${err}`);
      }
    }
  }

  /**
   * Invalidate semua cache permission (misal saat role permissions diubah atau role dihapus)
   */
  async invalidateAll(): Promise<void> {
    this.memoryCache.clear();

    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (err) {
        this.logger.warn(`Error clearing Redis permission cache: ${err}`);
      }
    }
  }
}
