import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "yurigorelik@gmail.com";

  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!user) {
    console.log(`User ${adminEmail} not found. They will be set as ADMIN when they register.`);
    console.log("To set them as admin after registration, run this script again.");
    return;
  }

  if (user.role === "ADMIN") {
    console.log(`${adminEmail} is already an admin.`);
    return;
  }

  await prisma.user.update({
    where: { email: adminEmail },
    data: { role: "ADMIN" },
  });

  console.log(`Successfully set ${adminEmail} as ADMIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
