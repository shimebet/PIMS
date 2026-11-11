import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryService } from './laboratory.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { LaboratoryController } from './laboratory.controller.js';

describe('LaboratoryController', () => {
  let controller: LaboratoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LaboratoryController],
      providers: [
        {
          provide: LaboratoryService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LaboratoryController>(LaboratoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

