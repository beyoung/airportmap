/**
 * API Route: Airport Details
 * GET /api/airports/[code]
 * 
 * Returns detailed information for a specific airport by IATA/ICAO code
 */

import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../lib/database';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { code } = params;
    
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Airport code is required' }),
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

    // Create database instance and get airport
    const airportDb = new AirportDatabase(db);
    const airport = await airportDb.getAirportByCode(code as string);
    
    if (!airport) {
      return new Response(
        JSON.stringify({ 
          error: 'Airport not found',
          code: code
        }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        airport,
        meta: {
          code: code,
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
    console.error('Airport details error:', error);
    
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