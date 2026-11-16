import 'dotenv/config';
import { PrismaService } from './src/database/prisma/prisma.service.js';

const PERMISSION_CODE = 'patient.deactivate';
const AUTHORIZED_ROLES = ['SYSTEM_ADMIN', 'OFFICE_MANAGER'] as const;

type RoleCode = (typeof AUTHORIZED_ROLES)[number];

async function main(): Promise<void> {
  if (!process.argv.includes('--execute')) {
    console.log('REVIEW MODE: No database connection or changes.');
    console.log('Execution requires explicit --execute authorization.');
    return;
  }

  if (process.env.DATABASE_NAME !== 'pims') {
    throw new Error('Safety stop: expected production database pims.');
  }

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const result = await prisma.$transaction(async (tx) => {
      const roles = await tx.role.findMany({
        where: {
          code: { in: [...AUTHORIZED_ROLES] },
        },
        select: {
          id: true,
          code: true,
          status: true,
        },
      });

      for (const code of AUTHORIZED_ROLES) {
        const matching = roles.filter((role) => role.code === code);

        if (matching.length !== 1) {
          throw new Error(`Required role missing or duplicated: ${code}`);
        }

        if (matching[0].status !== 'ACTIVE') {
          throw new Error(`Required role is inactive: ${code}`);
        }
      }

      const existingPermission = await tx.permission.findUnique({
        where: { code: PERMISSION_CODE },
        select: { id: true },
      });

      const permission = await tx.permission.upsert({
        where: { code: PERMISSION_CODE },
        update: {},
        create: {
          code: PERMISSION_CODE,
          name: 'Deactivate Patient',
          module: 'PATIENT',
          description:
            'Deactivate patient registration without deleting clinical history',
        },
        select: {
          id: true,
          code: true,
        },
      });

      const createdAssignments: RoleCode[] = [];

      for (const code of AUTHORIZED_ROLES) {
        const role = roles.find((item) => item.code === code)!;

        const existingAssignment = await tx.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          select: { id: true },
        });

        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });

        if (!existingAssignment) {
          createdAssignments.push(code);
        }
      }

      // Verify before transaction commit.
      const verified = await tx.rolePermission.findMany({
        where: {
          permissionId: permission.id,
          role: {
            code: { in: [...AUTHORIZED_ROLES] },
          },
        },
        select: {
          role: {
            select: {
              code: true,
              status: true,
            },
          },
        },
      });

      for (const code of AUTHORIZED_ROLES) {
        const matches = verified.filter(
          (item) =>
            item.role.code === code &&
            item.role.status === 'ACTIVE',
        );

        if (matches.length !== 1) {
          throw new Error(`Transaction verification failed: ${code}`);
        }
      }

      return {
        permission: permission.code,
        permissionCreated: !existingPermission,
        createdAssignments,
        verifiedRoles: verified.map((item) => item.role.code),
      };
    });

    console.log('Registration transaction committed.');
    console.log('Permission:', result.permission);
    console.log('Permission created:', result.permissionCreated);
    console.log(
      'New assignments:',
      result.createdAssignments.length
        ? result.createdAssignments.join(', ')
        : 'None',
    );
    console.log('Verified roles:', result.verifiedRoles.join(', '));
    console.log('Verification: PASSED');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown error';

  console.error('Registration failed:', message);
  process.exitCode = 1;
});