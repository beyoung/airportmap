/**
 * API Route: Country Statistics
 * GET /api/countries/stats
 * 
 * Returns airport statistics by country
 */

import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../lib/database';

export const GET: APIRoute = async () => {
  try {
    const airportDb = new AirportDatabase();
    const stats = await airportDb.getCountryStats();
    
    return new Response(
      JSON.stringify({
        countries: stats,
        meta: {
          total_countries: stats.length,
          total_airports: stats.reduce((sum, country) => sum + country.airport_count, 0),
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      }
    );
    
  } catch (error) {
    console.error('Country stats error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
