import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminEmail = "admin@medware.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Admin",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    console.log("Admin user created: admin@medware.com / admin123");
  } else {
    console.log("Admin user already exists");
  }

  // Create default system settings if they don't exist
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    await prisma.systemSettings.create({
      data: { id: "singleton" },
    });
    console.log("Default system settings created");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
