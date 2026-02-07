import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  try {
    await sql.unsafe("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'default'");
    console.log('Added default enum value');
  } catch (e: any) {
    console.log('default enum value error:', e.message);
  }
  
  try {
    await sql.unsafe("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'deployer'");
    console.log('Added deployer enum value');
  } catch (e: any) {
    console.log('deployer enum value error:', e.message);
  }
  
  try {
    const r = await sql`UPDATE "user" SET role = 'deployer' WHERE role = 'user'`;
    console.log('Migrated', r.count, 'users from user to deployer');
  } catch (e: any) {
    console.log('Update error:', e.message);
  }
  
  await sql.end();
}

main();
