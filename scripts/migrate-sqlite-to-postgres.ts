/**
 * SQLite to PostgreSQL Data Migration Script
 *
 * This script migrates data from a local SQLite database to a PostgreSQL database (e.g., Neon).
 *
 * Prerequisites:
 * 1. Have the SQLite database file (prisma/dev.db) with existing data
 * 2. Have a PostgreSQL connection string ready
 * 3. Run `npx prisma db push` on the PostgreSQL database first to create the schema
 *
 * Usage:
 *   SQLITE_URL="file:./prisma/dev.db" DATABASE_URL="postgresql://..." npx tsx scripts/migrate-sqlite-to-postgres.ts
 *
 * Note: This script uses better-sqlite3 for reading SQLite synchronously.
 * Install it first: npm install better-sqlite3 @types/better-sqlite3 --save-dev
 */

import { PrismaClient as PostgresClient } from "@prisma/client";
import Database from "better-sqlite3";
import path from "path";

// Initialize PostgreSQL client
const postgres = new PostgresClient();

// Path to SQLite database
const sqliteDbPath = process.env.SQLITE_PATH || path.join(process.cwd(), "prisma", "dev.db");

interface SQLiteRow {
  [key: string]: unknown;
}

async function migrate() {
  console.log("Starting SQLite to PostgreSQL migration...\n");
  console.log(`SQLite path: ${sqliteDbPath}`);

  // Open SQLite database
  const sqlite = new Database(sqliteDbPath, { readonly: true });

  try {
    // Connect to PostgreSQL
    await postgres.$connect();
    console.log("Connected to PostgreSQL\n");

    // Migration order (respecting foreign key dependencies)
    const tables = [
      { name: "organization_type", model: "organizationType" },
      { name: "relationship_type", model: "relationshipType" },
      { name: "user", model: "user" },
      { name: "people", model: "people" },
      { name: "partner", model: "partner" },
      { name: "partner_role", model: "partnerRole" },
      { name: "relationship", model: "relationship" },
      { name: "connection", model: "connection" },
      { name: "event", model: "event" },
      { name: "event_response", model: "eventResponse" },
    ];

    for (const table of tables) {
      console.log(`Migrating ${table.name}...`);

      // Read all rows from SQLite
      const rows = sqlite.prepare(`SELECT * FROM ${table.name}`).all() as SQLiteRow[];
      console.log(`  Found ${rows.length} records`);

      if (rows.length === 0) continue;

      // Transform and insert each row
      for (const row of rows) {
        const data = transformRow(table.name, row);
        try {
          // @ts-expect-error - Dynamic model access
          await postgres[table.model].create({ data });
        } catch (error) {
          console.error(`  Error inserting row in ${table.name}:`, error);
          console.error("  Row data:", data);
          throw error;
        }
      }

      console.log(`  Migrated ${rows.length} records to PostgreSQL\n`);
    }

    console.log("Migration completed successfully!");

    // Verify counts
    console.log("\nVerification:");
    for (const table of tables) {
      // @ts-expect-error - Dynamic model access
      const count = await postgres[table.model].count();
      console.log(`  ${table.name}: ${count} records`);
    }
  } finally {
    sqlite.close();
    await postgres.$disconnect();
  }
}

function transformRow(tableName: string, row: SQLiteRow): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Handle special cases
    if (value === null || value === undefined) {
      data[camelKey] = null;
    } else if (isDateField(tableName, key) && typeof value === "number") {
      // SQLite stores dates as Unix timestamps (milliseconds)
      data[camelKey] = new Date(value);
    } else if (isDateField(tableName, key) && typeof value === "string") {
      // Or as ISO strings
      data[camelKey] = new Date(value);
    } else if (isBooleanField(tableName, key)) {
      // SQLite stores booleans as 0/1
      data[camelKey] = value === 1 || value === true;
    } else {
      data[camelKey] = value;
    }
  }

  return data;
}

function isDateField(tableName: string, fieldName: string): boolean {
  const dateFields: Record<string, string[]> = {
    people: ["created_at", "updated_at"],
    partner: ["created_at", "updated_at"],
    relationship: ["last_reviewed_date", "created_at", "updated_at"],
    connection: ["connection_date", "created_at"],
    event: ["event_date", "created_at"],
    event_response: ["response_date", "created_at"],
  };

  return dateFields[tableName]?.includes(fieldName) ?? false;
}

function isBooleanField(tableName: string, fieldName: string): boolean {
  const booleanFields: Record<string, string[]> = {
    people: ["is_connector"],
    event_response: ["is_public"],
  };

  return booleanFields[tableName]?.includes(fieldName) ?? false;
}

// Run migration
migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
