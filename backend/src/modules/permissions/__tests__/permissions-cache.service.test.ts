import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionsCacheService } from "../permissions-cache.service.js";

describe("PermissionsCacheService", () => {
  let cacheService: PermissionsCacheService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      selectDistinct: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { name: "users:read" },
        { name: "users:create" },
      ]),
    };

    cacheService = new PermissionsCacheService(mockDb);
  });

  it("should return null on cache miss", async () => {
    const cached = await cacheService.getUserPermissions(1);
    expect(cached).toBeNull();
  });

  it("should cache permissions and return cached values", async () => {
    await cacheService.setUserPermissions(1, ["users:read", "roles:read"]);
    const cached = await cacheService.getUserPermissions(1);
    expect(cached).toEqual(["users:read", "roles:read"]);
  });

  it("should invalidate cache for specific user", async () => {
    await cacheService.setUserPermissions(1, ["users:read"]);
    await cacheService.setUserPermissions(2, ["roles:read"]);

    await cacheService.invalidateUser(1);

    expect(await cacheService.getUserPermissions(1)).toBeNull();
    expect(await cacheService.getUserPermissions(2)).toEqual(["roles:read"]);
  });

  it("should invalidate all cached user permissions", async () => {
    await cacheService.setUserPermissions(1, ["users:read"]);
    await cacheService.setUserPermissions(2, ["roles:read"]);

    await cacheService.invalidateAll();

    expect(await cacheService.getUserPermissions(1)).toBeNull();
    expect(await cacheService.getUserPermissions(2)).toBeNull();
  });

  it("should fetch from DB on cache miss with getUserPermissionsOrFetch", async () => {
    const perms = await cacheService.getUserPermissionsOrFetch(5);
    expect(perms).toEqual(["users:read", "users:create"]);
    expect(mockDb.where).toHaveBeenCalledTimes(1);

    // Second call should hit the cache without calling DB again
    const secondCall = await cacheService.getUserPermissionsOrFetch(5);
    expect(secondCall).toEqual(["users:read", "users:create"]);
    expect(mockDb.where).toHaveBeenCalledTimes(1);
  });
});
