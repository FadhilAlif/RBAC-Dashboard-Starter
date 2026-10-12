import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RolesService } from "./roles.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../common/guards/permissions.guard.js";
import { RequirePermissions } from "../../common/decorators/permissions.decorator.js";
import { Audit } from "../../common/decorators/audit.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  assignPermissionSchema,
  createRoleSchema,
  syncPermissionsSchema,
  updateRoleSchema,
  type AssignPermissionInput,
  type CreateRoleInput,
  type SyncPermissionsInput,
  type UpdateRoleInput,
} from "./roles.schemas.js";

import { Inject } from "@nestjs/common";

@ApiTags("Roles")
@Controller("api/roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(@Inject(RolesService) private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions("roles:read", "users:read", "users:update")
  async listRoles(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("permission") permission?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 10;

    return this.rolesService.listRoles(pageNum, limitNum, search, permission);
  }

  @Get("export")
  @RequirePermissions("roles:read")
  async exportRoles(
    @Query("search") search: string | undefined,
    @Query("permission") permission: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.rolesService.buildRolesExportWorkbook(search, permission);

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="roles.xlsx"',
    });

    return new StreamableFile(buffer);
  }

  @Get(":id")
  @RequirePermissions("roles:read")
  async getRole(@Param("id", ParseIntPipe) id: number) {
    const role = await this.rolesService.getRole(id);
    if (!role) throw new Error("ROLE_NOT_FOUND");
    return { data: role };
  }

  @Audit({ action: "roles:create", resourceType: "roles" })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("roles:create")
  @UsePipes(new ZodValidationPipe(createRoleSchema))
  async createRole(@Body() input: CreateRoleInput) {
    const roleId = await this.rolesService.createRole(input);
    return {
      message: "Role created successfully",
      data: { id: roleId, name: input.name },
    };
  }

  @Audit({ action: "roles:update", resourceType: "roles", resourceIdParam: "id" })
  @Patch(":id")
  @RequirePermissions("roles:update")
  @UsePipes(new ZodValidationPipe(updateRoleSchema))
  async updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateRoleInput,
  ) {
    await this.rolesService.updateRole(id, input);
    return {
      message: "Role updated successfully",
      data: null,
    };
  }

  @Audit({ action: "roles:delete", resourceType: "roles", resourceIdParam: "id" })
  @Delete(":id")
  @RequirePermissions("roles:delete")
  async deleteRole(@Param("id", ParseIntPipe) id: number) {
    await this.rolesService.deleteRole(id);
    return {
      message: "Role deleted successfully",
      data: null,
    };
  }

  @Audit({ action: "roles:sync_permissions", resourceType: "roles", resourceIdParam: "id" })
  @Put(":id/permissions")
  @RequirePermissions("roles:update")
  @UsePipes(new ZodValidationPipe(syncPermissionsSchema))
  async syncPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: SyncPermissionsInput,
  ) {
    await this.rolesService.syncPermissions(id, input.permission_ids);
    return {
      message: "Permissions updated successfully",
      data: null,
    };
  }

  @Audit({ action: "roles:assign_permission", resourceType: "roles", resourceIdParam: "id" })
  @Post(":id/permissions")
  @RequirePermissions("roles:update")
  @UsePipes(new ZodValidationPipe(assignPermissionSchema))
  async assignPermission(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: AssignPermissionInput,
  ) {
    await this.rolesService.assignPermission(id, input.permission_id);
    return {
      message: "Permission added successfully",
      data: null,
    };
  }

  @Audit({ action: "roles:remove_permission", resourceType: "roles", resourceIdParam: "id" })
  @Delete(":id/permissions/:permissionId")
  @RequirePermissions("roles:update")
  async removePermission(
    @Param("id", ParseIntPipe) id: number,
    @Param("permissionId", ParseIntPipe) permissionId: number,
  ) {
    await this.rolesService.removePermission(id, permissionId);
    return {
      message: "Permission removed successfully",
      data: null,
    };
  }
}
