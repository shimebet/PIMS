
import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          PatientsService,
          {
            provide: PrismaService,
            useValue: {},
          },
          {
            provide: AuditService,
            useValue: {
              log: vi.fn(),
            },
          },
        ],
      }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
