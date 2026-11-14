import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RadiologyService } from './radiology.service.js';

describe('Radiology duplicate-result error handling', () => {
  let service: RadiologyService;
  let prisma: any;
  let audit: any;

  const context = {
    userId: 'user-1',
    facilityId: 'facility-1',
  };

  const dto = {
    findings: 'Test findings',
    impression: 'Test impression',
    status: 'FINAL' as const,
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

    audit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new RadiologyService(prisma, audit);
  });

  it('converts duplicate-result P2002 into BadRequest', async () => {
    prisma.$transaction.mockRejectedValue({
      code: 'P2002',
      meta: {
        target: ['radiologyOrderId'],
      },
    });

    await expect(
      service.createResult('order-1', dto, context),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('preserves unrelated P2002 errors', async () => {
    const error = {
      code: 'P2002',
      meta: {
        target: ['anotherField'],
      },
    };

    prisma.$transaction.mockRejectedValue(error);

    await expect(
      service.createResult('order-1', dto, context),
    ).rejects.toBe(error);
  });

  it('preserves unrelated database errors', async () => {
    const error = new Error('Database connection failed');

    prisma.$transaction.mockRejectedValue(error);

    await expect(
      service.createResult('order-1', dto, context),
    ).rejects.toBe(error);
  });
});