import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncountersService } from './encounters.service.js';

describe('Encounter practitioner facility security', () => {
  const facilityId = 'facility-1';
  const practitionerId = 'practitioner-1';

  const dto = {
    patientId: 'patient-1',
    facilityId,
    practitionerId,
    encounterType: 'OUTPATIENT',
  };

  const context = {
    userId: 'user-1',
    facilityId,
  };

  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    facility: {
      findUnique: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
    },
    practitioner: {
      findFirst: vi.fn(),
    },
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

    prisma.patient.findUnique.mockResolvedValue({
      id: dto.patientId,
      status: 'ACTIVE',
    });

    prisma.practitioner.findFirst.mockResolvedValue({
      id: practitionerId,
      facilityId,
      status: 'ACTIVE',
    });

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        numberSequence: {
          update: vi.fn().mockResolvedValue({
            value: 1,
          }),
        },
        encounter: {
          create: vi.fn().mockResolvedValue({
            id: 'encounter-1',
            encounterNumber: 'E00000001',
            patientId: dto.patientId,
            facilityId,
            practitionerId,
          }),
        },
      };

      return callback(tx);
    });

    audit.log.mockResolvedValue(undefined);

    service = new EncountersService(
      prisma as any,
      audit as any,
    );
  });

  it('accepts an active practitioner in the authorized facility', async () => {
    const result = await service.create(dto, context);

    expect(result.encounterNumber).toBe('E00000001');

    expect(prisma.practitioner.findFirst).toHaveBeenCalledWith({
      where: {
        id: practitionerId,
        facilityId,
        status: 'ACTIVE',
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledOnce();
  });

  it('rejects a practitioner belonging to another facility', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.create(dto, context),
    ).rejects.toThrow(
      'Active practitioner not found in this facility',
    );

    expect(prisma.practitioner.findFirst).toHaveBeenCalledWith({
      where: {
        id: practitionerId,
        facilityId,
        status: 'ACTIVE',
      },
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects an inactive practitioner', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.create(dto, context),
    ).rejects.toThrow(
      'Active practitioner not found in this facility',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent practitioner', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.create(dto, context),
    ).rejects.toThrow(
      'Active practitioner not found in this facility',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not create an encounter when practitioner validation fails', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.create(dto, context),
    ).rejects.toThrow();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('allows encounter creation without an optional practitioner', async () => {
    const result = await service.create(
      {
        patientId: dto.patientId,
        facilityId,
        encounterType: dto.encounterType,
      },
      context,
    );

    expect(result.encounterNumber).toBe('E00000001');

    expect(prisma.practitioner.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledOnce();
  });
});
