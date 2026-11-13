import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncountersService } from './encounters.service.js';

describe('Encounter closing facility security', () => {
  const facilityId = 'facility-1';
  const encounterId = 'encounter-1';

  const context = {
    userId: 'user-1',
    facilityId,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    requestId: 'request-1',
  };

  const encounter = {
    id: encounterId,
    facilityId,
    patientId: 'patient-1',
    status: 'IN_PROGRESS',
  };

  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    facility: {
      findUnique: vi.fn(),
    },
    encounter: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  const audit = {
    log: vi.fn(),
  };

  let service: EncountersService;

  beforeEach(() => {
    vi.resetAllMocks();

    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'ACTIVE',
    });

    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'ACTIVE',
    });

    prisma.encounter.findFirst.mockResolvedValue(encounter);

    prisma.encounter.update.mockResolvedValue({
      ...encounter,
      status: 'COMPLETED',
    });

    prisma.$queryRaw.mockResolvedValue([
      { id: encounterId },
    ]);

    prisma.$transaction.mockImplementation(
      async (callback) => callback(prisma),
    );

    audit.log.mockResolvedValue(undefined);

    service = new EncountersService(
      prisma as any,
      audit as any,
    );
  });

  it('closes an encounter in the authorized facility', async () => {
    const result = await service.close(
      encounterId,
      {},
      context,
    );

    expect(result.status).toBe('COMPLETED');

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: encounterId,
        facilityId,
      },
    });

    expect(prisma.encounter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: encounterId,
          facilityId,
        },
        data: expect.objectContaining({
          status: 'COMPLETED',
          endedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('returns not found when the scoped encounter lookup fails', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.close(encounterId, {}, context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.encounter.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects missing facility assignment before encounter access', async () => {
    await expect(
      service.close(encounterId, {}, {
        ...context,
        facilityId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.close(encounterId, {}, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it('rejects an inactive facility', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.close(encounterId, {}, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it('rejects a JWT and database facility mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-2',
      status: 'ACTIVE',
    });

    await expect(
      service.close(encounterId, {}, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it('rejects closing an already completed encounter', async () => {
    prisma.encounter.findFirst.mockResolvedValue({
      ...encounter,
      status: 'COMPLETED',
    });

    await expect(
      service.close(encounterId, {}, context),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it('records an audit event after successful closing', async () => {
    await service.close(encounterId, {}, context);

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: context.userId,
        action: 'ENCOUNTER_CLOSE',
        resourceId: encounterId,
        patientId: encounter.patientId,
      }),
    );
  });

  it('does not audit a failed encounter update', async () => {
    prisma.encounter.update.mockRejectedValue(
      new Error('Database update failed'),
    );

    await expect(
      service.close(encounterId, {}, context),
    ).rejects.toThrow('Database update failed');

    expect(audit.log).not.toHaveBeenCalled();
  });
});
