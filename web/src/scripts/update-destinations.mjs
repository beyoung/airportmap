#!/usr/bin/env node
/**
 * Generate SQL to update airport.destinations from pipeline/destinations.json
 * 1) Reads destinations.json (array of { departure_airport, direct_flights })
 * 2) Produces UPDATE statements setting airport.destinations = JSON
 *    matched by departure airport ICAO/IATA codes
 * 3) Writes SQL to web/update-destinations.sql
 */

import fs from 'fs';
import path from 'path';

const SRC_PATH = path.resolve(process.cwd(), '../pipeline/destinations.json');
const OUT_PATH = path.resolve(process.cwd(), './update-destinations.sql');
const BATCH_SIZE = 20; // number of UPDATE statements per part file
const MAX_INLINE_SQL_LEN = 50000; // max length for single UPDATE value
const CHUNK_SIZE = 5000; // length per chunk when appending

function escapeSqlString(str) {
  return String(str).replace(/'/g, "''");
}

function buildWhere(departure) {
  const clauses = [];
  const icao = (departure?.icao || '').trim();
  const iata = (departure?.iata || '').trim();
  if (icao) {
    clauses.push(`icao_code = '${icao.toUpperCase()}'`);
  }
  if (iata) {
    clauses.push(`iata_code = '${iata.toUpperCase()}'`);
  }
  if (clauses.length === 0) return '';
  return `WHERE ${clauses.join(' OR ')}`;
}

function generateSqlParts(data) {
  const statements = [];
  let count = 0;

  for (const item of data) {
    const departure = item?.departure_airport || {};
    const where = buildWhere(departure);
    if (!where) {
      continue; // skip if no codes
    }

    const jsonStr = JSON.stringify(item);
    if (jsonStr.length <= MAX_INLINE_SQL_LEN) {
      const escaped = escapeSqlString(jsonStr);
      statements.push(`UPDATE airport SET destinations = '${escaped}' ${where};`);
    } else {
      // initialize empty then append chunks to avoid oversized single statement
      statements.push(`UPDATE airport SET destinations = '' ${where};`);
      for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
        const chunk = jsonStr.slice(i, i + CHUNK_SIZE);
        const escapedChunk = escapeSqlString(chunk);
        statements.push(`UPDATE airport SET destinations = COALESCE(destinations, '') || '${escapedChunk}' ${where};`);
      }
    }
    count++;
  }

  // chunk into parts
  const parts = [];
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE).join('\n') + '\n';
    parts.push(chunk);
  }

  return { parts, count };
}

function main() {
  if (!fs.existsSync(SRC_PATH)) {
    console.error(`❌ Not found: ${SRC_PATH}`);
    process.exit(1);
  }
  let data;
  try {
    const raw = fs.readFileSync(SRC_PATH, 'utf8');
    data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error('destinations.json must be an array');
    }
  } catch (e) {
    console.error('❌ Failed to read/parse destinations.json:', e.message);
    process.exit(1);
  }

  const { parts, count } = generateSqlParts(data);

  // also write a monolithic file for reference/debugging (may be too big to execute remotely)
  const monolithic = `-- Update airport.destinations from destinations.json\n` + parts.join('');
  fs.writeFileSync(OUT_PATH, monolithic, 'utf8');

  // write part files
  const partPaths = [];
  parts.forEach((content, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    const partPath = path.resolve(process.cwd(), `./update-destinations.part-${num}.sql`);
    fs.writeFileSync(partPath, content, 'utf8');
    partPaths.push(partPath);
  });

  console.log(`✅ SQL written to ${OUT_PATH}`);
  console.log(`🧩 Part files: ${partPaths.length} (${BATCH_SIZE} updates per part)`);
  console.log(`📦 Statements generated: ${count}`);
  console.log('\nRun to apply parts:');
  console.log('  for f in ./update-destinations.part-*.sql; do wrangler d1 execute airports-db --remote --file="$f" || exit 1; done');
}

main();