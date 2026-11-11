import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { EncountersService } from './encounters.service.js';

describe('EncountersService', () => {
  let service: EncountersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
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

    service = module.get<EncountersService>(EncountersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

