import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RadiologyService } from './radiology.service.js';

const FACILITY_A = 'facility-a';
const FACILITY_B = 'facility-b';

const context = {
  userId: 'user-a',
  facilityId: FACILITY_A,
};

const orderDto = {
  modality: 'X-RAY',
  studyDescription: 'Test radiology study',
};

const resultDto = {
  findings: 'Test findings',
  impression: 'Test impression',
};

describe('Radiology facility security', () => {
  let service: RadiologyService;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          facilityId: FACILITY_A,
          status: 'ACTIVE',
        }),
      },
      facility: {
        findUnique: vi.fn().mockResolvedValue({
          id: FACILITY_A,
          status: 'ACTIVE',
        }),
      },
      encounter: {
        findUnique: vi.fn(),
      },
      practitioner: {
        findUnique: vi.fn(),
      },
      patient: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'patient-1',
        }),
      },
      radiologyOrder: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(),
    };

    audit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new RadiologyService(prisma, audit);
  });

  it('rejects a missing facility assignment', async () => {
    await expect(
      service.findByPatient('patient-1', {
        userId: 'user-a',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: FACILITY_A,
      status: 'INACTIVE',
    });

    await expect(
      service.findByPatient('patient-1', context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a user facility mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      facilityId: FACILITY_B,
      status: 'ACTIVE',
    });

    await expect(
      service.findByPatient('patient-1', context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an inactive facility', async () => {
    prisma.facility.findUnique.mockResolvedValue({
      id: FACILITY_A,
      status: 'INACTIVE',
    });

    await expect(
      service.findByPatient('patient-1', context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects order creation for another facility', async () => {
    prisma.encounter.findUnique.mockResolvedValue({
      id: 'encounter-1',
      patientId: 'patient-1',
      facilityId: FACILITY_B,
      status: 'IN_PROGRESS',
    });

    await expect(
      service.createOrder('encounter-1', orderDto, context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('scopes order retrieval to the authorized facility', async () => {
    prisma.radiologyOrder.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('order-1', context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.radiologyOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'order-1',
          encounter: {
            facilityId: FACILITY_A,
          },
        }),
      }),
    );
  });

  it('filters patient history by encounter facility', async () => {
    await service.findByPatient('patient-1', context);

    expect(prisma.radiologyOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 'patient-1',
          encounter: {
            facilityId: FACILITY_A,
          },
        },
      }),
    );
  });

  it('scopes result creation to the authorized facility', async () => {
    prisma.radiologyOrder.findUnique.mockResolvedValue(null);

    await expect(
      service.createResult('order-1', resultDto, context),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.radiologyOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'order-1',
          encounter: {
            facilityId: FACILITY_A,
          },
        }),
      }),
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a practitioner from another facility', async () => {
    prisma.encounter.findUnique.mockResolvedValue({
      id: 'encounter-1',
      patientId: 'patient-1',
      facilityId: FACILITY_A,
      status: 'IN_PROGRESS',
    });

    prisma.practitioner.findUnique.mockResolvedValue({
      id: 'practitioner-1',
      facilityId: FACILITY_B,
      status: 'ACTIVE',
    });

    await expect(
      service.createOrder(
        'encounter-1',
        {
          ...orderDto,
          practitionerId: 'practitioner-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive practitioner', async () => {
    prisma.encounter.findUnique.mockResolvedValue({
      id: 'encounter-1',
      patientId: 'patient-1',
      facilityId: FACILITY_A,
      status: 'IN_PROGRESS',
    });

    prisma.practitioner.findUnique.mockResolvedValue({
      id: 'practitioner-1',
      facilityId: FACILITY_A,
      status: 'INACTIVE',
    });

    await expect(
      service.createOrder(
        'encounter-1',
        {
          ...orderDto,
          practitionerId: 'practitioner-1',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate radiology results', async () => {
    prisma.radiologyOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      patientId: 'patient-1',
      result: {
        id: 'existing-result',
      },
    });

    await expect(
      service.createResult('order-1', resultDto, context),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});