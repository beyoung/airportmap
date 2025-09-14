#!/bin/bash

# Database Setup Script for Cloudflare D1
# This script initializes the local D1 database and imports data

set -e

echo "🚀 Setting up Cloudflare D1 database..."

# Create D1 database
echo "📦 Creating D1 database..."
# wrangler d1 create airports-db

# Apply schema
echo "🏗️  Applying database schema..."
wrangler d1 execute airports-db --local --file=./schema.sql

# Check if data export exists
if [ ! -f "./data-export.sql" ]; then
    echo "📊 Exporting data from airports.db..."
    node migrate-data.js
fi

# Import data (in smaller batches to avoid memory issues)
echo "📥 Importing airport data..."
if [ -f "./data-export.sql" ]; then
    # Split the large SQL file into smaller chunks if needed
    split -l 10000 data-export.sql data-chunk-
    
    for chunk in data-chunk-*; do
        echo "Importing $chunk..."
        wrangler d1 execute airports-db --local --file="$chunk"
    done
    
    # Clean up chunk files
    rm -f data-chunk-*
    
    echo "✅ Data import completed!"
else
    echo "❌ data-export.sql not found. Please run 'node migrate-data.js' first."
    exit 1
fi

# Verify the import
echo "🔍 Verifying database..."
wrangler d1 execute airports-db --local --command="SELECT COUNT(*) as airport_count FROM airport;"
wrangler d1 execute airports-db --local --command="SELECT COUNT(*) as address_count FROM address;"
wrangler d1 execute airports-db --local --command="SELECT COUNT(*) as country_stats_count FROM country_stats;"
wrangler d1 execute airports-db --local --command="SELECT country_code, airport_count, large_airport_count, medium_airport_count, small_airport_count, heliport_count, seaplane_base_count, other_count FROM country_stats LIMIT 5;"

echo "🎉 Database setup completed successfully!"
echo "💡 You can now run 'npm run dev' to start the development server."