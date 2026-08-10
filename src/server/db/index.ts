/**
 * Database connection — Aiven PostgreSQL via Drizzle ORM
 * Requires DATABASE_URL in .env
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn(
    '[db] DATABASE_URL not set — server functions will fail. Run: cp .env.example .env && fill in credentials',
  )
}

// postgres.js client — handles connection pooling
const client = connectionString
  ? postgres(connectionString, {
      ssl: 'require',
      max: 10,
    })
  : null

// Drizzle ORM instance
export const db = client ? drizzle(client, { schema }) : null

/**
 * Helper: assert DB is connected. Throws if not.
 */
export function assertDb() {
  if (!db) {
    throw new Error(
      'Database not connected. Set DATABASE_URL in .env file. See .env.example for format.',
    )
  }
  return db
}
