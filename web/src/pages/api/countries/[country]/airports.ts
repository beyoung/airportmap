/**
 * API Route: Airports by Country
 * GET /api/countries/[country]/airports
 * 
 * Returns airports for a specific country
 * 
 * Query parameters:
 * - page: page number (default: 1)
 * - limit: results per page (default: 50, max: 200)
 * - type: filter by airport type
 */

import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../../lib/database';


export const GET: APIRoute = async ({ params, request }) => {
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

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const type = searchParams.get('type') || '';
    
    const airportDb = new AirportDatabase();
    const airports = await airportDb.getAirportsByCountry((country as string).toUpperCase());
    
    // Filter by type if specified
    let filteredAirports = airports;
    if (type.trim()) {
      filteredAirports = airports.filter(airport => 
        airport.type && airport.type.toLowerCase().includes(type.toLowerCase())
      );
    }
    
    // Apply pagination
    const total = filteredAirports.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAirports = filteredAirports.slice(startIndex, endIndex);
    
    // Add metadata
    const response = {
      airports: paginatedAirports,
      total,
      query: {
        country,
        type,
        page,
        limit
      },
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1
      }
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
        }
      }
    );
    
  } catch (error) {
    console.error('Country airports error:', error);
    
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
