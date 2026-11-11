import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ClinicalNotesService } from './clinical-notes.service.js';

describe('ClinicalNotesService', () => {
  let service: ClinicalNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalNotesService,
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

    service = module.get<ClinicalNotesService>(ClinicalNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

