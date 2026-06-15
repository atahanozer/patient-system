import { PrismaClient, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
faker.seed(42); // DEMO: deterministic dataset across runs

async function main() {
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const userHash = await bcrypt.hash('User123!', 10);
  // DEMO: users are seeded, not registerable — there is no signup flow in this demo.
  await prisma.user.upsert({
    where: { email: 'admin@demo.health' },
    update: {},
    create: { email: 'admin@demo.health', passwordHash: adminHash, role: Role.ADMIN },
  });
  await prisma.user.upsert({
    where: { email: 'user@demo.health' },
    update: {},
    create: { email: 'user@demo.health', passwordHash: userHash, role: Role.USER },
  });

  const count = await prisma.patient.count();
  if (count === 0) {
    const patients = Array.from({ length: 120 }, () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return {
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        phoneNumber: faker.phone.number(),
        dob: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
      };
    });
    const unique = Array.from(new Map(patients.map((p) => [p.email, p])).values());
    await prisma.patient.createMany({ data: unique, skipDuplicates: true });
  }
}

// DEMO: only lastName + dob are indexed (the common sort columns). firstName/createdAt
// sorts are unindexed — fine for a ~120-row demo; add @@index if the dataset grows.
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1; // ensure a failed seed exits non-zero (Docker/CI rely on this)
  })
  .finally(() => prisma.$disconnect());
