# PostgreSQL 16 + pgvector (similaritate de text pentru review-uri false) + PostGIS (zone turistice, distanțe)
# Pornim de la imaginea pgvector (Debian bookworm); imaginile postgis/postgis sunt pe bullseye, al cărui depozit e arhivat.
FROM pgvector/pgvector:pg16
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
 && rm -rf /var/lib/apt/lists/*
COPY init.sql /docker-entrypoint-initdb.d/20-extensions.sql
