
import { BadRequestException } from '@nestjs/common';

import {
  HealthReportPeriod,
  HealthReportQueryDto,
} from '../dto/health-report-query.dto.js';

export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

const ETHIOPIA_UTC_OFFSET_HOURS = 3;

function ethiopiaMidnight(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      -ETHIOPIA_UTC_OFFSET_HOURS,
    ),
  );
}

function requiredNumber(
  value: number | undefined,
  field: string,
  min: number,
  max: number,
): number {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new BadRequestException(
      `${field} must be an integer between ${min} and ${max}`,
    );
  }

  return value;
}

function getIsoWeekStart(
  year: number,
  week: number,
): Date {
  const januaryFourth = new Date(
    Date.UTC(year, 0, 4),
  );

  const weekday = januaryFourth.getUTCDay() || 7;

  const monday = new Date(januaryFourth);

  monday.setUTCDate(
    monday.getUTCDate() - weekday + 1 + (week - 1) * 7,
  );

  return monday;
}

function getIsoWeekYear(date: Date): number {
  const thursday = new Date(date);
  const weekday = thursday.getUTCDay() || 7;

  thursday.setUTCDate(
    thursday.getUTCDate() + 4 - weekday,
  );

  return thursday.getUTCFullYear();
}

function getIsoWeekNumber(date: Date): number {
  const thursday = new Date(date);
  const weekday = thursday.getUTCDay() || 7;

  thursday.setUTCDate(
    thursday.getUTCDate() + 4 - weekday,
  );

  const yearStart = new Date(
    Date.UTC(thursday.getUTCFullYear(), 0, 1),
  );

  return Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) /
      86400000 +
      1) /
      7,
  );
}

export function getReportDateRange(
  query: HealthReportQueryDto,
): ReportDateRange {
  const year = requiredNumber(
    query.year,
    'year',
    2000,
    2100,
  );

  switch (query.period) {
    case HealthReportPeriod.DAILY: {
      if (
        !query.date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ) {
        throw new BadRequestException(
          'Daily reports require date in YYYY-MM-DD format',
        );
      }

      const [y, m, d] = query.date
        .split('-')
        .map(Number);

      const parsed = new Date(
        Date.UTC(y, m - 1, d),
      );

      if (
        parsed.getUTCFullYear() !== y ||
        parsed.getUTCMonth() !== m - 1 ||
        parsed.getUTCDate() !== d ||
        y !== year
      ) {
        throw new BadRequestException(
          'Invalid daily report date or year mismatch',
        );
      }

      return {
        startDate: ethiopiaMidnight(y, m, d),
        endDate: ethiopiaMidnight(y, m, d + 1),
        label: query.date,
      };
    }

    case HealthReportPeriod.WEEKLY: {
      const week = requiredNumber(
        query.week,
        'week',
        1,
        53,
      );

      const monday = getIsoWeekStart(year, week);

      if (
        getIsoWeekYear(monday) !== year ||
        getIsoWeekNumber(monday) !== week
      ) {
        throw new BadRequestException(
          'Invalid ISO week for the selected year',
        );
      }

      const followingMonday = new Date(monday);

      followingMonday.setUTCDate(
        followingMonday.getUTCDate() + 7,
      );

      return {
        startDate: ethiopiaMidnight(
          monday.getUTCFullYear(),
          monday.getUTCMonth() + 1,
          monday.getUTCDate(),
        ),
        endDate: ethiopiaMidnight(
          followingMonday.getUTCFullYear(),
          followingMonday.getUTCMonth() + 1,
          followingMonday.getUTCDate(),
        ),
        label: `Week ${week}, ${year}`,
      };
    }

    case HealthReportPeriod.MONTHLY: {
      const month = requiredNumber(
        query.month,
        'month',
        1,
        12,
      );

      return {
        startDate: ethiopiaMidnight(year, month, 1),
        endDate: ethiopiaMidnight(year, month + 1, 1),
        label: `${year}-${String(month).padStart(2, '0')}`,
      };
    }

    case HealthReportPeriod.QUARTERLY: {
      const quarter = requiredNumber(
        query.quarter,
        'quarter',
        1,
        4,
      );

      const startMonth = (quarter - 1) * 3 + 1;

      return {
        startDate: ethiopiaMidnight(
          year,
          startMonth,
          1,
        ),
        endDate: ethiopiaMidnight(
          year,
          startMonth + 3,
          1,
        ),
        label: `Q${quarter} ${year}`,
      };
    }

    case HealthReportPeriod.HALF_YEARLY: {
      const halfYear = requiredNumber(
        query.halfYear,
        'halfYear',
        1,
        2,
      );

      const startMonth = halfYear === 1 ? 1 : 7;

      return {
        startDate: ethiopiaMidnight(
          year,
          startMonth,
          1,
        ),
        endDate: ethiopiaMidnight(
          year,
          startMonth + 6,
          1,
        ),
        label: `H${halfYear} ${year}`,
      };
    }

    case HealthReportPeriod.YEARLY:
      return {
        startDate: ethiopiaMidnight(year, 1, 1),
        endDate: ethiopiaMidnight(year + 1, 1, 1),
        label: `Year ${year}`,
      };

    default:
      throw new BadRequestException(
        'Unsupported reporting period',
      );
  }
}
