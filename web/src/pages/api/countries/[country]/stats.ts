/**
 * API Route: Country Statistics
 * GET /api/countries/[country]/stats
 * 
 * Returns statistics for a specific country
 */

import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../../lib/database';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { country } = params;
    
    if (!country) {
      return new Response(
        JSON.stringify({ error: 'Country code is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get database from Astro locals
    const db = (locals as any).runtime?.env?.DB || (locals as any).DB;
    
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create database instance and get country stats
    const airportDb = new AirportDatabase(db);
    const stats = await airportDb.getCountryStatsByCode(country as string);
    
    if (!stats) {
      return new Response(
        JSON.stringify({ error: 'Country not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats
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
    console.error('Error fetching country stats:', error);
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