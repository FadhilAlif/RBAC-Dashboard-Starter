import { Module, Controller, Get } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { RolesModule } from "./modules/roles/roles.module.js";
import { PermissionsModule } from "./modules/permissions/permissions.module.js";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { Public } from "./common/decorators/public.decorator.js";

@Controller()
export class AppController {
  @Public()
  @Get("health")
  health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuditLogsModule,
    DashboardModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
