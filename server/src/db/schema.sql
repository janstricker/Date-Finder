-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Locations Table (The Grid Points)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(Point, 4326) NOT NULL, -- Lat/Lng point
    created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial Index for fast "Nearest Neighbor" queries
CREATE INDEX IF NOT EXISTS locations_geom_idx ON locations USING GIST (geom);

-- Daily Weather Data (Historical)
CREATE TABLE IF NOT EXISTS daily_weather (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Metrics required for WeatherStats and Runability
    temp_max REAL,
    temp_min REAL,
    temp_apparent_max REAL,
    precipitation_sum REAL,
    precipitation_hours REAL,
    wind_speed_max REAL,
    humidity_mean REAL,
    soil_moisture_mean REAL, -- For Mud Index
    
    UNIQUE(location_id, date)
);

-- Index for date queries (fetching specific years)
CREATE INDEX IF NOT EXISTS weather_date_idx ON daily_weather (date);
