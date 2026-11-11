import 'dotenv/config';

import argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? 'pims_app',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'pims',
  connectionLimit: 5,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('Starting PIMS database seed...');

  const organization = await prisma.organization.upsert({
    where: {
      code: 'PIMS-ORG',
    },
    update: {},
    create: {
      code: 'PIMS-ORG',
      name: 'PIMS Healthcare Organization',
      status: 'ACTIVE',
    },
  });

  const facility = await prisma.facility.upsert({
    where: {
      code: 'MAIN',
    },
    update: {},
    create: {
      organizationId: organization.id,
      code: 'MAIN',
      name: 'Main Hospital',
      facilityType: 'HOSPITAL',
      country: 'Ethiopia',
      timezone: 'Africa/Addis_Ababa',
      status: 'ACTIVE',
    },
  });

  const department = await prisma.department.upsert({
    where: {
      facilityId_code: {
        facilityId: facility.id,
        code: 'ADMIN',
      },
    },
    update: {},
    create: {
      facilityId: facility.id,
      code: 'ADMIN',
      name: 'Administration',
      status: 'ACTIVE',
    },
  });

  const roles = [
    {
      code: 'SYSTEM_ADMIN',
      name: 'System Administrator',
    },
    {
      code: 'HOSPITAL_ADMIN',
      name: 'Hospital Administrator',
    },
    {
      code: 'DOCTOR',
      name: 'Doctor',
    },
    {
      code: 'NURSE',
      name: 'Nurse',
    },
    {
      code: 'RECEPTIONIST',
      name: 'Receptionist',
    },
    {
      code: 'LAB_TECHNICIAN',
      name: 'Laboratory Technician',
    },
    {
      code: 'RADIOLOGIST',
      name: 'Radiologist',
    },
    {
      code: 'PHARMACIST',
      name: 'Pharmacist',
    },
    {
      code: 'MEDICAL_RECORDS',
      name: 'Medical Records Officer',
    },
    {
      code: 'AUDITOR',
      name: 'Auditor',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },
      update: {
        name: role.name,
      },
      create: {
        code: role.code,
        name: role.name,
        status: 'ACTIVE',
      },
    });
  }

  const permissions = [
    {
      code: 'patient.create',
      name: 'Create Patient',
      module: 'PATIENT',
    },
    {
      code: 'patient.read',
      name: 'View Patient',
      module: 'PATIENT',
    },
    {
      code: 'patient.update',
      name: 'Update Patient',
      module: 'PATIENT',
    },
    {
      code: 'patient.merge',
      name: 'Merge Patient',
      module: 'PATIENT',
    },

    {
      code: 'user.create',
      name: 'Create User',
      module: 'ADMIN',
    },
    {
      code: 'user.read',
      name: 'View User',
      module: 'ADMIN',
    },
    {
      code: 'user.update',
      name: 'Update User',
      module: 'ADMIN',
    },
    {
      code: 'user.manage',
      name: 'Manage Users',
      module: 'ADMIN',
    },

    {
      code: 'role.read',
      name: 'View Roles',
      module: 'ADMIN',
    },
    {
      code: 'role.manage',
      name: 'Manage Roles',
      module: 'ADMIN',
    },

    {
      code: 'audit.read',
      name: 'View Audit Logs',
      module: 'AUDIT',
    },

    {
      code: 'encounter.create',
      name: 'Create Encounter',
      module: 'ENCOUNTER',
    },
    {
      code: 'encounter.read',
      name: 'View Encounter',
      module: 'ENCOUNTER',
    },
    {
      code: 'encounter.update',
      name: 'Update Encounter',
      module: 'ENCOUNTER',
    },
    {
      code: 'vitals.create',
      name: 'Record Vital Signs',
      module: 'CLINICAL',
    },
    {
      code: 'vitals.read',
      name: 'View Vital Signs',
      module: 'CLINICAL',
    },
    {
      code: 'diagnosis.create',
      name: 'Create Diagnosis',
      module: 'CLINICAL',
    },
    {
      code: 'diagnosis.read',
      name: 'View Diagnoses',
      module: 'CLINICAL',
    },
    {
      code: 'allergy.create',
      name: 'Create Allergy',
      module: 'CLINICAL',
    },
    {
      code: 'allergy.read',
      name: 'View Allergies',
      module: 'CLINICAL',
    },

    {
      code: 'note.create',
      name: 'Create Clinical Note',
      module: 'CLINICAL',
    },
    {
      code: 'note.read',
      name: 'View Clinical Notes',
      module: 'CLINICAL',
    },
    {
      code: 'note.update',
      name: 'Update Clinical Note',
      module: 'CLINICAL',
    },

    {
      code: 'medication.create',
      name: 'Prescribe Medication',
      module: 'MEDICATION',
    },
    {
      code: 'medication.read',
      name: 'View Medication Orders',
      module: 'MEDICATION',
    },

    {
      code: 'lab.order',
      name: 'Create Laboratory Order',
      module: 'LAB',
    },
    {
      code: 'lab.read',
      name: 'View Laboratory Orders and Results',
      module: 'LAB',
    },
    {
      code: 'lab.result',
      name: 'Enter Laboratory Result',
      module: 'LAB',
    },

    {
      code: 'radiology.order',
      name: 'Create Radiology Order',
      module: 'RADIOLOGY',
    },
    {
      code: 'radiology.read',
      name: 'View Radiology Orders and Results',
      module: 'RADIOLOGY',
    },
    {
      code: 'radiology.result',
      name: 'Enter Radiology Result',
      module: 'RADIOLOGY',
    },

    {
      code: 'medication.create',
      name: 'Prescribe Medication',
      module: 'MEDICATION',
    },
    {
      code: 'medication.read',
      name: 'View Medication Orders',
      module: 'MEDICATION',
    },
    {
      code: 'medication.update',
      name: 'Update Medication Orders',
      module: 'MEDICATION',
    },
    {
      code: 'lab.order',
      name: 'Create Laboratory Order',
      module: 'LAB',
    },
    {
      code: 'lab.read',
      name: 'View Laboratory Orders and Results',
      module: 'LAB',
    },
    {
      code: 'lab.result',
      name: 'Enter Laboratory Result',
      module: 'LAB',
    },

    {
      code: 'radiology.order',
      name: 'Create Radiology Order',
      module: 'RADIOLOGY',
    },
    {
      code: 'radiology.read',
      name: 'View Radiology Orders and Results',
      module: 'RADIOLOGY',
    },
    {
      code: 'radiology.result',
      name: 'Enter Radiology Result',
      module: 'RADIOLOGY',
    },
{
  code: 'report.read',
  name: 'View Health Office Reports',
  module: 'REPORT',
},
{
  code: 'report.export',
  name: 'Export Health Office Reports',
  module: 'REPORT',
},
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },
      update: {
        name: permission.name,
        module: permission.module,
      },
      create: permission,
    });
  }

  const systemAdminRole =
    await prisma.role.findUniqueOrThrow({
      where: {
        code: 'SYSTEM_ADMIN',
      },
    });

  const allPermissions =
    await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: systemAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: systemAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const initialPassword =
    process.env.ADMIN_INITIAL_PASSWORD;

  if (!initialPassword) {
    throw new Error(
      'ADMIN_INITIAL_PASSWORD is missing from .env',
    );
  }

  const passwordHash =
    await argon2.hash(initialPassword);

  const adminUser =
    await prisma.user.upsert({
      where: {
        username: 'admin',
      },
      update: {},
      create: {
        username: 'admin',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        facilityId: facility.id,
        departmentId: department.id,
        status: 'ACTIVE',
      },
    });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: systemAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: systemAdminRole.id,
    },
  });
  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'PATIENT_NUMBER',
    },

    update: {},

    create: {
      sequenceKey: 'PATIENT_NUMBER',
      value: BigInt(0),
    },
  });

  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'ENCOUNTER_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'ENCOUNTER_NUMBER',
      value: BigInt(0),
    },
  });
  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'PRESCRIPTION_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'PRESCRIPTION_NUMBER',
      value: BigInt(0),
    },
  });

  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'LAB_ORDER_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'LAB_ORDER_NUMBER',
      value: BigInt(0),
    },
  });

  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'RADIOLOGY_ORDER_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'RADIOLOGY_ORDER_NUMBER',
      value: BigInt(0),
    },
  });

  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'PRESCRIPTION_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'PRESCRIPTION_NUMBER',
      value: BigInt(0),
    },
  });
  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'LAB_ORDER_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'LAB_ORDER_NUMBER',
      value: BigInt(0),
    },
  });
  await prisma.numberSequence.upsert({
    where: {
      sequenceKey: 'RADIOLOGY_ORDER_NUMBER',
    },
    update: {},
    create: {
      sequenceKey: 'RADIOLOGY_ORDER_NUMBER',
      value: BigInt(0),
    },
  });



  console.log('PIMS database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });