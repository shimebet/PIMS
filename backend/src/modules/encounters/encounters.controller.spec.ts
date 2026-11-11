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
});

