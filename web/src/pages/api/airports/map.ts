/**
 * API Route: Map Data
 * GET /api/airports/map
 * 
 * Returns airports within a bounding box for map display
 * 
 * Query parameters:
 * - north, south, east, west: bounding box coordinates
 * - limit: maximum number of airports to return (default: 1000)
 */

import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../lib/database';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Get database from Cloudflare context
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

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Parse bounding box parameters
    const north = parseFloat(searchParams.get('north') || '90');
    const south = parseFloat(searchParams.get('south') || '-90');
    const east = parseFloat(searchParams.get('east') || '180');
    const west = parseFloat(searchParams.get('west') || '-180');
    const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') || '1000')));
    
    // Validate coordinates
    if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates provided' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (north <= south || east <= west) {
      return new Response(
        JSON.stringify({ error: 'Invalid bounding box' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create database instance and get airports
    const airportDb = new AirportDatabase(db);
    const airports = await airportDb.getAirportsInBounds({
      north,
      south,
      east,
      west,
      limit
    });
    
    // Convert to GeoJSON format for map display
    const geojson = {
      type: 'FeatureCollection',
      features: airports.map(airport => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [airport.longitude_deg, airport.latitude_deg]
        },
        properties: {
          id: airport.id,
          ident: airport.ident,
          name: airport.name,
          type: airport.type,
          municipality: airport.municipality,
          iso_country: airport.iso_country,
          elevation_ft: airport.elevation_ft
        }
      }))
    };
    
    return new Response(
      JSON.stringify({
        geojson,
        meta: {
          count: airports.length,
          bounds: { north, south, east, west },
          limit,
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
        }
      }
    );
    
  } catch (error) {
    console.error('Map data error:', error);
    
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