import {
  Controller,
  Get,
  Inject,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { DashboardService } from "./dashboard.service.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";

@ApiTags("Dashboard")
@Controller("api/dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get("stats")
  async getStats() {
    const stats = await this.dashboardService.getDashboardStats();
    return { data: stats };
  }

  @Get("role-distribution")
  async getRoleDistribution() {
    const distribution = await this.dashboardService.getRoleDistribution();
    return { data: distribution };
  }

  @Get("export")
  async exportDashboard(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.dashboardService.buildExportWorkbook();

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="dashboard.xlsx"',
    });

    return new StreamableFile(buffer);
  }
}
