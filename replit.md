# Wataru API

## Overview
A REST API documentation portal built with Express.js. Provides various API endpoints (anime info, Spotify downloads, TikTok downloads, YouTube search, etc.) with a web-based documentation UI.

## Architecture
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js
- **Port**: 5000
- **Frontend**: Static HTML served from `web/` directory with Tailwind CSS (CDN)

## Project Structure
- `index.js` - Main Express server entry point
- `api/` - API route modules (each exports meta + onStart)
- `web/` - Static frontend files (HTML pages, assets)
- `settings.json` - App configuration (name, links, notifications)
- `vercel.json` - Original Vercel deployment config (not used on Replit)

## Key Endpoints
- `/` - Portal landing page
- `/docs` - API documentation page
- `/api/info` - API metadata endpoint
- `/api/*` - Various API routes loaded dynamically from `api/` folder
