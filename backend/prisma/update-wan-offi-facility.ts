
import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main(): Promise<void> {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? 'pims_app',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'pims',
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.facility.findUnique({
      where: { code: 'MAIN' },
    });

    if (!existing) {
      throw new Error(
        'Facility with code MAIN was not found.',
      );
    }

    console.log('Current facility:', {
      id: existing.id,
      code: existing.code,
      name: existing.name,
      facilityType: existing.facilityType,
      country: existing.country,
      region: existing.region,
      city: existing.city,
      address: existing.address,
    });

    const updated = await prisma.facility.update({
      where: { id: existing.id },
      data: {
        name: 'Wan Offi Medium Clinic',
        facilityType: 'Medium Clinic',
        country: 'Ethiopia',
        city: 'Delosebro',
        address: 'Ghinnir Woreda, Delosebro',
        timezone: 'Africa/Addis_Ababa',
      },
    });

    console.log('Updated facility:', {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      facilityType: updated.facilityType,
      country: updated.country,
      region: updated.region,
      city: updated.city,
      address: updated.address,
      timezone: updated.timezone,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Facility update failed:', error);
  process.exitCode = 1;
});
