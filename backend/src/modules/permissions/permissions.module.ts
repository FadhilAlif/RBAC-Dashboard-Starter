import { Global, Module } from "@nestjs/common";
import { PermissionsController } from "./permissions.controller.js";
import { PermissionsService } from "./permissions.service.js";
import { PermissionsCacheService } from "./permissions-cache.service.js";

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsCacheService],
  exports: [PermissionsService, PermissionsCacheService],
})
export class PermissionsModule {}
