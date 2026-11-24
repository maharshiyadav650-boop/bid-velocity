import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function run() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  console.log('Connecting to Neon via unpooled connection...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Resetting schema public...');
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const migrationDir = path.resolve('services/platform-service/src/main/resources/db/migration/platform');
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
  console.log('Found migration files:', files);

  // Create flyway_schema_history table
  await client.query(`
    CREATE TABLE IF NOT EXISTS flyway_schema_history (
      installed_rank INT NOT NULL PRIMARY KEY,
      version VARCHAR(50),
      description VARCHAR(200) NOT NULL,
      type VARCHAR(20) NOT NULL,
      script VARCHAR(1000) NOT NULL,
      checksum INT,
      installed_by VARCHAR(100) NOT NULL,
      installed_on TIMESTAMP NOT NULL DEFAULT now(),
      execution_time INT NOT NULL,
      success BOOLEAN NOT NULL
    );
  `);

  let rank = 1;
  for (const file of files) {
    console.log(`Executing ${file}...`);
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    const start = Date.now();
    await client.query(sql);
    const duration = Date.now() - start;

    const versionMatch = file.match(/^V(\d+)__(.+)\.sql$/);
    const version = versionMatch ? versionMatch[1] : rank.toString();
    const description = versionMatch ? versionMatch[2].replace(/_/g, ' ') : file;

    await client.query(`
      INSERT INTO flyway_schema_history 
      (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
      VALUES ($1, $2, $3, 'SQL', $4, 0, 'neon-setup', $5, true)
      ON CONFLICT (installed_rank) DO NOTHING;
    `, [rank, version, description, file, duration]);

    rank++;
  }

  const tablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log('\nCreated tables in Neon:');
  for (const row of tablesRes.rows) {
    console.log('  -', row.table_name);
  }

  await client.end();
  console.log('\nMigration to Neon completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
