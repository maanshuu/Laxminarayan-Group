# Laxminarayan Group — structured backend

This version implements the real authentication/account flow and keeps the database ready for future CRM modules.

## What is implemented

### Customer
- Sign up with name plus email and/or phone.
- Passwords are hashed with bcrypt (12 rounds); plaintext passwords are never stored.
- Login works with email **or** phone.
- Authentication uses an `HttpOnly` session cookie rather than storing the JWT in localStorage.
- Suspended accounts cannot log in.
- Customer dashboard shows the user's account and enquiries.

### Admin
- Admin account is seeded from environment variables.
- Admin routes require a signed JWT session and `role=admin`.
- Admin can see name, email, phone, role, account status and registration date.
- New registrations appear automatically through dashboard polling every 10 seconds.
- Admin can activate/suspend accounts (but cannot suspend the current admin account).
- Enquiries can be tracked as new/contacted/closed.

### Extensible database
The schema already contains:
- `users`
- `projects`
- `leaders`
- `enquiries`
- `leads`
- `bookings`
- `employees`

These are intentionally separate so future modules can be added without replacing the authentication system.

## Setup

Requirements: Node.js 20+ and npm.

1. Copy `.env.example` to `.env`.
2. Generate a long random `JWT_SECRET` (at least 32 characters).
3. Set a strong `ADMIN_PASSWORD`.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open the website at `http://localhost:5000`.

The SQLite database is created under `data/` automatically.

## Environment

```env
PORT=5000
FRONTEND_URL=http://localhost:5000
DB_FILE=./data/laxminarayan.db
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@laxminarayangroup.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
NODE_ENV=development
```

For production:
- use HTTPS;
- set `NODE_ENV=production`;
- set `FRONTEND_URL` to the exact allowed frontend origin(s);
- use a strong secret stored in the hosting provider's secret manager;
- never commit `.env` or the SQLite database;
- back up the database and restrict server filesystem/database access.

## API

Public:
- `GET /api/health`
- `GET /api/site`
- `GET /api/projects`
- `GET /api/leaders`
- `POST /api/enquiries`

Authentication:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/my/enquiries`

Admin:
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/status`
- `GET /api/admin/enquiries`
- `PATCH /api/admin/enquiries/:id`
- existing project management routes

## Important migration note

The server runs the current `schema.sql` on startup and includes a small compatibility migration for older databases that are missing `users.status`, `users.updated_at`, or `enquiries.user_id`.

Do not delete a production database just to apply the new schema.

## Architecture direction

For the next phase, keep authentication/authorization independent from business modules:

```text
users / employees
       |
       +---- leads
       +---- enquiries
       +---- bookings ---- projects
       +---- future payments / documents / tasks
```

When the system grows, these routes can be split into modules such as `routes/auth`, `routes/admin`, `routes/leads`, `routes/bookings`, and `routes/employees` without changing the customer login model.
PROJECT PORTFOLIO UPDATE
- The homepage now has four clickable project categories: Signature Homes, Prime Spaces, Future Landmarks and Industrial Properties.
- Each category opens project-category.html and shows only projects from that category.
- Project-category details require an authenticated account. Unauthenticated clicks are sent to login and returned to the requested category after successful customer login.
- New project imagery is bundled locally under assets/.


PROJECT IMAGES: In Admin > Manage projects, use the new file picker to choose a JPG, PNG, WEBP, or GIF from your device (max 8 MB). You can still enter an image path/URL instead.


IMPORTANT — DATA PERSISTENCE
This version uses a permanent Windows storage location outside the extracted project folder:
%APPDATA%\LaxminarayanGroup\data\laxminarayan.db
Project media is stored in %APPDATA%\LaxminarayanGroup\uploads\projects.
On first run, the server automatically imports the existing database from this project or the newest sibling Laxminarayan project folder when available. After initialization, future ZIP updates use the same permanent database and media store. Do NOT delete %APPDATA%\LaxminarayanGroup.

Future updates can be extracted into new folders without manually copying the database.

PRODUCTION CRM UPGRADE
======================
This build keeps the Persistent Master storage architecture. Business data remains in:
%APPDATA%\LaxminarayanGroup\data\laxminarayan.db
Media remains in:
%APPDATA%\LaxminarayanGroup\uploads\projects
Backups remain in:
%APPDATA%\LaxminarayanGroup\backups

Added modules:
- CRM lead pipeline with status, assignment, notes and follow-up dates
- Automatic lead creation from website enquiries
- Site-visit request workflow for signed-in customers
- Admin site-visit confirmation/completion/cancellation workflow
- Team member account creation and activation/deactivation
- Project detail pages with gallery, location, price and amenities
- Admin reporting dashboard and conversion metrics
- Admin audit log
- Basic public endpoint rate limiting
- Production-oriented robots.txt and sitemap.xml

IMPORTANT: Do not copy a data folder between ZIP versions. The database and uploaded media are intentionally stored outside the project folder so future updates keep the same business data.
