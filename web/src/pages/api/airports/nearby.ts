import type { APIRoute } from 'astro';
import { AirportDatabase } from '../../../lib/database';

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = 
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export const GET: APIRoute = async ({ request, locals }) => {
	try {
		const url = new URL(request.url);
		const searchParams = url.searchParams;
		
		const lat = parseFloat(searchParams.get('lat') || '');
		const lng = parseFloat(searchParams.get('lng') || '');
		const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
		const radius = Math.min(500, Math.max(1, parseInt(searchParams.get('radius') || '100'))); // km
		
		if (isNaN(lat) || isNaN(lng)) {
			return new Response(
				JSON.stringify({ error: 'Valid latitude and longitude are required' }),
				{ 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Validate coordinate ranges
		if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
			return new Response(
				JSON.stringify({ error: 'Invalid coordinate values' }),
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

		// Create database instance and find nearby airports
		const airportDb = new AirportDatabase(db);
		
		// Calculate bounding box for the search radius
		const latDelta = radius / 111; // Approximate km to degrees
		const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
		
		const bounds = {
			north: lat + latDelta,
			south: lat - latDelta,
			east: lng + lngDelta,
			west: lng - lngDelta,
			limit: limit * 3 // Get more airports to filter by distance
		};
		
		const allAirports = await airportDb.getAirportsInBounds(bounds);
		
		// Calculate distances and filter by radius
		const airportsWithDistance = allAirports
			.filter(airport => airport.latitude_deg !== null && airport.longitude_deg !== null)
			.map(airport => {
				const distance = calculateDistance(
					lat, lng,
					airport.latitude_deg!, airport.longitude_deg!
				);
				return { ...airport, distance };
			})
			.filter(airport => airport.distance <= radius)
			.sort((a, b) => a.distance - b.distance)
			.slice(0, limit);
		
		const airports = airportsWithDistance;
		
		return new Response(
			JSON.stringify({
				airports,
				total: airports.length,
				query: {
					lat,
					lng,
					radius,
					limit
				}
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
				}
			}
		);
		
	} catch (error) {
		console.error('Nearby airports error:', error);
		
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