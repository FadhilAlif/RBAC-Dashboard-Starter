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
import { UsersService } from "./users.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../../common/guards/permissions.guard.js";
import { RequirePermissions } from "../../common/decorators/permissions.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  createUserSchema,
  syncRolesSchema,
  updateUserSchema,
  type CreateUserInput,
  type SyncRolesInput,
  type UpdateUserInput,
} from "./users.schemas.js";

import { Inject } from "@nestjs/common";

@ApiTags("Users")
@Controller("api/users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions("users:read")
  async listUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 10;
    const statusBool = status === "true" || status === "active" ? true : status === "false" || status === "inactive" ? false : undefined;

    return this.usersService.listUsers(pageNum, limitNum, search, role, statusBool);
  }

  @Get("export")
  @RequirePermissions("users:read")
  async exportUsers(
    @Query("search") search: string | undefined,
    @Query("role") role: string | undefined,
    @Query("status") status: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.usersService.buildUsersExportWorkbook(search, role, status);

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="users.xlsx"',
    });

    return new StreamableFile(buffer);
  }

  @Get(":id")
  @RequirePermissions("users:read")
  async getUser(@Param("id", ParseIntPipe) id: number) {
    const user = await this.usersService.getUser(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return { data: user };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("users:create")
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async createUser(@Body() input: CreateUserInput) {
    const userId = await this.usersService.createUser(input);
    return {
      message: "User created successfully",
      data: { id: userId, email: input.email },
    };
  }

  @Patch(":id")
  @RequirePermissions("users:update")
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  async updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateUserInput,
  ) {
    await this.usersService.updateUser(id, input);
    return {
      message: "User updated successfully",
      data: null,
    };
  }

  @Delete(":id")
  @RequirePermissions("users:delete")
  async deleteUser(@Param("id", ParseIntPipe) id: number) {
    await this.usersService.deleteUser(id);
    return {
      message: "User deleted successfully",
      data: null,
    };
  }

  @Put(":id/roles")
  @RequirePermissions("users:update")
  @UsePipes(new ZodValidationPipe(syncRolesSchema))
  async syncRoles(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: SyncRolesInput,
  ) {
    await this.usersService.syncRoles(id, input.role_ids);
    return {
      message: "Roles assigned successfully",
      data: null,
    };
  }

  @Delete(":id/roles/:roleId")
  @RequirePermissions("users:update")
  async removeRole(
    @Param("id", ParseIntPipe) id: number,
    @Param("roleId", ParseIntPipe) roleId: number,
  ) {
    await this.usersService.removeRole(id, roleId);
    return {
      message: "Role removed successfully",
      data: null,
    };
  }
}
