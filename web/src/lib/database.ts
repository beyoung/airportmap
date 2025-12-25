import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface DestinationAirport {
  name: string;
  iata: string;
  icao: string;
}

export interface DestinationCity {
  city: string;
  airports: DestinationAirport[];
}

export interface Destinations {
  departure_airport: {
    name: string;
    iata: string;
    icao: string;
  };
  direct_flights: DestinationCity[];
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
  icao_code: string | null;
  iata_code: string | null;
  municipality: string | null;
  home_link: string | null;
  wikipedia_link: string | null;
  keywords: string | null;
  destinations: string | null;
  address_id: number | null;
  country_name: string | null;
  region_name: string | null;
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
  destinationsData?: Destinations;
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
  large_airport_count?: number;
  medium_airport_count?: number;
  small_airport_count?: number;
  heliport_count?: number;
  seaplane_base_count?: number;
  other_count?: number;
}

export class AirportDatabase {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const url =
        import.meta.env.SUPA_URL || import.meta.env.PUBLIC_SUPABASE_URL;
      const key =
        import.meta.env.SUPA_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error("Supabase configuration missing");
      }
      this.client = createClient(url, key, {
        auth: {
          persistSession: false,
        },
      });
    }
  }

  /**
   * Parse destinations JSON string
   */
  private parseDestinations(
    destinationsStr: string | null
  ): Destinations | undefined {
    if (!destinationsStr) return undefined;
    try {
      return JSON.parse(destinationsStr) as Destinations;
    } catch (e) {
      console.error("Failed to parse destinations JSON:", e);
      return undefined;
    }
  }

  /**
   * Search airports by various criteria
   */
  async searchAirports({
    query = "",
    country = "",
    type = "",
    page = 1,
    limit = 20,
  }: {
    query?: string;
    country?: string;
    type?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<SearchResult> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.client
      .from("airport")
      .select("*", { count: "exact" });

    if (query) {
      const search = `%${query}%`;
      queryBuilder = queryBuilder.or(
        [
          `iata_code.ilike.${search}`,
          `icao_code.ilike.${search}`,
          `name.ilike.${search}`,
          `municipality.ilike.${search}`,
          `country_name.ilike.${search}`,
        ].join(","),
      );
    }

    if (country) {
      const countryUpper = country.toUpperCase();
      queryBuilder = queryBuilder.or(
        [
          `iso_country.eq.${countryUpper}`,
          `country_name.ilike.%${country}%`,
        ].join(","),
      );
    }

    if (type) {
      queryBuilder = queryBuilder.eq("type", type);
    }

    const { data, error, count } = await queryBuilder
      .order("type_order", { ascending: true })
      .range(from, to);
    if (error) {
      throw error;
    }

    const airports: AirportWithAddress[] =
      data?.map((row: any) => ({
        id: row.id,
        ident: row.ident,
        type: row.type,
        name: row.name,
        latitude_deg: row.latitude_deg,
        longitude_deg: row.longitude_deg,
        elevation_ft: row.elevation_ft,
        iso_country: row.iso_country,
        iso_region: row.iso_region,
        icao_code: row.icao_code,
        iata_code: row.iata_code,
        municipality: row.municipality,
        home_link: row.home_link,
        wikipedia_link: row.wikipedia_link,
        keywords: row.keywords,
        destinations: row.destinations,
        address_id: row.address_id,
        country_name: row.country_name,
        region_name: row.region_name,
        address: undefined,
      })) || [];

    return {
      airports,
      total: Number(count || 0),
      page,
      limit,
    };
  }

  /**
   * Get airport by IATA/ICAO code
   */
  async getAirportByCode(code: string): Promise<AirportWithAddress | null> {
    const upperCode = code.toUpperCase();
    const { data, error } = await this.client
      .from("airport")
      .select("*")
      .or(
        [
          `ident.eq.${upperCode}`,
          `iata_code.eq.${upperCode}`,
          `icao_code.eq.${upperCode}`,
        ].join(","),
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      ident: data.ident,
      type: data.type,
      name: data.name,
      latitude_deg: data.latitude_deg,
      longitude_deg: data.longitude_deg,
      elevation_ft: data.elevation_ft,
      iso_country: data.iso_country,
      iso_region: data.iso_region,
      icao_code: data.icao_code,
      iata_code: data.iata_code,
      municipality: data.municipality,
      home_link: data.home_link,
      wikipedia_link: data.wikipedia_link,
      keywords: data.keywords,
      destinations: data.destinations,
      address_id: data.address_id,
      country_name: data.country_name,
      region_name: data.region_name,
      address: undefined,
      destinationsData: this.parseDestinations(data.destinations),
    };
  }

  /**
   * Get airports by country
   */
  async getAirportsByCountry(
    country: string,
    limit = 9,
    page = 0
  ): Promise<AirportWithAddress[]> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error } = await this.client
      .from("airport")
      .select("*")
      .eq("iso_country", country.toUpperCase())
      .order("type_order", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    return (
      data?.map((row: any) => ({
        id: row.id,
        ident: row.ident,
        type: row.type,
        name: row.name,
        latitude_deg: row.latitude_deg,
        longitude_deg: row.longitude_deg,
        elevation_ft: row.elevation_ft,
        iso_country: row.iso_country,
        iso_region: row.iso_region,
        icao_code: row.icao_code,
        iata_code: row.iata_code,
        municipality: row.municipality,
        home_link: row.home_link,
        wikipedia_link: row.wikipedia_link,
        keywords: row.keywords,
        destinations: row.destinations,
        address_id: row.address_id,
        country_name: row.country_name,
        region_name: row.region_name,
        address: undefined,
      })) || []
    );
  }

  /**
   * Get country statistics
   */
  async getCountryStats(): Promise<CountryStats[]> {
    const { data, error } = await this.client
      .from("country_stats")
      .select(
        "country_code,country_name,airport_count,large_airport_count,medium_airport_count,small_airport_count,heliport_count,seaplane_base_count,other_count",
      )
      .order("airport_count", { ascending: false });

    if (error) {
      throw error;
    }

    return (
      data?.map((row: any) => ({
        country: row.country_code,
        country_name: row.country_name,
        airport_count: row.airport_count,
        large_airport_count: row.large_airport_count || 0,
        medium_airport_count: row.medium_airport_count || 0,
        small_airport_count: row.small_airport_count || 0,
        heliport_count: row.heliport_count || 0,
        seaplane_base_count: row.seaplane_base_count || 0,
        other_count: row.other_count || 0,
      })) || []
    );
  }

  /**
   * Get statistics for a specific country
   */
  async getCountryStatsByCode(
    countryCode: string
  ): Promise<CountryStats | null> {
    const { data, error } = await this.client
      .from("country_stats")
      .select(
        "country_code,country_name,airport_count,large_airport_count,medium_airport_count,small_airport_count,heliport_count,seaplane_base_count,other_count",
      )
      .eq("country_code", countryCode.toUpperCase())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) return null;

    return {
      country: data.country_code,
      country_name: data.country_name,
      airport_count: data.airport_count,
      large_airport_count: data.large_airport_count || 0,
      medium_airport_count: data.medium_airport_count || 0,
      small_airport_count: data.small_airport_count || 0,
      heliport_count: data.heliport_count || 0,
      seaplane_base_count: data.seaplane_base_count || 0,
      other_count: data.other_count || 0,
    };
  }

  /**
   * Get airports within a bounding box (for map display)
   */
  async getAirportsInBounds({
    limit = 1000,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<Airport[]> {
    const from = offset;
    const to = offset + limit - 1;
    const { data, error } = await this.client
      .from("airport")
      .select("*")
      .range(from, to);

    if (error) {
      throw error;
    }

    return (data as Airport[]) || [];
  }

  /**
   * Get airports for sitemap generation (sequential pagination without bounds filtering)
   */
  async getAirportsWithPage({
    limit = 8000,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<Airport[]> {
    const from = offset;
    const to = offset + limit - 1;
    const { data, error } = await this.client
      .from("airport")
      .select("*")
      .range(from, to);

    if (error) {
      throw error;
    }

    return (data as Airport[]) || [];
  }
}
