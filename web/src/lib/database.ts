/**
 * Database utility functions for Cloudflare D1
 * Provides typed interfaces for airport data queries
 */

// Cloudflare D1 types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first(): Promise<any>;
  all(): Promise<{ results: any[] }>;
}

export interface Airport {
  id: number;
  ident: string;
  type: string | null;
  name: string | null;
  latitude_deg: number | null;
  longitude_deg: number | null;
  elevation_ft: number | null;
  iso_country: string | null;
  iso_region: string | null;
  municipality: string | null;
  home_link: string | null;
  wikipedia_link: string | null;
  keywords: string | null;
  address_id: number | null;
}

export interface Address {
  id: number;
  country: string;
  region: string | null;
  municipality: string | null;
  country_name: string | null;
  region_name: string | null;
}

export interface AirportWithAddress extends Airport {
  address?: Address;
}

export interface SearchResult {
  airports: AirportWithAddress[];
  total: number;
  page: number;
  limit: number;
}

export interface CountryStats {
  country: string;
  country_name: string | null;
  airport_count: number;
}

/**
 * Database class for handling D1 operations
 */
export class AirportDatabase {
  constructor(private db: D1Database) {}

  /**
   * Search airports by various criteria
   */
  async searchAirports({
    query = '',
    country = '',
    type = '',
    page = 1,
    limit = 20
  }: {
    query?: string;
    country?: string;
    type?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<SearchResult> {
    const offset = (page - 1) * limit;
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    
    // Build WHERE conditions
    if (query) {
      whereConditions.push(`(
        a.ident LIKE ? OR 
        a.name LIKE ? OR 
        a.municipality LIKE ? OR
        addr.country_name LIKE ?
      )`);
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (country) {
      whereConditions.push('(a.iso_country = ? OR addr.country_name = ?)');
      params.push(country, country);
    }
    
    if (type) {
      whereConditions.push('a.type = ?');
      params.push(type);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM airport a
      LEFT JOIN address addr ON a.address_id = addr.id
      ${whereClause}
    `;
    
    const countResult = await this.db.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // Get airports with pagination
    const dataQuery = `
      SELECT 
        a.*,
        addr.country,
        addr.region,
        addr.municipality as addr_municipality,
        addr.country_name,
        addr.region_name
      FROM airport a
      LEFT JOIN address addr ON a.address_id = addr.id
      ${whereClause}
      ORDER BY 
        CASE WHEN a.type = 'large_airport' THEN 1
             WHEN a.type = 'medium_airport' THEN 2
             WHEN a.type = 'small_airport' THEN 3
             ELSE 4 END,
        a.name
      LIMIT ? OFFSET ?
    `;
    
    const results = await this.db.prepare(dataQuery)
      .bind(...params, limit, offset)
      .all();
    
    const airports: AirportWithAddress[] = results.results?.map((row: any) => ({
      id: row.id,
      ident: row.ident,
      type: row.type,
      name: row.name,
      latitude_deg: row.latitude_deg,
      longitude_deg: row.longitude_deg,
      elevation_ft: row.elevation_ft,
      iso_country: row.iso_country,
      iso_region: row.iso_region,
      municipality: row.municipality,
      home_link: row.home_link,
      wikipedia_link: row.wikipedia_link,
      keywords: row.keywords,
      address_id: row.address_id,
      address: row.country ? {
        id: row.address_id,
        country: row.country,
        region: row.region,
        municipality: row.addr_municipality,
        country_name: row.country_name,
        region_name: row.region_name
      } : undefined
    })) || [];
    
    return {
      airports,
      total: Number(total),
      page,
      limit
    };
  }

  /**
   * Get airport by IATA/ICAO code
   */
  async getAirportByCode(code: string): Promise<AirportWithAddress | null> {
    const query = `
      SELECT 
        a.*,
        addr.country,
        addr.region,
        addr.municipality as addr_municipality,
        addr.country_name,
        addr.region_name
      FROM airport a
      LEFT JOIN address addr ON a.address_id = addr.id
      WHERE a.ident = ?
    `;
    
    const result = await this.db.prepare(query).bind(code.toUpperCase()).first();
    
    if (!result) return null;
    
    return {
      id: result.id,
      ident: result.ident,
      type: result.type,
      name: result.name,
      latitude_deg: result.latitude_deg,
      longitude_deg: result.longitude_deg,
      elevation_ft: result.elevation_ft,
      iso_country: result.iso_country,
      iso_region: result.iso_region,
      municipality: result.municipality,
      home_link: result.home_link,
      wikipedia_link: result.wikipedia_link,
      keywords: result.keywords,
      address_id: result.address_id,
      address: result.country ? {
        id: result.address_id,
        country: result.country,
        region: result.region,
        municipality: result.addr_municipality,
        country_name: result.country_name,
        region_name: result.region_name
      } : undefined
    };
  }

  /**
   * Get airports by country
   */
  async getAirportsByCountry(country: string, limit = 100): Promise<AirportWithAddress[]> {
    const query = `
      SELECT 
        a.*,
        addr.country,
        addr.region,
        addr.municipality as addr_municipality,
        addr.country_name,
        addr.region_name
      FROM airport a
      LEFT JOIN address addr ON a.address_id = addr.id
      WHERE a.iso_country = ? OR addr.country_name = ?
      ORDER BY 
        CASE WHEN a.type = 'large_airport' THEN 1
             WHEN a.type = 'medium_airport' THEN 2
             WHEN a.type = 'small_airport' THEN 3
             ELSE 4 END,
        a.name
      LIMIT ?
    `;
    const results = await this.db.prepare(query).bind(country, country, limit).all();
    
    return results.results?.map((row: any) => ({
      id: row.id,
      ident: row.ident,
      type: row.type,
      name: row.name,
      latitude_deg: row.latitude_deg,
      longitude_deg: row.longitude_deg,
      elevation_ft: row.elevation_ft,
      iso_country: row.iso_country,
      iso_region: row.iso_region,
      municipality: row.municipality,
      home_link: row.home_link,
      wikipedia_link: row.wikipedia_link,
      keywords: row.keywords,
      address_id: row.address_id,
      address: row.country ? {
        id: row.address_id,
        country: row.country,
        region: row.region,
        municipality: row.addr_municipality,
        country_name: row.country_name,
        region_name: row.region_name
      } : undefined
    })) || [];
  }

  /**
   * Get country statistics
   */
  async getCountryStats(): Promise<CountryStats[]> {
    const query = `
      SELECT 
        a.iso_country as country,
        addr.country_name,
        COUNT(*) as airport_count
      FROM airport a
      LEFT JOIN address addr ON a.address_id = addr.id
      WHERE a.iso_country IS NOT NULL
      GROUP BY a.iso_country, addr.country_name
      ORDER BY airport_count DESC
      LIMIT 50
    `;
    
    const results = await this.db.prepare(query).all();
    
    return results.results?.map((row: any) => ({
      country: row.country,
      country_name: row.country_name,
      airport_count: row.airport_count
    })) || [];
  }

  /**
   * Get airports within a bounding box (for map display)
   */
  async getAirportsInBounds({
    north,
    south,
    east,
    west,
    limit = 1000
  }: {
    north: number;
    south: number;
    east: number;
    west: number;
    limit?: number;
  }): Promise<Airport[]> {
    const query = `
      SELECT *
      FROM airport
      WHERE latitude_deg BETWEEN ? AND ?
        AND longitude_deg BETWEEN ? AND ?
        AND latitude_deg IS NOT NULL
        AND longitude_deg IS NOT NULL
      ORDER BY 
        CASE WHEN type = 'large_airport' THEN 1
             WHEN type = 'medium_airport' THEN 2
             WHEN type = 'small_airport' THEN 3
             ELSE 4 END
      LIMIT ?
    `;
    
    const results = await this.db.prepare(query)
      .bind(south, north, west, east, limit)
      .all();
    
    return results.results || [];
  }
}