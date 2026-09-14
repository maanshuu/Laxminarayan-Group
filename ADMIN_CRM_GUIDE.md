# Laxminarayan Group Admin CRM — Form-first controls

## Control rule
- **Save** creates or updates a record.
- **Clear / New** clears the active form without deleting saved records.
- **Refresh** reloads saved records from the persistent database and clears the active form where a form exists. It does not delete saved records.
- Saved records are displayed separately from data-entry forms. Use **Edit** to load a saved record into the form.

## Sections
- Overview: add/edit enquiries; saved enquiries are separate from the form.
- Leads: add/edit/delete leads; saved leads are read-only in the table.
- Site Visits: add/edit/delete site visits; customer selection auto-fills contact details.
- Projects: add/edit/activate/deactivate/delete projects and manage media.
- Team: add/edit/activate/deactivate/delete team members and reset passwords.
- Customers: view/edit/suspend/activate/delete customers; refresh closes an open profile editor.
- Reports: apply/clear date filters; refresh clears filters and reloads metrics.
- Audit Log: apply/clear filters; refresh clears filters and reloads history. Audit records are intentionally not editable/deletable.

The persistent database and media storage architecture is unchanged.
