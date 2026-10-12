import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditLogsService } from "../../modules/audit-logs/audit-logs.service.js";
import {
  AUDIT_METADATA_KEY,
  type AuditMetadataInput,
  type AuditOptions,
} from "../decorators/audit.decorator.js";
import type { AuthenticatedUser } from "../types/authenticated-user.type.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "current_password",
  "currentPassword",
  "new_password",
  "newPassword",
  "confirmPassword",
  "confirm_password",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
]);

function sanitizeDetails(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = sanitizeDetails(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Optional()
    @Inject(AuditLogsService)
    private readonly auditLogsService?: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.getAllAndOverride<
      AuditMetadataInput | undefined
    >(AUDIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (!this.auditLogsService) return;

        try {
          const options: AuditOptions =
            typeof auditMeta === "string" ? { action: auditMeta } : auditMeta;

          const action = options.action;
          const resourceType =
            options.resourceType ||
            (action.includes(":") ? action.split(":")[0]! : "system");

          let resourceId: number | null = null;
          const paramKey = options.resourceIdParam || "id";
          const rawParam = request.params?.[paramKey];
          const paramStr = Array.isArray(rawParam) ? rawParam[0] : rawParam;
          if (paramStr) {
            const parsed = parseInt(paramStr, 10);
            if (!Number.isNaN(parsed)) resourceId = parsed;
          } else if (responseBody?.data?.id) {
            const parsed = parseInt(String(responseBody.data.id), 10);
            if (!Number.isNaN(parsed)) resourceId = parsed;
          } else if (responseBody?.id) {
            const parsed = parseInt(String(responseBody.id), 10);
            if (!Number.isNaN(parsed)) resourceId = parsed;
          }

          const user = request.user as AuthenticatedUser | undefined;
          const userId = user?.id ?? null;

          const ipAddress =
            request.ip ||
            (request.headers["x-forwarded-for"] as string) ||
            null;

          const sanitizedBody = sanitizeDetails(request.body);

          await this.auditLogsService.log({
            userId,
            action,
            resourceType,
            resourceId,
            details: sanitizedBody,
            ipAddress,
          });
        } catch (err) {
          this.logger.warn(`Failed to process audit log interceptor: ${err}`);
        }
      }),
    );
  }
}
