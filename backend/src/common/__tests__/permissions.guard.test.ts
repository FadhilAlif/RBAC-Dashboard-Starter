import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../guards/permissions.guard.js";
import { ForbiddenException, type ExecutionContext } from "@nestjs/common";

describe("PermissionsGuard", () => {
  it("should allow access if no permissions required", () => {
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

    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow access if user has at least one required permission", () => {
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

    expect(guard.canActivate(context)).toBe(true);
  });

  it("should throw ForbiddenException if user lacks required permissions", () => {
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

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
