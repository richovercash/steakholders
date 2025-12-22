-- Migration: Enable necessary extensions
-- Description: Set up required PostgreSQL extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Geolocation for proximity matching (optional - comment out if not needed)
CREATE EXTENSION IF NOT EXISTS "postgis";
