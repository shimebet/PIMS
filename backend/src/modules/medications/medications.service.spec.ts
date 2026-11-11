import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { MedicationsService } from './medications.service.js';

describe('MedicationsService', () => {
  let service: MedicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
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

    service = module.get<MedicationsService>(MedicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

