import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuditLogsService } from "./audit-logs.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../common/guards/permissions.guard.js";
import { RequirePermissions } from "../../common/decorators/permissions.decorator.js";

@ApiTags("AuditLogs")
@Controller("api/audit-logs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(
    @Inject(AuditLogsService)
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @RequirePermissions("audit_logs:read")
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("user_id") userId?: string,
    @Query("userId") userIdCamel?: string,
    @Query("search") search?: string,
    @Query("action") action?: string,
    @Query("resource_type") resourceType?: string,
    @Query("resourceType") resourceTypeCamel?: string,
    @Query("date_from") dateFrom?: string,
    @Query("dateFrom") dateFromCamel?: string,
    @Query("date_to") dateTo?: string,
    @Query("dateTo") dateToCamel?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    const effectiveUserId = userId ?? userIdCamel;
    const effectiveResourceType = resourceType ?? resourceTypeCamel;
    const effectiveDateFrom = dateFrom ?? dateFromCamel;
    const effectiveDateTo = dateTo ?? dateToCamel;

    return this.auditLogsService.listAuditLogs(
      {
        userId: effectiveUserId ? parseInt(effectiveUserId, 10) : undefined,
        search,
        action,
        resourceType: effectiveResourceType,
        dateFrom: effectiveDateFrom ? new Date(effectiveDateFrom) : undefined,
        dateTo: effectiveDateTo ? new Date(effectiveDateTo) : undefined,
      },
      pageNum,
      limitNum,
    );
  }
}
