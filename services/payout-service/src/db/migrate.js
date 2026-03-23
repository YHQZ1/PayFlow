import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
import "dotenv/config";

const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("migrations complete");
await pool.end();
