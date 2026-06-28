# AGENTS.md

Rules for safe work in this repository:

- Do not run `git push` without explicit user permission.
- Do not create commits without explicit user permission.
- Do not delete files without user confirmation.
- Do not modify `.env` files, HAR files, tokens, cookies, or sensitive CSV files unless the user explicitly asks for it.
- Before making any changes, show a short plan.
- After changes, run `npm run build`.
- Before any commit, show `git diff` to the user.
- `public/scooters.csv` contains sensitive data. Do not publish new datasets without user confirmation.
- When changing `src/components/Map.tsx`, verify that Leaflet still creates markers and clusters.
