import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsService } from './medications.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { MedicationsController } from './medications.controller.js';

describe('MedicationsController', () => {
  let controller: MedicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicationsController],
      providers: [
        {
          provide: MedicationsService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MedicationsController>(MedicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

