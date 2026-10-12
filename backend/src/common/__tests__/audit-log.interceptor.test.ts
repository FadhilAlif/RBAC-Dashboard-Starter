import { describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";
import { AuditLogInterceptor } from "../interceptors/audit-log.interceptor.js";
import type { ExecutionContext, CallHandler } from "@nestjs/common";

describe("AuditLogInterceptor", () => {
  it("should do nothing if no @Audit metadata is present", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = vi.fn().mockReturnValue(undefined);

    const mockAuditService = { log: vi.fn() };
    const interceptor = new AuditLogInterceptor(reflector, mockAuditService as any);

    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of({ success: true }),
    };

    const result = await new Promise((resolve) => {
      interceptor.intercept(context, next).subscribe((val) => resolve(val));
    });

    expect(result).toEqual({ success: true });
    expect(mockAuditService.log).not.toHaveBeenCalled();
  });

  it("should record audit log and sanitize sensitive fields when @Audit metadata is present", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = vi.fn().mockReturnValue({
      action: "users:update",
      resourceType: "users",
      resourceIdParam: "id",
    });

    const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditLogInterceptor(reflector, mockAuditService as any);

    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: "42" },
          user: { id: 7 },
          ip: "127.0.0.1",
          body: {
            name: "Updated Name",
            password: "super-secret-password",
            current_password: "old-password",
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of({ data: { id: 42 } }),
    };

    await new Promise((resolve) => {
      interceptor.intercept(context, next).subscribe((val) => resolve(val));
    });

    expect(mockAuditService.log).toHaveBeenCalledTimes(1);
    const callArgs = mockAuditService.log.mock.calls[0]![0];
    expect(callArgs.userId).toBe(7);
    expect(callArgs.action).toBe("users:update");
    expect(callArgs.resourceType).toBe("users");
    expect(callArgs.resourceId).toBe(42);
    expect(callArgs.ipAddress).toBe("127.0.0.1");

    // Ensure password was redacted!
    expect(callArgs.details.password).toBe("[REDACTED]");
    expect(callArgs.details.current_password).toBe("[REDACTED]");
    expect(callArgs.details.name).toBe("Updated Name");
  });
});
