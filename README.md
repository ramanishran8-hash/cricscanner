# Cricscanner

A modern, dark-mode cricket companion built with TailwindCSS and Luxon. Cricscanner keeps fixtures organised across upcoming, live, and completed tabs while updating match states automatically in Eastern Time.

## Pages

- **`index.html`** – The live dashboard with glowing live badges, auto-refreshing status updates, and filtering tabs for upcoming, live, and completed fixtures.
- **`tournaments.html`** – Explore each tournament, view static points snapshots, and expand schedules to browse fixtures grouped by competition.
- **`private/admin.html`** – Manage tournaments and matches behind a password prompt. All data persists to `localStorage`, including edits, additions, and deletions.

## Features

- Luxon-powered ET time handling with minute-by-minute refreshes.
- Live badge animations and responsive cards tailored for mobile and desktop.
- Persistent storage with sensible default data that can be reset from the admin panel or reseeded from `/data/*.json` when empty.
- TailwindCSS CDN setup with a dark, neon-inspired palette.

## Getting started

No build step is required. Open any of the HTML files in a modern browser to explore the experience. Changes made via the admin dashboard are saved to your browser's `localStorage`.
