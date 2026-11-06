#!/bin/sh
# Local/CI database roles. FAKE passwords, local use only. Real values live in Azure Key Vault.
# The Compose bootstrap user (postgres superuser) runs this once. Apps never use it.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE hostpointe_app NOLOGIN;
CREATE ROLE hostpointe_purge NOLOGIN;
-- Owner login: runs migrations. Not superuser. Owns the database.
CREATE ROLE hostpointe_owner LOGIN PASSWORD 'owner_local_only' CREATEROLE NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE hostpointe OWNER hostpointe_owner;
-- API login: member of hostpointe_app. No superuser, no ownership, no BYPASSRLS.
CREATE ROLE hostpointe_api LOGIN PASSWORD 'api_local_only' NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS IN ROLE hostpointe_app;
-- Purge job login: member of hostpointe_purge.
CREATE ROLE hostpointe_purge_job LOGIN PASSWORD 'purge_local_only' NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS IN ROLE hostpointe_purge;
SQL
