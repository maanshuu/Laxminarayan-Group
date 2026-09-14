# Laxminarayan Group — Permanent Data Storage

This version is designed so application ZIP updates do **not** create a new SQLite database.

## Where the permanent data lives on Windows

`%APPDATA%\\LaxminarayanGroup\\data\\laxminarayan.db`

Project media lives at:

`%APPDATA%\\LaxminarayanGroup\\uploads\\projects`

Rolling database backups are kept at:

`%APPDATA%\\LaxminarayanGroup\\backups`

The server automatically imports an existing `data\\laxminarayan.db` and `uploads\\projects` from the project folder the first time this storage is initialized. After that, the persistent store is authoritative and future ZIP extractions cannot replace it with a blank database.

## Important

- Keep the persistent AppData folder on the computer hosting the website.
- Do not delete `%APPDATA%\\LaxminarayanGroup`.
- Future application ZIPs can be extracted into new folders without copying the database manually.
- The admin password is stored as a bcrypt hash in SQLite.
- Uploaded project media is kept outside the application folder so code updates do not remove it.
