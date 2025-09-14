-- Cloudflare D1 Database Schema for Airport Data
-- Based on the existing airports.db structure

-- Create address table
CREATE TABLE IF NOT EXISTS address (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country TEXT NOT NULL,
    region TEXT,
    municipality TEXT,
    country_name TEXT,
    region_name TEXT,
    UNIQUE(country, region, municipality)
);

-- Create airport table
CREATE TABLE IF NOT EXISTS airport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ident TEXT NOT NULL UNIQUE,
    type TEXT,
    name TEXT,
    latitude_deg REAL,
    longitude_deg REAL,
    elevation_ft INTEGER,
    iso_country TEXT,
    iso_region TEXT,
    icao_code TEXT,
    iata_code TEXT,
    gps_code  TEXT,
    local_code TEXT,
    municipality TEXT,
    home_link TEXT,
    wikipedia_link TEXT,
    keywords TEXT,
    address_id INTEGER,
    FOREIGN KEY (address_id) REFERENCES address(id)
);

-- Create country_stats table
CREATE TABLE IF NOT EXISTS country_stats (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    airport_count INTEGER DEFAULT 0,
    large_airport_count INTEGER DEFAULT 0,
    medium_airport_count INTEGER DEFAULT 0,
    small_airport_count INTEGER DEFAULT 0,
    heliport_count INTEGER DEFAULT 0,
    seaplane_base_count INTEGER DEFAULT 0,
    other_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_airport_ident ON airport(ident);
CREATE INDEX IF NOT EXISTS idx_airport_name ON airport(name);
CREATE INDEX IF NOT EXISTS idx_airport_icao_code ON airport(icao_code);
CREATE INDEX IF NOT EXISTS idx_airport_iata_code ON airport(iata_code);
CREATE INDEX IF NOT EXISTS idx_airport_gps_code ON airport(gps_code);
CREATE INDEX IF NOT EXISTS idx_airport_local_code ON airport(local_code);
CREATE INDEX IF NOT EXISTS idx_country_stats_code ON country_stats(country_code);
CREATE INDEX IF NOT EXISTS idx_country_stats_name ON country_stats(country_name);