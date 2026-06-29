# Ecoskat Backend API

This folder contains the lightweight backend API helper that reads online scooter data for the map.

Do not commit real credentials, cookies, HAR files, tokens, or exported sensitive datasets.

Local setup:

1. Copy `server/.env.example` to `server/.env`.
2. Fill secrets only in `server/.env`.
3. Keep `server/.env` out of git.

Primary data source:

```text
GET https://ecoskat.bumerang.tech/api/v7/avaliableCars
```

Optional auth token must be passed through a header such as `x-api-key`, not in the URL.

Old admin proxy:

The old admin proxy code is no longer used by the app and is kept only as a reference while the API migration is being tested.

Local endpoint:

```text
GET /api/scooters
```

The API helper should return only sanitized scooter fields needed by the map.
