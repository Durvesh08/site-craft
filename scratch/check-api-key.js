import pg from 'pg';
import { decrypt } from '../artifacts/api-server/src/lib/encryption.js';

async function run() {
  const connectionString = "postgresql://postgres.izvikzftwhbujcpnjjfi:Durvesh0704@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM settings WHERE key = 'gemini_api_key';");
    console.log(`Found ${res.rowCount} settings rows.`);
    for (const row of res.rows) {
      console.log(`Row: user_id=${row.user_id}, category=${row.category}, is_encrypted=${row.is_encrypted}`);
      try {
        const val = row.is_encrypted ? decrypt(row.value) : row.value;
        console.log(`Value length: ${val.length}, prefix: ${val.slice(0, 7)}`);
      } catch (err) {
        console.log("Decryption failed:", err.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
