import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LaboratoryService } from './laboratory.service.js';
import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';

describe('Laboratory result workflow', () => {
  const tx = {
    $queryRaw: vi.fn(),
    auditLog: {
      create: vi.fn(),
    },
    labResult: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    labOrderItem: {
      update: vi.fn(),
      count: vi.fn(),
    },
    labOrder: {
      update: vi.fn(),
    },
  };

  const prisma = {
    user: { findUnique: vi.fn() },
    labOrderItem: { findFirst: vi.fn() },
    $transaction: vi.fn(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    ),
  };

  const audit = { log: vi.fn() };

  const context = {
    userId: 'user-1',
    facilityId: 'facility-1',
  };

  const preliminaryResult = {
    id: 'result-1',
    status: 'PRELIMINARY',
    verifiedAt: null,
    verifiedByUserId: null,
  };

  const verifiedResult = {
    id: 'result-1',
    status: 'FINAL',
    verifiedAt: new Date(),
    verifiedByUserId: 'user-1',
  };

  const item = {
    id: 'item-1',
    testName: 'Complete Blood Count',
    labOrderId: 'order-1',
    labOrder: { patientId: 'patient-1' },
    result: preliminaryResult,
  };

  let service: LaboratoryService;

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

    prisma.labOrderItem.findFirst.mockResolvedValue(item);
    tx.$queryRaw.mockResolvedValue([{ id: 'order-1' }]);
    tx.labResult.create.mockResolvedValue(preliminaryResult);
    tx.labResult.updateMany.mockResolvedValue({ count: 1 });
    tx.labResult.findUniqueOrThrow.mockResolvedValue(verifiedResult);
    tx.labOrderItem.update.mockResolvedValue({});
    tx.labOrderItem.count.mockResolvedValue(0);
    tx.labOrder.update.mockResolvedValue({});
    audit.log.mockResolvedValue(undefined);
  });

  it('creates a preliminary unverified result', async () => {
    prisma.labOrderItem.findFirst.mockResolvedValue({
      ...item,
      result: null,
    });

    await service.createResult(
      'order-1',
      'item-1',
      { valueText: 'Normal' },
      context,
    );

    expect(tx.labResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'PRELIMINARY',
        verifiedByUserId: null,
        verifiedAt: null,
      }),
    });

    expect(tx.labOrderItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { status: 'IN_PROGRESS' },
    });
  });

  it('rejects FINAL status during result entry', async () => {
    await expect(
      service.createResult(
        'order-1',
        'item-1',
        { valueText: 'Normal', status: 'FINAL' },
        context,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tx.labResult.create).not.toHaveBeenCalled();
  });

  it('verifies a preliminary result', async () => {
    const result = await service.verifyResult(
      'order-1',
      'item-1',
      context,
    );

    expect(result.status).toBe('FINAL');

    expect(tx.labResult.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'result-1',
        status: 'PRELIMINARY',
        verifiedAt: null,
        verifiedByUserId: null,
      },
      data: expect.objectContaining({
        status: 'FINAL',
        verifiedByUserId: 'user-1',
        verifiedAt: expect.any(Date),
      }),
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LAB_RESULT_VERIFY',
        resourceId: 'result-1',
        userId: 'user-1',
      }),
    });

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects verification when audit insertion fails', async () => {
    tx.auditLog.create.mockRejectedValueOnce(
      new Error('Simulated audit database failure'),
    );

    await expect(
      service.verifyResult('order-1', 'item-1', context),
    ).rejects.toThrow('Simulated audit database failure');

    expect(tx.labResult.updateMany).toHaveBeenCalledTimes(1);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LAB_RESULT_VERIFY',
        resourceId: 'result-1',
      }),
    });

    expect(audit.log).not.toHaveBeenCalled();
  });
  it('does not verify when the parent order lock finds no order', async () => {
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      service.verifyResult('order-1', 'item-1', context),
    ).rejects.toThrow(NotFoundException);

    expect(tx.labResult.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('rejects an already verified result', async () => {
    prisma.labOrderItem.findFirst.mockResolvedValue({
      ...item,
      result: verifiedResult,
    });

    await expect(
      service.verifyResult('order-1', 'item-1', context),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a competing verification update', async () => {
    tx.labResult.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.verifyResult('order-1', 'item-1', context),
    ).rejects.toThrow(BadRequestException);

    expect(tx.labOrderItem.update).not.toHaveBeenCalled();
  });

  it('requires an assigned facility', async () => {
    await expect(
      service.verifyResult('order-1', 'item-1', {
        ...context,
        facilityId: null,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an item outside the facility', async () => {
    prisma.labOrderItem.findFirst.mockResolvedValue(null);

    await expect(
      service.verifyResult('order-2', 'item-1', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('completes an order when no items remain', async () => {
    tx.labOrderItem.count.mockResolvedValue(0);

    await service.verifyResult('order-1', 'item-1', context);

    expect(tx.labOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'COMPLETED' },
    });
  });

  it('keeps an order in progress when items remain', async () => {
    tx.labOrderItem.count.mockResolvedValue(2);

    await service.verifyResult('order-1', 'item-1', context);

    expect(tx.labOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'IN_PROGRESS' },
    });
  });
});