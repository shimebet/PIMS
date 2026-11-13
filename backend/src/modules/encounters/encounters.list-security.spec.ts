import { EncountersService } from './encounters.service.js';

describe('Encounter listing facility security', () => {
  const facilityId = 'facility-1';

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
    encounter: {
      findMany: vi.fn(),
      count: vi.fn(),
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

    prisma.encounter.findMany.mockResolvedValue([]);
    prisma.encounter.count.mockResolvedValue(0);

    prisma.$transaction.mockImplementation(
      async (operations) => Promise.all(operations),
    );

    service = new EncountersService(
      prisma as any,
      audit as any,
    );
  });

  it('restricts encounter listing and count to the assigned facility', async () => {
    const result = await service.findAll({}, context);

    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId,
        }),
      }),
    );

    expect(prisma.encounter.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        facilityId,
      }),
    });

    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('preserves patient and status filters within the facility', async () => {
    await service.findAll(
      {
        patientId: 'patient-1',
        status: 'IN_PROGRESS',
      },
      context,
    );

    const expectedWhere = {
      facilityId,
      patientId: 'patient-1',
      status: 'IN_PROGRESS',
    };

    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(expectedWhere),
      }),
    );

    expect(prisma.encounter.count).toHaveBeenCalledWith({
      where: expect.objectContaining(expectedWhere),
    });
  });

  it('rejects a user without a facility assignment', async () => {
    await expect(
      service.findAll({}, {
        ...context,
        facilityId: null,
      }),
    ).rejects.toThrow(
      'An active facility assignment is required',
    );

    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
    expect(prisma.encounter.count).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.findAll({}, context),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive facility', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: facilityId,
      status: 'INACTIVE',
    });

    await expect(
      service.findAll({}, context),
    ).rejects.toThrow('An active facility is required');

    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a JWT/database facility mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: 'facility-2',
      status: 'ACTIVE',
    });

    await expect(
      service.findAll({}, context),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing database user without querying encounters', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.findAll({}, context),
    ).rejects.toThrow('Encounter facility access denied');

    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
    expect(prisma.encounter.count).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
