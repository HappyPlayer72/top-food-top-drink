# PostgreSQL 16 + PostGIS (zone turistice, distanțe) + pgvector (similaritate de text pentru review-uri false)
FROM postgis/postgis:16-3.4
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-pgvector \
 && rm -rf /var/lib/apt/lists/*
COPY init.sql /docker-entrypoint-initdb.d/20-extensions.sql
