# Laxminarayan Group — Production Upgrade

## What is included
- Persistent authentication/database/media architecture retained from Persistent Master Final.
- CRM lead pipeline: new, contacted, qualified, site visit, negotiation, won, lost.
- Automatic lead creation from website enquiries.
- Team assignment and follow-up dates.
- Customer site-visit requests and admin confirmation/completion/cancellation.
- Project detail pages with location, price/range, amenities, gallery, interest registration and site-visit CTA.
- Admin project/media management.
- Team member account management.
- Reporting dashboard and conversion metrics.
- Audit log for important admin actions.
- Login/signup/enquiry/site-visit rate limiting.
- Security headers via Helmet, HttpOnly SameSite session cookie, bcrypt password hashing, server-side session invalidation.
- Responsive layouts for public pages, account and admin CRM.
- robots.txt and sitemap.xml.
- Rolling database backups outside the project folder.

## Persistent data — DO NOT MOVE
The ZIP intentionally contains no business database.

- Database: `%APPDATA%\\LaxminarayanGroup\\data\\laxminarayan.db`
- Project media: `%APPDATA%\\LaxminarayanGroup\\uploads\\projects`
- Backups: `%APPDATA%\\LaxminarayanGroup\\backups`

Future ZIP updates must be extracted over/alongside the application without copying a new `data` directory. The server migrates existing databases forward without replacing the persistent database.

## Production deployment checklist
1. Keep `.env` outside source control and replace development secrets with deployment-specific secrets.
2. Set `NODE_ENV=production` and use HTTPS.
3. Set `FRONTEND_URL` to the real site origin(s), not `*`.
4. Run `npm install` on the target machine with Node 22.x LTS.
5. Use a process manager/service for automatic restart.
6. Keep the persistent AppData directory backed up.
7. Put a reverse proxy/CDN in front of the Node server for public internet deployment.
8. Do not expose the admin credentials in documentation or source control.
