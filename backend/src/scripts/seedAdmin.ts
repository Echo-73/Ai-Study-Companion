import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/authUtils';

async function seedAdmin() {
  const args = process.argv.slice(2);
  let emailArg: string | undefined;
  let nameArg: string | undefined;
  let passwordArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      emailArg = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      nameArg = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      passwordArg = args[i + 1];
      i++;
    }
  }

  const email = (emailArg || process.env.ADMIN_EMAIL)?.trim().toLowerCase();
  const password = passwordArg || process.env.ADMIN_PASSWORD;
  const name = nameArg || process.env.ADMIN_NAME || 'System Administrator';

  if (!email) {
    console.error('Error: Please provide an email via --email <email> or ADMIN_EMAIL environment variable.');
    console.log('\nUsage Examples:');
    console.log('  1. Promote an existing user:');
    console.log('     npm run seed:admin -- --email user@example.com');
    console.log('  2. Create a new admin:');
    console.log('     npm run seed:admin -- --email admin@example.com --password <SecurePassword> --name "Admin Name"');
    process.exit(1);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role === Role.ADMIN) {
        console.log(`[ADMIN SEED] User "${existingUser.name}" (${existingUser.email}) is already an ADMIN.`);
        return;
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: Role.ADMIN },
      });

      console.log(`[ADMIN SEED] Successfully promoted existing user "${existingUser.name}" (${existingUser.email}) to role ADMIN.`);
    } else {
      if (!password || password.length < 8) {
        console.error('Error: To create a new admin account, a secure password of at least 8 characters is required.');
        console.error('Specify --password <password> or set the ADMIN_PASSWORD environment variable.');
        process.exit(1);
      }

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.ADMIN,
        },
      });

      console.log(`[ADMIN SEED] Successfully created new administrator "${newUser.name}" (${newUser.email}) with role ADMIN.`);
    }
  } catch (error: any) {
    console.error('[ADMIN SEED] Error setting up admin:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
