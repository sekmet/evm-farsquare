-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE DATABASE evm_fsq_db;
CREATE SCHEMA IF NOT EXISTS public;

-- Create database user with appropriate permissions
CREATE ROLE evm_fsq_user WITH LOGIN SUPERUSER CREATEDB CREATEROLE PASSWORD 'evm_fsq_password';

-- (User already exists from environment, so we just grant permissions)
GRANT ALL PRIVILEGES ON DATABASE evm_fsq_db TO evm_fsq_user;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO evm_fsq_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO evm_fsq_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO evm_fsq_user;

ALTER USER evm_fsq_user WITH PASSWORD 'evm_fsq_password';

-- Set default search path
ALTER DATABASE evm_fsq_db SET search_path TO public, timescaledb;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'EVM Farsquare database initialized successfully';
END $$;
