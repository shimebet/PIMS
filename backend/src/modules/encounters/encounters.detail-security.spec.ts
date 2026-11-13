import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EncountersService } from './encounters.service.js';

describe('Encounter detail facility security', () => {
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
    patient: { id: 'patient-1' },
    facility: { id: facilityId },
    practitioner: null,
    observations: [],
    diagnoses: [],
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
    },
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
    audit.log.mockResolvedValue(undefined);

    service = new EncountersService(
      prisma as any,
      audit as any,
    );
  });

  it('returns an encounter from the authorized facility', async () => {
    const result = await service.findOne(encounterId, context);

    expect(result).toEqual(encounter);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: encounterId,
          facilityId,
        },
      }),
    );
  });

  it('preserves related clinical data in the scoped query', async () => {
    await service.findOne(encounterId, context);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          patient: true,
          facility: true,
          practitioner: true,
          observations: expect.any(Object),
          diagnoses: expect.any(Object),
        }),
      }),
    );
  });

  it('returns not found when the scoped query finds no encounter', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(encounterId, context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: encounterId,
          facilityId,
        },
      }),
    );

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects missing facility assignment before reading encounter data', async () => {
    await expect(
      service.findOne(encounterId, {
        ...context,
        facilityId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects an inactive user before reading encounter data', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.findOne(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects an inactive facility before reading encounter data', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.findOne(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a JWT and database facility mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-2',
      status: 'ACTIVE',
    });

    await expect(
      service.findOne(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing database user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('records an audit event after an authorized read', async () => {
    await service.findOne(encounterId, context);

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: context.userId,
        action: 'ENCOUNTER_READ',
        resourceId: encounterId,
        patientId: encounter.patientId,
      }),
    );
  });
});
