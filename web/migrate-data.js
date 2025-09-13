#!/usr/bin/env node
/**
 * Data Migration Script for Cloudflare D1
 * Exports data from SQLite airports.db to SQL format for D1 import
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const AIRPORTS_DB_PATH = '../airports.db';
const OUTPUT_FILE = './data-export.sql';

function exportData() {
  try {
    // Open the existing SQLite database
    const db = new Database(AIRPORTS_DB_PATH, { readonly: true });
    
    console.log('Connected to airports.db');
    
    // Get all addresses
    const addresses = db.prepare('SELECT * FROM address ORDER BY id').all();
    console.log(`Found ${addresses.length} address records`);
    
    // Get all airports
    const airports = db.prepare('SELECT * FROM airport ORDER BY id').all();
    console.log(`Found ${airports.length} airport records`);
    
    // Generate SQL export
    let sqlOutput = '-- Data export from airports.db to Cloudflare D1\n\n';
    
    // Export addresses
    sqlOutput += '-- Insert address data\n';
    for (const addr of addresses) {
      const values = [
        addr.id,
        escapeString(addr.country),
        escapeString(addr.region),
        escapeString(addr.municipality),
        escapeString(addr.country_name),
        escapeString(addr.region_name)
      ];
      
      sqlOutput += `INSERT INTO address (id, country, region, municipality, country_name, region_name) VALUES (${values.join(', ')});\n`;
    }
    
    sqlOutput += '\n-- Insert airport data\n';
    
    // Export airports in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < airports.length; i += batchSize) {
      const batch = airports.slice(i, i + batchSize);
      
      for (const airport of batch) {
        const values = [
          airport.id,
          escapeString(airport.ident),
          escapeString(airport.type),
          escapeString(airport.name),
          airport.latitude_deg || 'NULL',
          airport.longitude_deg || 'NULL',
          airport.elevation_ft || 'NULL',
          escapeString(airport.iso_country),
          escapeString(airport.iso_region),
          escapeString(airport.municipality),
          escapeString(airport.icao_code),
          escapeString(airport.iata_code),
          escapeString(airport.gps_code),
          escapeString(airport.local_code),
          escapeString(airport.home_link),
          escapeString(airport.wikipedia_link),
          escapeString(airport.keywords),
          airport.address_id || 'NULL'
        ];
        
        sqlOutput += `INSERT INTO airport (id, ident, type, name, latitude_deg, longitude_deg, elevation_ft, iso_country, iso_region, municipality, icao_code, iata_code, gps_code, local_code, home_link, wikipedia_link, keywords, address_id) VALUES (${values.join(', ')});\n`;
      }
      
      console.log(`Processed ${Math.min(i + batchSize, airports.length)} / ${airports.length} airports`);
    }
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, sqlOutput);
    console.log(`\nData exported successfully to ${OUTPUT_FILE}`);
    console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    
    db.close();
    
  } catch (error) {
    console.error('Error during data export:', error);
    process.exit(1);
  }
}

function escapeString(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  // Escape single quotes and wrap in quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Check if source database exists
if (!fs.existsSync(AIRPORTS_DB_PATH)) {
  console.error(`Error: Source database not found at ${AIRPORTS_DB_PATH}`);
  console.error('Please make sure airports.db exists in the parent directory.');
  process.exit(1);
}

console.log('Starting data migration from airports.db to Cloudflare D1 format...');
exportData();