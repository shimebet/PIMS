import { Test, TestingModule } from '@nestjs/testing';
import { EncountersService } from './encounters.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { EncountersController } from './encounters.controller.js';

describe('EncountersController', () => {
  let controller: EncountersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EncountersController],
      providers: [
        {
          provide: EncountersService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EncountersController>(EncountersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards the authenticated facility to encounter creation', async () => {
    const dto = {
      patientId: 'patient-1',
      facilityId: 'facility-1',
      encounterType: 'OUTPATIENT',
    };

    const user = {
      userId: 'user-1',
      username: 'test-user',
      facilityId: 'facility-1',
      roles: ['CLINICIAN'],
      permissions: ['encounter.create'],
    };

    const request = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'vitest',
        'x-request-id': 'test-request-1',
      },
    };

    const create = vi.fn().mockResolvedValue({
      id: 'encounter-1',
    });

    const service = (
      controller as unknown as {
        encountersService: {
          create: typeof create;
        };
      }
    ).encountersService;

    service.create = create;

    await controller.create(
      dto,
      request as any,
      user,
    );

    expect(create).toHaveBeenCalledWith(
      dto,
      expect.objectContaining({
        userId: 'user-1',
        facilityId: 'facility-1',
        requestId: 'test-request-1',
      }),
    );
  });
});

