import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateRadiologyResultDto } from './dto/create-radiology-result.dto.js';
import { RadiologyService } from './radiology.service.js';

describe('Radiology FINAL-only reporting', () => {
  let service: RadiologyService;
  let prisma: any;

  const context = {
    userId: 'user-1',
    facilityId: 'facility-1',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          facilityId: 'facility-1',
          status: 'ACTIVE',
        }),
      },
      facility: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'facility-1',
          status: 'ACTIVE',
        }),
      },
      radiologyOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          patientId: 'patient-1',
          result: null,
        }),
      },
      $transaction: vi.fn(),
    };

    service = new RadiologyService(
      prisma,
      { log: vi.fn() } as any,
    );
  });

  it('accepts FINAL in DTO validation', async () => {
    const dto = new CreateRadiologyResultDto();
    dto.status = 'FINAL';
    dto.findings = 'Test findings';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts an omitted status in DTO validation', async () => {
    const dto = new CreateRadiologyResultDto();
    dto.findings = 'Test findings';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects PRELIMINARY in DTO validation', async () => {
    const dto = new CreateRadiologyResultDto();

    Object.assign(dto, {
      status: 'PRELIMINARY',
      findings: 'Test findings',
    });

    const errors = await validate(dto);

    expect(errors.some(
      (error) => error.property === 'status',
    )).toBe(true);
  });

  it('rejects arbitrary statuses in DTO validation', async () => {
    const dto = new CreateRadiologyResultDto();

    Object.assign(dto, {
      status: 'INVALID_STATUS',
      impression: 'Test impression',
    });

    const errors = await validate(dto);

    expect(errors.some(
      (error) => error.property === 'status',
    )).toBe(true);
  });

  it('rejects PRELIMINARY at the service layer', async () => {
    await expect(
      service.createResult(
        'order-1',
        {
          findings: 'Test findings',
          status: 'PRELIMINARY',
        } as any,
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.radiologyOrder.findUnique)
      .not.toHaveBeenCalled();

    expect(prisma.$transaction)
      .not.toHaveBeenCalled();
  });

  it('rejects arbitrary status at the service layer', async () => {
    await expect(
      service.createResult(
        'order-1',
        {
          impression: 'Test impression',
          status: 'DRAFT',
        } as any,
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction)
      .not.toHaveBeenCalled();
  });
});