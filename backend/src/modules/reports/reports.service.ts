
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { HealthReportQueryDto } from './dto/health-report-query.dto.js';
import { AppointmentSummaryQueryDto } from './dto/appointment-summary-query.dto.js';

import { getReportDateRange } from './utils/report-date-range.js';

/* ============================================
   REPORT DISPLAY FIELD HELPERS
============================================ */

function resolveReportDisplayField(
  registeredValue: string | null,
  requestedValue: string | undefined,
): string | null {
  if (requestedValue === undefined) {
    return registeredValue;
  }

  const cleaned = requestedValue.trim();

  // Empty values do not erase registered data.
  return cleaned.length > 0
    ? cleaned
    : registeredValue;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getHealthReport(
    query: HealthReportQueryDto,
    userId: string,
  ) {
    /* ========================================
       AUTHENTICATED FACILITY
    ======================================== */

    // Never trust a facility ID supplied by
    // the browser.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        facilityId: true,
        status: true,
      },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.facilityId
    ) {
      throw new ForbiddenException(
        'An active user assigned to a facility is required',
      );
    }

    const facility = await this.prisma.facility.findUnique({
      where: { id: user.facilityId },
      select: {
        id: true,
        code: true,
        name: true,
        facilityType: true,
        country: true,
        region: true,
        city: true,
        address: true,
        timezone: true,
        status: true,
      },
    });

    if (!facility) {
      throw new NotFoundException(
        'Reporting facility not found',
      );
    }

    if (facility.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Reporting facility is not active',
      );
    }

    if (facility.timezone !== 'Africa/Addis_Ababa') {
      throw new ForbiddenException(
        'Reporting currently supports Africa/Addis_Ababa timezone only',
      );
    }

    /* ========================================
       REPORT-ONLY FACILITY DISPLAY INFORMATION
    ======================================== */

    const reportFacility = {
      id: facility.id,
      code: facility.code,
      name: facility.name,

      facilityType: resolveReportDisplayField(
        facility.facilityType,
        query.reportFacilityType,
      ),

      country: facility.country,

      region: resolveReportDisplayField(
        facility.region,
        query.reportRegion,
      ),

      city: resolveReportDisplayField(
        facility.city,
        query.reportCity,
      ),

      address: resolveReportDisplayField(
        facility.address,
        query.reportAddress,
      ),
    };

    const overriddenFields: string[] = [];

    if (
      query.reportFacilityType?.trim() &&
      reportFacility.facilityType !== facility.facilityType
    ) {
      overriddenFields.push('facility type');
    }

    if (
      query.reportRegion?.trim() &&
      reportFacility.region !== facility.region
    ) {
      overriddenFields.push('region');
    }

    if (
      query.reportCity?.trim() &&
      reportFacility.city !== facility.city
    ) {
      overriddenFields.push('city');
    }

    if (
      query.reportAddress?.trim() &&
      reportFacility.address !== facility.address
    ) {
      overriddenFields.push('address');
    }

    /* ========================================
       REPORTING PERIOD
    ======================================== */

    const range = getReportDateRange(query);

    const dateFilter = {
      gte: range.startDate,
      lt: range.endDate,
    };

    const encounterFilter = {
      facilityId: facility.id,
      startedAt: dateFilter,
    };

    /* ========================================
       PERFORMANCE INDICATORS
    ======================================== */

    const [
      newPatients,
      totalEncounters,
      completedEncounters,
      inProgressEncounters,
      cancelledEncounters,
      uniquePatientGroups,
      recordedDiagnoses,
      laboratoryOrders,
      laboratoryResults,
      radiologyOrders,
      radiologyResults,
    ] = await this.prisma.$transaction([
      this.prisma.patient.count({
        where: {
          registrationFacilityId: facility.id,
          createdAt: dateFilter,
        },
      }),

      this.prisma.encounter.count({
        where: encounterFilter,
      }),

      this.prisma.encounter.count({
        where: {
          ...encounterFilter,
          status: 'COMPLETED',
        },
      }),

      this.prisma.encounter.count({
        where: {
          ...encounterFilter,
          status: 'IN_PROGRESS',
        },
      }),

      this.prisma.encounter.count({
        where: {
          ...encounterFilter,
          status: 'CANCELLED',
        },
      }),

      this.prisma.encounter.groupBy({
        by: ['patientId'],
        where: encounterFilter,
      }),

      this.prisma.diagnosis.count({
        where: {
          createdAt: dateFilter,
          encounter: {
            facilityId: facility.id,
          },
        },
      }),

      this.prisma.labOrder.count({
        where: {
          orderedAt: dateFilter,
          encounter: {
            facilityId: facility.id,
          },
        },
      }),

      this.prisma.labResult.count({
        where: {
          resultedAt: dateFilter,
          labOrderItem: {
            labOrder: {
              encounter: {
                facilityId: facility.id,
              },
            },
          },
        },
      }),

      this.prisma.radiologyOrder.count({
        where: {
          orderedAt: dateFilter,
          encounter: {
            facilityId: facility.id,
          },
        },
      }),

      this.prisma.radiologyResult.count({
        where: {
          reportedAt: dateFilter,
          radiologyOrder: {
            encounter: {
              facilityId: facility.id,
            },
          },
        },
      }),
    ]);

    /* ========================================
       REPORT NOTES
    ======================================== */

    const notes = [
      'All statistics are calculated from recorded PIMS data.',
      'Patient registrations are counted by registration date.',
      'Consultations are counted by encounter start date.',
      'Encounter status counts reflect current status.',
      'Diagnoses are counted by record creation date.',
      'Laboratory orders and results use their respective event dates.',
      'Radiology orders and results use their respective event dates.',
      'Results recorded are not necessarily unique tests or patients.',
      'No patient-identifiable information is included.',
    ];

    if (overriddenFields.length > 0) {
      notes.push(
        'Report-only facility display overrides were supplied for: ' +
          overriddenFields.join(', ') +
          '. These values have not been verified against the registered facility record.',
      );
    }

    /* ========================================
       FINAL REPORT
    ======================================== */

    return {
      reportType: 'HEALTH_OFFICE_REPORT',

      facility: reportFacility,

      reportingPeriod: {
        period: query.period,
        label: range.label,
        startDate: range.startDate.toISOString(),
        endDateExclusive: range.endDate.toISOString(),
        timezone: facility.timezone,
        calendar: 'GREGORIAN',
      },

      generatedAt: new Date().toISOString(),

      indicators: {
        patientRegistration: {
          newPatients,
        },

        consultations: {
          totalEncounters,
          completedEncounters,
          inProgressEncounters,
          cancelledEncounters,
          uniquePatientsServed:
            uniquePatientGroups.length,
        },

        diagnoses: {
          recordedDiagnoses,
        },

        laboratory: {
          ordersPlaced: laboratoryOrders,
          resultsRecorded: laboratoryResults,
        },

        radiology: {
          ordersPlaced: radiologyOrders,
          resultsRecorded: radiologyResults,
        },
      },

      notes,
    };
  }
  async getAppointmentSummary(
    query: AppointmentSummaryQueryDto,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        facilityId: true,
      },
    });

    if (!user || user.status !== 'ACTIVE' || !user.facilityId) {
      throw new ForbiddenException(
        'An active user assigned to a facility is required',
      );
    }

    const facility = await this.prisma.facility.findUnique({
      where: { id: user.facilityId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        timezone: true,
      },
    });

    if (!facility || facility.status !== 'ACTIVE') {
      throw new ForbiddenException('An active facility is required');
    }

    if (facility.timezone !== 'Africa/Addis_Ababa') {
      throw new ForbiddenException(
        'Reporting currently supports Africa/Addis_Ababa timezone only',
      );
    }

    const parseLocalDate = (value: string): Date => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestException('Date must use YYYY-MM-DD format');
      }

      const [year, month, day] = value.split('-').map(Number);

      const check = new Date(Date.UTC(year, month - 1, day));

      if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day
      ) {
        throw new BadRequestException('Invalid reporting date');
      }

      return new Date(
        Date.UTC(year, month - 1, day, -3),
      );
    };

    const startDate = parseLocalDate(query.dateFrom);
    const endDate = parseLocalDate(query.dateTo);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'dateTo must be on or after dateFrom',
      );
    }

    const endDateExclusive = new Date(
      endDate.getTime() + 24 * 60 * 60 * 1000,
    );

    const where = {
      facilityId: facility.id,
      scheduledStart: {
        gte: startDate,
        lt: endDateExclusive,
      },
    };

    const grouped = await this.prisma.appointment.groupBy({
      by: ['status'],
      where,
      _count: {
        _all: true,
      },
    });

    const summary = {
      total: 0,
      scheduled: 0,
      confirmed: 0,
      checkedIn: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };

    for (const item of grouped) {
      const count = item._count._all;
      summary.total += count;

      switch (item.status) {
        case 'SCHEDULED':
          summary.scheduled = count;
          break;
        case 'CONFIRMED':
          summary.confirmed = count;
          break;
        case 'CHECKED_IN':
          summary.checkedIn = count;
          break;
        case 'COMPLETED':
          summary.completed = count;
          break;
        case 'CANCELLED':
          summary.cancelled = count;
          break;
        case 'NO_SHOW':
          summary.noShow = count;
          break;
      }
    }

    return {
      reportType: 'APPOINTMENT_SUMMARY',
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
      },
      period: {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        timezone: facility.timezone,
      },
      generatedAt: new Date().toISOString(),
      summary,
    };
  }
}
