import bcrypt from "bcrypt";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: UserRole) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, status: UserStatus.ACTIVE },
    create: { email, passwordHash, role, status: UserStatus.ACTIVE },
  });
}

async function main() {
  const password = process.env.SEED_PASSWORD ?? "password";

  await upsertUser("admin@example.com", password, UserRole.ADMIN);
  await upsertUser("analyst@example.com", password, UserRole.ANALYST);
  await upsertUser("viewer@example.com", password, UserRole.VIEWER);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

