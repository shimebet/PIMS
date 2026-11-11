import { Test, TestingModule } from '@nestjs/testing';
import { RadiologyService } from './radiology.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RadiologyController } from './radiology.controller.js';

describe('RadiologyController', () => {
  let controller: RadiologyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RadiologyController],
      providers: [
        {
          provide: RadiologyService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RadiologyController>(RadiologyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

