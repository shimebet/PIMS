import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncountersService } from './encounters.service.js';

describe('Encounter vitals facility security', () => {
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
    },
    observation: {
      create: vi.fn(),
      findMany: vi.fn(),
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

    prisma.observation.create.mockResolvedValue({
      id: 'observation-1',
      encounterId,
    });

    prisma.observation.findMany.mockResolvedValue([]);

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

  it('creates vital signs for an authorized encounter', async () => {
    const result = await service.createVitals(
      encounterId,
      { pulseRate: 80 },
      context,
    );

    expect(result).toHaveLength(1);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: encounterId,
        facilityId,
      },
    });

    expect(prisma.observation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: encounter.patientId,
          encounterId,
          recordedByUserId: context.userId,
          category: 'VITAL_SIGNS',
          code: '8867-4',
          valueNumeric: 80,
        }),
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('retrieves vitals only after a facility-scoped encounter lookup', async () => {
    await service.findVitals(encounterId, context);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: encounterId,
        facilityId,
      },
    });

    expect(prisma.observation.findMany).toHaveBeenCalledWith({
      where: {
        encounterId,
        category: 'VITAL_SIGNS',
      },
      orderBy: {
        observedAt: 'desc',
      },
    });
  });

  it('rejects cross-facility vitals creation', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.observation.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects cross-facility vitals retrieval', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.findVitals(encounterId, context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.observation.findMany).not.toHaveBeenCalled();
  });

  it('rejects missing facility assignment for both endpoints', async () => {
    const invalidContext = {
      ...context,
      facilityId: null,
    };

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        invalidContext,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findVitals(encounterId, invalidContext),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(prisma.observation.create).not.toHaveBeenCalled();
    expect(prisma.observation.findMany).not.toHaveBeenCalled();
  });

  it('rejects inactive users for both endpoints', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findVitals(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects inactive facilities for both endpoints', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findVitals(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a JWT/database facility mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-2',
      status: 'ACTIVE',
    });

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findVitals(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects recording vitals for a closed encounter', async () => {
    prisma.encounter.findFirst.mockResolvedValue({
      ...encounter,
      status: 'COMPLETED',
    });

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.observation.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires at least one vital sign', async () => {
    await expect(
      service.createVitals(encounterId, {}, context),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.observation.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records an audit event after creating vitals', async () => {
    await service.createVitals(
      encounterId,
      { pulseRate: 80 },
      context,
    );

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: context.userId,
        eventType: 'DATA_CREATE',
        action: 'VITAL_SIGNS_CREATE',
        resourceId: encounterId,
        patientId: encounter.patientId,
      }),
    );
  });

  it('does not audit a failed observation transaction', async () => {
    prisma.$transaction.mockRejectedValue(
      new Error('Observation transaction failed'),
    );

    await expect(
      service.createVitals(
        encounterId,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toThrow('Observation transaction failed');

    expect(audit.log).not.toHaveBeenCalled();
  });
});
