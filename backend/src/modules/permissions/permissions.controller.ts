import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { PermissionsService } from "./permissions.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../common/guards/permissions.guard.js";
import { RequirePermissions } from "../../common/decorators/permissions.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  createPermissionSchema,
  updatePermissionSchema,
  type CreatePermissionInput,
  type UpdatePermissionInput,
} from "./permissions.schemas.js";

@ApiTags("Permissions")
@Controller("api/permissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @RequirePermissions("permissions:read")
  async listPermissions(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("usage") usage?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 50;

    return this.permissionsService.listPermissions(pageNum, limitNum, search, usage);
  }

  @Get("export")
  @RequirePermissions("permissions:read")
  async exportPermissions(
    @Query("search") search: string | undefined,
    @Query("usage") usage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.permissionsService.buildPermissionsExportWorkbook(search, usage);

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="permissions.xlsx"',
    });

    return new StreamableFile(buffer);
  }

  @Get(":id")
  @RequirePermissions("permissions:read")
  async getPermission(@Param("id", ParseIntPipe) id: number) {
    const perm = await this.permissionsService.getPermission(id);
    if (!perm) throw new Error("PERMISSION_NOT_FOUND");
    return { data: perm };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("permissions:create")
  @UsePipes(new ZodValidationPipe(createPermissionSchema))
  async createPermission(@Body() input: CreatePermissionInput) {
    const permId = await this.permissionsService.createPermission(input);
    return {
      message: "Permission created successfully",
      data: { id: permId, name: input.name },
    };
  }

  @Patch(":id")
  @RequirePermissions("permissions:update")
  @UsePipes(new ZodValidationPipe(updatePermissionSchema))
  async updatePermission(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdatePermissionInput,
  ) {
    await this.permissionsService.updatePermission(id, input);
    return {
      message: "Permission updated successfully",
      data: null,
    };
  }

  @Delete(":id")
  @RequirePermissions("permissions:delete")
  async deletePermission(@Param("id", ParseIntPipe) id: number) {
    await this.permissionsService.deletePermission(id);
    return {
      message: "Permission deleted successfully",
      data: null,
    };
  }
}
