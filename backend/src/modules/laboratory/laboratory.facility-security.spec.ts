import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LaboratoryService } from './laboratory.service.js';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';

describe('Laboratory facility authorization', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    encounter: {
      findFirst: vi.fn(),
    },
    labOrder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    labOrderItem: {
      findFirst: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
    },
  };

  const audit = {
    log: vi.fn(),
  };

  let service: LaboratoryService;

  const context = {
    userId: 'user-1',
    facilityId: 'facility-1',
    ipAddress: '127.0.0.1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new LaboratoryService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );

    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-1',
      status: 'ACTIVE',
    });
  });

  it('rejects users without a facility assignment', async () => {
    await expect(
      service.findOne('order-1', {
        ...context,
        facilityId: null,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.labOrder.findFirst).not.toHaveBeenCalled();
  });

  it('rejects users whose database facility differs from their token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-2',
      status: 'ACTIVE',
    });

    await expect(
      service.findOne('order-1', context),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.labOrder.findFirst).not.toHaveBeenCalled();
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-1',
      status: 'INACTIVE',
    });

    await expect(
      service.findOne('order-1', context),
    ).rejects.toThrow(ForbiddenException);
  });

  it('restricts laboratory order details to the user facility', async () => {
    prisma.labOrder.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('order-2', context),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.labOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'order-2',
          encounter: {
            facilityId: 'facility-1',
          },
        },
      }),
    );
  });

  it('filters patient laboratory history by facility', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      id: 'patient-1',
    });

    prisma.labOrder.findMany.mockResolvedValue([]);

    await service.findByPatient('patient-1', context);

    expect(prisma.labOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 'patient-1',
          encounter: {
            facilityId: 'facility-1',
          },
        },
      }),
    );
  });

  it('prevents result entry for an order outside the facility', async () => {
    prisma.labOrderItem.findFirst.mockResolvedValue(null);

    await expect(
      service.createResult(
        'order-2',
        'item-1',
        { valueText: 'Negative' },
        context,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.labOrderItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'item-1',
          labOrderId: 'order-2',
          labOrder: {
            encounter: {
              facilityId: 'facility-1',
            },
          },
        },
      }),
    );
  });

  it('restricts order creation to an encounter in the user facility', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.createOrder(
        'encounter-2',
        {
          items: [{ testName: 'Complete Blood Count' }],
        },
        context,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'encounter-2',
        facilityId: 'facility-1',
      },
    });
  });
});