
import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { ReportsService } from './reports.service.js';

import { HealthReportQueryDto } from './dto/health-report-query.dto.js';
import { AppointmentSummaryQueryDto } from './dto/appointment-summary-query.dto.js';

import { generateHealthReportCsv } from './utils/health-report-csv.js';

import { generateHealthReportPdf } from './utils/health-report-pdf.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import type { JwtUser } from '../../common/types/jwt-user.type.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
  ) {}

  // Existing JSON report
  @Get('health')
  @RequirePermissions('report.read')
  getHealthReport(
    @Query() query: HealthReportQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reportsService.getHealthReport(
      query,
      user.userId,
    );
  }

  // CSV export
  @Get('health/export/csv')
  @RequirePermissions('report.export')
  async exportHealthReportCsv(
    @Query() query: HealthReportQueryDto,
    @CurrentUser() user: JwtUser,
    @Res() response: Response,
  ): Promise<void> {
    const report =
      await this.reportsService.getHealthReport(
        query,
        user.userId,
      );

    const csv = generateHealthReportCsv(report);

    const facilityCode = report.facility.code
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const periodLabel = report.reportingPeriod.label
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const filename =
      `health-report_${facilityCode}_${periodLabel}.csv`;

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    response.setHeader(
      'Cache-Control',
      'no-store',
    );

    response.send(csv);
  }

  // PDF export
  @Get('health/export/pdf')
  @RequirePermissions('report.export')
  async exportHealthReportPdf(
    @Query() query: HealthReportQueryDto,
    @CurrentUser() user: JwtUser,
    @Res() response: Response,
  ): Promise<void> {
    const report =
      await this.reportsService.getHealthReport(
        query,
        user.userId,
      );

    const pdf = await generateHealthReportPdf(report);

    const facilityCode = report.facility.code
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const periodLabel = report.reportingPeriod.label
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const filename =
      `health-report_${facilityCode}_${periodLabel}.pdf`;

    response.setHeader(
      'Content-Type',
      'application/pdf',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    response.setHeader(
      'Content-Length',
      pdf.length.toString(),
    );

    response.setHeader(
      'Cache-Control',
      'no-store',
    );

    response.end(pdf);
  }
  @Get('appointments/summary')
  @RequirePermissions('report.read')
  getAppointmentSummary(
    @Query() query: AppointmentSummaryQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reportsService.getAppointmentSummary(
      query,
      user.userId,
    );
  }
}
