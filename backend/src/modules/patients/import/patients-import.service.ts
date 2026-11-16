
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { parse } from 'csv-parse/sync';
import {
  validate,
  type ValidationError,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { GeographicReferenceService } from '../../geographic-reference/geographic-reference.service.js';
import { PatientsService } from '../patients.service.js';
import { CreatePatientDto } from '../dto/create-patient.dto.js';

import type {
  PatientRequestContext,
} from '../patient-request-context.type.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 500;

const DEFAULT_FACILITY_ID =
  '3d0d001f-0aab-4cce-af5f-0090ad270ca7';

export const PATIENT_CSV_HEADERS = [
  'firstName',
  'middleName',
  'lastName',
  'dateOfBirth',
  'birthDateEstimated',
  'gender',
  'bloodGroup',
  'maritalStatus',
  'nationality',
  'preferredLanguage',
  'occupation',
  'identifierType',
  'identifierValue',
  'issuingAuthority',
  'identifierCountry',
  'phone',
  'email',
  'country',
  'region',
  'zone',
  'district',
  'city',
  'subCity',
  'kebele',
  'street',
  'houseNumber',
] as const;

type CsvHeader = (typeof PATIENT_CSV_HEADERS)[number];
type CsvRow = Record<CsvHeader, string>;



export interface ImportRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors: string[];
  warnings?: string[];
  patient: CreatePatientDto | null;
}


export interface PreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: ImportRow[];
}


function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function parseBoolean(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value)
    ? `'${value}`
    : value;

  return `"${safe.replace(/"/g, '""')}"`;
}

function collectValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(
        error.constraints,
      )) {
        messages.push(`${path}: ${message}`);
      }
    }

    if (error.children?.length) {
      messages.push(
        ...collectValidationErrors(
          error.children,
          path,
        ),
      );
    }
  }

  return messages;
}

@Injectable()
export class PatientsImportService {

constructor(
  private readonly patientsService: PatientsService,
  private readonly prisma: PrismaService,
  private readonly geographicReferenceService:
    GeographicReferenceService,
) {}


 
getTemplate(): string {
  const example = [
    'Hana',
    'Tesfaye',
    'Bekele',
    '1998-05-15',
    'false',
    'FEMALE',
    'O+',
    'SINGLE',
    'Ethiopian',
    'Afaan Oromoo',
    'Teacher',
    'NATIONAL_ID',
    'TEST-PIMS-001',
    '',
    'Ethiopia',
    '0912345678',
    '',
    'Ethiopia',
    'Oromia',
    'Arsi',
    'Tiyo',
    'Asella',
    '',
    '01',
    '',
    '',
  ];

  return [
    PATIENT_CSV_HEADERS.join(','),
    example.map(csvCell).join(','),
  ].join('\r\n');
}


  private readCsv(buffer: Buffer): CsvRow[] {
    if (!buffer.length) {
      throw new BadRequestException(
        'The CSV file is empty.',
      );
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'CSV file exceeds the 2 MB limit.',
      );
    }

    // Validate CSV headers before parsing patient records.
    let actualHeaders: string[];

    try {
      const headerRecords = parse(
        buffer.toString('utf8'),
        {
          bom: true,
          to_line: 1,
          skip_empty_lines: true,
          trim: true,
        },
      ) as string[][];

      actualHeaders = headerRecords[0] ?? [];
    } catch {
      throw new BadRequestException(
        'Unable to read CSV headers. Check the file format.',
      );
    }

