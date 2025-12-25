/**
 * API Route: Airport Search
 * GET /api/airports/search
 * 
 * Query parameters:
 * - q: search query (airport code, name, city)
 * - country: filter by country code or name
 * - type: filter by airport type
 * - page: page number (default: 1)
 * - limit: results per page (default: 20, max: 100)
 */

import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../lib/database';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const query = searchParams.get('q') || '';
    const country = searchParams.get('country') || '';
    const type = searchParams.get('type') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    
    const airportDb = new AirportDatabase();
    const results = await airportDb.searchAirports({
      query: query.trim(),
      country: country.trim(),
      type: type.trim(),
      page,
      limit
    });
    
    // Add metadata
    const response = {
      ...results,
      query: {
        q: query,
        country,
        type,
        page,
        limit
      },
      pagination: {
        current_page: page,
        total_pages: Math.ceil(results.total / limit),
        has_next: page * limit < results.total,
        has_prev: page > 1
      }
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );
    
  } catch (error) {
    console.error('Airport search error:', error);
    
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
