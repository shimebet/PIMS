import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncountersService } from './encounters.service.js';

describe('Encounter transaction security', () => {
  const context = {
    userId: 'user-1',
    facilityId: 'facility-1',
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    requestId: 'request-1',
  };

  const encounter = {
    id: 'encounter-1',
    facilityId: 'facility-1',
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
    observation: {
      create: vi.fn(),
    },
    diagnosis: {
      create: vi.fn(),
    },
    practitioner: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  const audit = {
    log: vi.fn(),
  };

  let service: EncountersService;
  let events: string[];

  beforeEach(() => {
    vi.resetAllMocks();
    events = [];

    prisma.user.findUnique.mockResolvedValue({
      facilityId: context.facilityId,
      status: 'ACTIVE',
    });

    prisma.facility.findUnique.mockResolvedValue({
      id: context.facilityId,
      status: 'ACTIVE',
    });

    prisma.encounter.findFirst.mockResolvedValue(encounter);

    prisma.encounter.update.mockImplementation(async () => {
      events.push('close-write');
      return { ...encounter, status: 'COMPLETED' };
    });

    prisma.observation.create.mockImplementation(async () => {
      events.push('vitals-write');
      return { id: 'observation-1' };
    });

    prisma.diagnosis.create.mockImplementation(async () => {
      events.push('diagnosis-write');
      return { id: 'diagnosis-1' };
    });

    prisma.practitioner.findFirst.mockResolvedValue({
      id: 'practitioner-1',
      facilityId: context.facilityId,
      status: 'ACTIVE',
    });

    prisma.$queryRaw.mockImplementation(async () => {
      events.push('lock');
      return [{ id: encounter.id }];
    });

    prisma.$transaction.mockImplementation(
      async (callback) => callback(prisma),
    );

    audit.log.mockResolvedValue(undefined);

    service = new EncountersService(
      prisma as any,
      audit as any,
    );
  });

  it('locks before closing an encounter', async () => {
    await service.close(encounter.id, {}, context);

    expect(events.indexOf('lock')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('close-write')).toBeGreaterThan(
      events.indexOf('lock'),
    );
  });

  it('locks before recording vitals', async () => {
    await service.createVitals(
      encounter.id,
      { pulseRate: 80 },
      context,
    );

    expect(events.indexOf('lock')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('vitals-write')).toBeGreaterThan(
      events.indexOf('lock'),
    );
  });

  it('locks before creating a diagnosis', async () => {
    await service.createDiagnosis(
      encounter.id,
      {
        practitionerId: 'practitioner-1',
        code: 'J06.9',
        codeSystem: 'ICD-10',
        description: 'Acute upper respiratory infection',
        diagnosisType: 'PRIMARY',
      } as any,
      context,
    );

    expect(events.indexOf('lock')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('diagnosis-write')).toBeGreaterThan(
      events.indexOf('lock'),
    );
  });

  it('rejects closure when the locked encounter is completed', async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce({
      ...encounter,
      status: 'COMPLETED',
    });

    await expect(
      service.close(encounter.id, {}, context),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.encounter.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects vitals when the locked encounter is completed', async () => {
    prisma.encounter.findFirst
      .mockResolvedValueOnce(encounter)
      .mockResolvedValueOnce({
        ...encounter,
        status: 'COMPLETED',
      });

    await expect(
      service.createVitals(
        encounter.id,
        { pulseRate: 80 },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.observation.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects diagnosis when the locked encounter is completed', async () => {
    prisma.encounter.findFirst
      .mockResolvedValueOnce(encounter)
      .mockResolvedValueOnce({
        ...encounter,
        status: 'COMPLETED',
      });

    await expect(
      service.createDiagnosis(
        encounter.id,
        {
          practitionerId: 'practitioner-1',
          code: 'J06.9',
          codeSystem: 'ICD-10',
          description: 'Acute upper respiratory infection',
          diagnosisType: 'PRIMARY',
        } as any,
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});