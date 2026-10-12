import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../guards/permissions.guard.js";
import { ForbiddenException, type ExecutionContext } from "@nestjs/common";

describe("PermissionsGuard", () => {
  it("should allow access if no permissions required", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => null as any;

    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: [] } }),
      }),
    } as unknown as ExecutionContext;

    expect(await guard.canActivate(context)).toBe(true);
  });

  it("should allow access if user has at least one required permission", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ["users:read", "users:write"] as any;

    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: ["users:read"] } }),
      }),
    } as unknown as ExecutionContext;

    expect(await guard.canActivate(context)).toBe(true);
  });

  it("should resolve permissions from cache service when provided", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ["roles:create"] as any;

    const mockCacheService = {
      getUserPermissionsOrFetch: async (_userId: number) => ["roles:create", "roles:read"],
    } as any;

    const guard = new PermissionsGuard(reflector, mockCacheService);
    const requestUser: any = { id: 42, permissions: [] };
    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: requestUser }),
      }),
    } as unknown as ExecutionContext;

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(requestUser.permissions).toEqual(["roles:create", "roles:read"]);
  });

  it("should throw ForbiddenException if user lacks required permissions", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ["users:delete"] as any;

    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: ["users:read"] } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
