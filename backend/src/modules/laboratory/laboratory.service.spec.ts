import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LaboratoryService } from './laboratory.service.js';

describe('LaboratoryService', () => {
  let service: LaboratoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryService,
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

    service = module.get<LaboratoryService>(LaboratoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

