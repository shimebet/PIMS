
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

import type { JwtUser } from '../../../common/types/jwt-user.type.js';

import { PatientsImportService } from './patients-import.service.js';

type CsvUpload = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Controller('patients/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsImportController {
  constructor(
    private readonly importService: PatientsImportService,
  ) {}

  private validateFile(
    file?: CsvUpload,
  ): Buffer {
    if (!file) {
      throw new BadRequestException(
        'Please select a CSV file.',
      );
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException(
        'Only CSV files are supported.',
      );
    }

    if (!file.buffer || !file.buffer.length) {
      throw new BadRequestException(
        'The uploaded CSV file is empty.',
      );
    }

    return file.buffer;
  }

  private getRequestContext(
    request: Request,
    user: JwtUser,
  ) {
    return {
      userId: user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestId:
        typeof request.headers['x-request-id'] === 'string'
          ? request.headers['x-request-id']
          : undefined,
    };
  }

  @Get('template')
  @RequirePermissions('patient.create')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="pims-patient-import-template.csv"',
  )
  downloadTemplate(
    @Res() response: Response,
  ) {
    const csv = this.importService.getTemplate();

    return response.send('\uFEFF' + csv);
  }

  @Post('preview')
  @RequirePermissions('patient.create')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async preview(
    @UploadedFile() file?: CsvUpload,
  ) {
    const buffer = this.validateFile(file);

    return this.importService.preview(buffer);
  }

  @Post()
  @RequirePermissions('patient.create')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async importPatients(
    @UploadedFile() file: CsvUpload,
    @Req() request: Request,
    @CurrentUser() user: JwtUser,
  ) {
    const buffer = this.validateFile(file);

    return this.importService.import(
      buffer,
      this.getRequestContext(request, user),
    );
  }
}
