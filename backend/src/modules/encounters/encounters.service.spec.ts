import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { EncountersService } from './encounters.service.js';

describe('EncountersService', () => {
  let service: EncountersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: { log: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<EncountersService>(EncountersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('Encounter creation facility authorization', () => {
  const facilityId = 'facility-1';
  const otherFacilityId = 'facility-2';

  const dto = {
    patientId: 'patient-1',
    facilityId,
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
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const audit = {
    log: vi.fn(),
  };

  let service: EncountersService;

  beforeEach(() => {
    vi.clearAllMocks();

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

  it('allows an active user at the assigned active facility', async () => {
    const result = await service.create(dto, context);

    expect(result.encounterNumber).toBe('E00000001');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledOnce();
  });

  it('rejects a request for another facility', async () => {
    await expect(
      service.create(
        { ...dto, facilityId: otherFacilityId },
        context,
      ),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a user without a facility assignment', async () => {
    await expect(
      service.create(dto, {
        ...context,
        facilityId: null,
      }),
    ).rejects.toThrow(
      'An active facility assignment is required',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.create(dto, context),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive facility', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.create(dto, context),
    ).rejects.toThrow('An active facility is required');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a JWT facility that differs from the database assignment', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: otherFacilityId,
      status: 'ACTIVE',
    });

    await expect(
      service.create(dto, context),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing database user before creating an encounter', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(dto, context),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects an inactive patient before creating an encounter', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      id: dto.patientId,
      status: 'INACTIVE',
    });

    await expect(
      service.create(dto, context),
    ).rejects.toThrow(
      'Cannot create an encounter for an inactive patient',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
