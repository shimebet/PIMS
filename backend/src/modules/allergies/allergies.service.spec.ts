import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AllergiesService } from './allergies.service.js';

describe('AllergiesService', () => {
  let service: AllergiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllergiesService,
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

    service = module.get<AllergiesService>(AllergiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

