# Project Sliver: Project Status & Architecture

## Core Vision
A premium, black-and-gold PDF reader that builds a 21-day reading habit by restricting daily page counts until "Freedom Mode" is unlocked.

## Current Tech Stack
- **Frontend:** React (Vite), Tailwind v4 (@theme variable setup), pdfjs-dist.
- **Backend:** Node.js + Express (cPanel compatible).
- **Database:** MySQL via Sequelize ORM.
- **Storage:** IndexedDB (PDF files), LocalStorage (Habit state).

## Data Schema (Anonymous Tracking)
- **User:** `device_id` (Primary Key), `createdAt`.
- **BookStats:** `id`, `device_id`, `book_title`, `event_type` (Enum), `timestamp`.

## Tracking Events
1. `upload_started`: Triggered on initial PDF load.
2. `daily_goal_reached`: Triggered when the user hits their page limit for the day.
3. `freedom_stage_reached`: Triggered on Day 22.

## Important Constraints
- No user accounts/passwords. Use browser-generated `device_id`.
- Maintain the "Editorial" aesthetic (Playfair Display/Inter).
- All PDF files remain local in IndexedDB; only stats are sent to the MySQL backend.