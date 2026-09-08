# DB toolbox for one-off maintenance commands (`db:restore`).
#
# The dev api/web containers run plain `oven/bun`, which has no Postgres client —
# and a `.sql.gz` dump can only be replayed by `psql` (it contains meta-commands
# like `COPY … FROM stdin` that the `pg` driver cannot execute). This image is
# just bun + that client, so the restore has both halves in one place.
FROM oven/bun:1.3.3

# Client 17, matching the postgres:17 server — NOT Debian's default 15. Recent
# pg_dump releases emit `\restrict` / `\unrestrict` meta-commands that an older
# psql rejects outright, so a version-behind client silently breaks restores.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && install -d /usr/share/postgresql-common/pgdg \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-17 \
  && apt-get purge -y curl gnupg && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
