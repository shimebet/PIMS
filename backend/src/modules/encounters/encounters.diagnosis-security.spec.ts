import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncountersService } from './encounters.service.js';

describe('Encounter diagnosis facility security', () => {
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

  const dto = {
    practitionerId: 'practitioner-1',
    code: 'J06.9',
    codeSystem: 'ICD-10',
    description: 'Acute upper respiratory infection',
    diagnosisType: 'PRIMARY',
  };

  const diagnosis = {
    id: 'diagnosis-1',
    patientId: encounter.patientId,
    encounterId,
    ...dto,
    status: 'ACTIVE',
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
    practitioner: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'practitioner-1',
        facilityId: 'facility-1',
        status: 'ACTIVE',
      }),
    },
    diagnosis: {
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

    prisma.practitioner.findFirst.mockResolvedValue({
      id: 'practitioner-1',
      facilityId: 'facility-1',
      status: 'ACTIVE',
    });

    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'ACTIVE',
    });

    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'ACTIVE',
    });

    prisma.encounter.findFirst.mockResolvedValue(encounter);
    prisma.diagnosis.create.mockResolvedValue(diagnosis);
    prisma.diagnosis.findMany.mockResolvedValue([diagnosis]);

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

  it('creates a diagnosis for an authorized encounter', async () => {
    const result = await service.createDiagnosis(
      encounterId,
      dto as any,
      context,
    );

    expect(result).toEqual(diagnosis);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: encounterId,
        facilityId,
      },
    });

    expect(prisma.diagnosis.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId: encounter.patientId,
        encounterId,
        practitionerId: dto.practitionerId,
        code: dto.code,
        codeSystem: dto.codeSystem,
        description: dto.description,
        diagnosisType: dto.diagnosisType,
        status: 'ACTIVE',
      }),
    });
  });

  it('retrieves diagnoses after an authorized encounter lookup', async () => {
    const result = await service.findDiagnoses(
      encounterId,
      context,
    );

    expect(result).toEqual([diagnosis]);

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: encounterId,
        facilityId,
      },
    });

    expect(prisma.diagnosis.findMany).toHaveBeenCalledWith({
      where: {
        encounterId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('rejects cross-facility diagnosis creation', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects cross-facility diagnosis retrieval', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(
      service.findDiagnoses(encounterId, context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.diagnosis.findMany).not.toHaveBeenCalled();
  });

  it('rejects missing facility assignment for both endpoints', async () => {
    const invalidContext = {
      ...context,
      facilityId: null,
    };

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        invalidContext,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findDiagnoses(encounterId, invalidContext),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(prisma.diagnosis.findMany).not.toHaveBeenCalled();
  });

  it('rejects inactive users for both endpoints', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findDiagnoses(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects inactive facilities for both endpoints', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findDiagnoses(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects JWT/database facility mismatches', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-2',
      status: 'ACTIVE',
    });

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findDiagnoses(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('rejects missing database users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.findDiagnoses(encounterId, context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it('records the existing diagnosis creation audit event', async () => {
    await service.createDiagnosis(
      encounterId,
      dto as any,
      context,
    );

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: context.userId,
        eventType: 'DATA_CREATE',
        action: 'DIAGNOSIS_CREATE',
        resourceType: 'Diagnosis',
        resourceId: diagnosis.id,
        patientId: encounter.patientId,
      }),
    );
  });

  it('does not audit failed diagnosis creation', async () => {
    prisma.diagnosis.create.mockRejectedValue(
      new Error('Diagnosis creation failed'),
    );

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toThrow('Diagnosis creation failed');

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not create a diagnosis when the facility lookup fails', async () => {
    prisma.facility.findUnique.mockResolvedValue(null);

    await expect(
      service.createDiagnosis(
        encounterId,
        dto as any,
        context,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects diagnosis creation for a completed encounter', async () => {
    prisma.encounter.findFirst.mockResolvedValue({
      id: 'encounter-1',
      patientId: 'patient-1',
      facilityId: 'facility-1',
      status: 'COMPLETED',
    });

    await expect(
      service.createDiagnosis(
        'encounter-1',
        dto,
        context,
      ),
    ).rejects.toThrow(
      'Cannot add a diagnosis to a closed encounter',
    );

    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects a practitioner outside the authorized facility', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.createDiagnosis(
        'encounter-1',
        dto,
        context,
      ),
    ).rejects.toThrow(
      'Active practitioner not found in this facility',
    );

    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not write or audit when practitioner validation fails', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.createDiagnosis(
        'encounter-1',
        dto,
        context,
      ),
    ).rejects.toThrow();

    expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('checks practitioner facility and active status before diagnosis creation', async () => {
    await service.createDiagnosis(
      'encounter-1',
      dto,
      context,
    );

    expect(prisma.practitioner.findFirst).toHaveBeenCalledWith({
      where: {
        id: dto.practitionerId,
        facilityId: context.facilityId,
        status: 'ACTIVE',
      },
    });

    expect(prisma.diagnosis.create).toHaveBeenCalledOnce();
  });
});
