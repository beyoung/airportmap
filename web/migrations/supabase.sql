-- 表 1: address
CREATE TABLE address (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    country TEXT NOT NULL,
    region TEXT,
    municipality TEXT,
    country_name TEXT,
    region_name TEXT,
    UNIQUE(country, region, municipality)
);

-- 表 2: airport
CREATE TABLE airport (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ident TEXT NOT NULL UNIQUE,
    type TEXT,
    name TEXT,
    latitude_deg DOUBLE PRECISION,
    longitude_deg DOUBLE PRECISION,
    elevation_ft INTEGER,
    iso_country TEXT,
    iso_region TEXT,
    icao_code TEXT,
    iata_code TEXT,
    gps_code TEXT,
    local_code TEXT,
    municipality TEXT,
    home_link TEXT,
    wikipedia_link TEXT,
    keywords TEXT,
    address_id INTEGER,
    destinations TEXT,
    country_name TEXT,
    region_name TEXT,
    FOREIGN KEY (address_id) REFERENCES address(id)
);

-- 表 3: country_stats
CREATE TABLE country_stats (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    airport_count INTEGER DEFAULT 0,
    large_airport_count INTEGER DEFAULT 0,
    medium_airport_count INTEGER DEFAULT 0,
    small_airport_count INTEGER DEFAULT 0,
    heliport_count INTEGER DEFAULT 0,
    seaplane_base_count INTEGER DEFAULT 0,
    other_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- airport 表索引
CREATE INDEX idx_airport_ident ON airport(ident);
CREATE INDEX idx_airport_name ON airport(name);
CREATE INDEX idx_airport_icao_code ON airport(icao_code);
CREATE INDEX idx_airport_iata_code ON airport(iata_code);
CREATE INDEX idx_airport_gps_code ON airport(gps_code);
CREATE INDEX idx_airport_local_code ON airport(local_code);

-- country_stats 表索引
CREATE INDEX idx_country_stats_code ON country_stats(country_code);
CREATE INDEX idx_country_stats_name ON country_stats(country_name);

-- 条件排序索引（PostgreSQL 支持 CASE 表达式）
CREATE INDEX idx_airport_type_order ON airport (
  (CASE 
    WHEN type = 'large_airport' THEN 1
    WHEN type = 'medium_airport' THEN 2
    WHEN type = 'small_airport' THEN 3
    ELSE 4 
  END),
  name
);
