import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  const res = await client.query('SELECT id, name, pixel_code FROM projects LIMIT 5');
  console.log('Projects rows:', JSON.stringify(res.rows, null, 2));
  await client.end();
})();