    const missingHeaders = PATIENT_CSV_HEADERS.filter(
      (header) => !actualHeaders.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing CSV columns: ${missingHeaders.join(', ')}`,
      );
    }

    const duplicateHeaders = actualHeaders.filter(
      (header, index) =>
        actualHeaders.indexOf(header) !== index,
    );

    if (duplicateHeaders.length > 0) {
      throw new BadRequestException(
        `Duplicate CSV columns: ${[
          ...new Set(duplicateHeaders),
        ].join(', ')}`,
      );
    }

    let records: Record<string, string>[];

    try {
      records = parse(
        buffer.toString('utf8'),
        {
          columns: true,
          bom: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: false,
          skip_records_with_error: false,
        },
      ) as Record<string, string>[];
    } catch {
      throw new BadRequestException(
        'Invalid CSV format. Check the headers, quotes, and column counts.',
      );
    }

    if (!records.length) {
      throw new BadRequestException(
        'The CSV contains no patient records.',
      );
    }

    if (records.length > MAX_ROWS) {
      throw new BadRequestException(
        `Maximum ${MAX_ROWS} patients are allowed per file.`,
      );
    }

    return records.map((record) => {
      const row = {} as CsvRow;

      for (const header of PATIENT_CSV_HEADERS) {
        row[header] = normalize(record[header]);
      }

      return row;
    });
  }

  private buildPatient(row: CsvRow): CreatePatientDto {
    const patient = new CreatePatientDto();

    patient.firstName = row.firstName;
    patient.lastName = row.lastName;

    patient.middleName = optional(row.middleName);

    patient.registrationFacilityId =
      DEFAULT_FACILITY_ID;

    if (row.dateOfBirth) {
      patient.dateOfBirth =
        `${row.dateOfBirth}T00:00:00.000Z`;
    }

    patient.birthDateEstimated =
      parseBoolean(row.birthDateEstimated);

    patient.gender = optional(row.gender);
    patient.bloodGroup = optional(row.bloodGroup);
    patient.maritalStatus = optional(row.maritalStatus);
    patient.nationality = optional(row.nationality);
    patient.preferredLanguage =
      optional(row.preferredLanguage);
    patient.occupation = optional(row.occupation);

    if (row.identifierType && row.identifierValue) {
      patient.identifiers = [{
        identifierType: row.identifierType,
        identifierValue: row.identifierValue,
        issuingAuthority:
          optional(row.issuingAuthority),
        country: optional(row.identifierCountry),
        isPrimary: true,
      }];
    }

    const contacts: NonNullable<
      CreatePatientDto['contacts']
    > = [];

    if (row.phone) {
      contacts.push({
        contactType: 'PHONE',
        contactValue: row.phone,
        isPrimary: true,
      });
    }

    if (row.email) {
      contacts.push({
        contactType: 'EMAIL',
        contactValue: row.email,
        isPrimary: !row.phone,
      });
    }

    if (contacts.length) {
      patient.contacts = contacts;
    }

    const hasAddress = [
      row.region,
      row.zone,
      row.district,
      row.city,
      row.subCity,
      row.kebele,
      row.street,
      row.houseNumber,
    ].some(Boolean);

    if (hasAddress) {
      patient.addresses = [{
        country: optional(row.country),
        region: optional(row.region),
        zone: optional(row.zone),
        district: optional(row.district),
        city: optional(row.city),
        subCity: optional(row.subCity),
        kebele: optional(row.kebele),
        street: optional(row.street),
        houseNumber: optional(row.houseNumber),
        isPrimary: true,
      }];
    }

    return patient;
  }

  
private getGeographicWarnings(row: CsvRow): string[] {
  const warnings: string[] = [];

  const region = row.region.trim();
  const zone = row.zone.trim();
  const woreda = row.district.trim();

  if (zone && !region) {
    warnings.push(
      'Zone is provided without a region.',
    );
  }

  if (woreda && !zone) {
    warnings.push(
      'Woreda is provided without a zone.',
    );
  }

  if (
    region.toLowerCase() === 'oromia' &&
    zone &&
    !this.geographicReferenceService.isKnownZone(
      'Oromia',
      zone,
    )
  ) {
    warnings.push(
      'Zone is not in the currently configured Oromia reference list. Verify the location.',
    );
  }

  return warnings;
}


  private async validateRow(
    row: CsvRow,
    rowNumber: number,
  ): Promise<ImportRow> {
    const errors: string[] = [];

    if (!row.firstName) {
      errors.push('First name is required.');
    }

    if (!row.lastName) {
      errors.push('Last name is required.');
    }

    if (
      row.dateOfBirth &&
      !isValidDate(row.dateOfBirth)
    ) {
      errors.push(
        'Date of birth must be a valid YYYY-MM-DD date.',
      );
    }

    if (
      row.birthDateEstimated &&
      !['true', 'false'].includes(
        row.birthDateEstimated.toLowerCase(),
      )
    ) {
      errors.push(
        'birthDateEstimated must be true or false.',
      );
    }

    if (
      Boolean(row.identifierType) !==
      Boolean(row.identifierValue)
    ) {
      errors.push(
        'Identifier type and identifier value must both be provided.',
      );
    }

    if (
      row.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
    ) {
      errors.push('Invalid email address.');
    }

    const patient = this.buildPatient(row);

    const dto = plainToInstance(
      CreatePatientDto,
      patient,
    );

    const validationErrors = await validate(dto);

    errors.push(
      ...collectValidationErrors(validationErrors),
    );

    if (errors.length) {
      return {
        rowNumber,
        status: 'INVALID',
        errors,
        patient: null,
      };
    }

    const duplicate =
      await this.patientsService.checkDuplicate({
        firstName: patient.firstName,
        middleName: patient.middleName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        phone: patient.contacts?.find(
          (contact) =>
            contact.contactType === 'PHONE',
        )?.contactValue,
      });

    if (duplicate.possibleDuplicates.length > 0) {
      return {
        rowNumber,
        status: 'DUPLICATE',
        errors: [
          'Possible existing patient found.',
        ],
        patient,
      };
    }

    return {
      rowNumber,
      status: 'VALID',
      errors: [],
      patient,
    };
  }

  async preview(buffer: Buffer): Promise<PreviewResult> {
    const rows = this.readCsv(buffer);

    const results: ImportRow[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const result = await this.validateRow(
        row,
        index + 2,
      );

      result.warnings =
        this.getGeographicWarnings(row);

      const nameKey = [
        row.firstName.toLowerCase(),
        row.middleName.toLowerCase(),
        row.lastName.toLowerCase(),
        row.dateOfBirth,
      ].join('|');

      const phoneKey = row.phone
        ? `phone:${row.phone}`
        : null;

      if (result.status === 'VALID') {
        if (
          seen.has(nameKey) ||
          (phoneKey && seen.has(phoneKey))
        ) {
          result.status = 'DUPLICATE';
          result.errors.push(
            'Duplicate patient row within the CSV file.',
          );
        }
      }

      if (result.status === 'VALID') {
        seen.add(nameKey);

        if (phoneKey) {
          seen.add(phoneKey);
        }
      }

      results.push(result);
    }

    return {
      totalRows: results.length,
      validRows: results.filter(
        (row) => row.status === 'VALID',
      ).length,
      invalidRows: results.filter(
        (row) => row.status === 'INVALID',
      ).length,
      duplicateRows: results.filter(
        (row) => row.status === 'DUPLICATE',
      ).length,
      rows: results,
    };
  }

  async import(
    buffer: Buffer,
    context: PatientRequestContext,
  ) {
    const preview = await this.preview(buffer);

    const imported: {
      rowNumber: number;
      patientId: string;
      patientNumber: string;
    }[] = [];

    const failed: {
      rowNumber: number;
      reason: string;
    }[] = [];

    for (const row of preview.rows) {
      if (row.status !== 'VALID' || !row.patient) {
        failed.push({
          rowNumber: row.rowNumber,
          reason: row.errors.join('; '),
        });

        continue;
      }

      try {
        const patient = await this.patientsService.create(
          row.patient,
          context,
        );

        imported.push({
          rowNumber: row.rowNumber,
          patientId: patient.id,
          patientNumber: patient.patientNumber,
        });
      } catch (error) {
        failed.push({
          rowNumber: row.rowNumber,
          reason:
            error instanceof Error
              ? error.message
              : 'Patient registration failed.',
        });
      }
    }

    return {
      totalRows: preview.totalRows,
      importedCount: imported.length,
      skippedCount: failed.length,
      imported,
      failed,
    };
  }
}
