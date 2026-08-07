import pg from 'pg';

async function run() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sitecraft";
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects';
    `);
    console.log("Projects table columns:", JSON.stringify(result.rows, null, 2));
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("Error connecting to database:", err);
    process.exit(1);
  }
}

run();
