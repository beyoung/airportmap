-- Migration: Add destinations field to airport table
-- Date: 2024-10-30
-- Description: Adds a TEXT field to store direct flight destinations as JSON

ALTER TABLE airport ADD COLUMN destinations TEXT;
