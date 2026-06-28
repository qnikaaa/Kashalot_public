# Ecoskat Backend Proxy

This folder is reserved for the safe backend proxy that will read online scooter data from the admin panel.

Do not commit real credentials, cookies, HAR files, tokens, or exported sensitive datasets.

Local setup:

1. Copy `server/.env.example` to `server/.env`.
2. Fill `ADMIN_USERNAME` and `ADMIN_PASSWORD` only in `server/.env`.
3. Keep `server/.env` out of git.

Planned endpoint:

```text
GET /api/scooters
```

The proxy should return only sanitized scooter fields needed by the map.
