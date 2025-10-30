# Cricscanner

A modern, dark-mode cricket companion built with TailwindCSS and Luxon. Cricscanner keeps fixtures organised across upcoming, live, and completed tabs while updating match states automatically in Eastern Time.

## Pages

- **`public/index.html`** – The live dashboard with glowing live badges, auto-refreshing status updates, and filtering tabs for upcoming, live, and completed fixtures.
- **`public/tournaments.html`** – Explore each tournament, view static points snapshots, and expand schedules to browse fixtures grouped by competition.
- **`private/admin.html`** – Manage tournaments and matches behind a password prompt. All data persists to `localStorage`, including edits, additions, and deletions.

## Features

- Luxon-powered ET time handling with minute-by-minute refreshes.
- Live badge animations and responsive cards tailored for mobile and desktop.
- Persistent storage with sensible default data that can be reset from the admin panel or reseeded from `/public/data/*.json` when empty.
- TailwindCSS CDN setup with a dark, neon-inspired palette.

## Getting started

No build step is required. Open any of the HTML files in a modern browser to explore the experience. Changes made via the admin dashboard are saved to your browser's `localStorage`.

### Environment-driven auto updates

Automated match syncing lives in `public/js/auto-updater.js`. Install dependencies with `npm install` and provide credentials in a local `.env` file before running the utility:

```
OPENAI_API_KEY=your_openai_key_here
CRICAPI_KEY=your_cricapi_key_here
```

From the project root you can trigger a refresh manually:

```
node public/js/auto-updater.js
```

The same helper is wired to the private admin console's **Sync Matches with AI** button and schedules itself to run every six hours. Environment variables are loaded with `dotenv`, so keep the `.env` file private (already ignored via `.gitignore`).

## Deployment notes

- Deploy the contents of `/public` to your static host (e.g., Vercel). This exposes only the public dashboard and tournaments explorer.
- Keep `/private` out of the deploy target so the password-gated admin panel remains inaccessible to regular visitors.
