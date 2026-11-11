import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalNotesService } from './clinical-notes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { ClinicalNotesController } from './clinical-notes.controller.js';

describe('ClinicalNotesController', () => {
  let controller: ClinicalNotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClinicalNotesController],
      providers: [
        {
          provide: ClinicalNotesService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClinicalNotesController>(ClinicalNotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

