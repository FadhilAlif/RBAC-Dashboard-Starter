import { Module, Controller, Get } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { RolesModule } from "./modules/roles/roles.module.js";
import { PermissionsModule } from "./modules/permissions/permissions.module.js";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { Public } from "./common/decorators/public.decorator.js";
import { AppThrottlerGuard } from "./common/guards/throttler.guard.js";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor.js";

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
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,
        limit: 60,
      },
    ]),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
