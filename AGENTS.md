# Laxminarayan Group CRM — Agent Operational Guidelines & Rules

## 1. Role-Based Access Control (RBAC) Governance — MANDATORY RULE
Whenever modifying, adding, or redesigning features, tabs, analytical views, or export options in `admin.html` or any dashboard file, the following role isolation boundaries MUST BE STRICTLY ENFORCED:

### A. Sales Funnel (`funnelView`), Pipeline BI, & Executive Dossiers
- **HR Role (`role === 'hr'`)**:
  - **STRICT QUARANTINE**: HR staff must ONLY have access to `teamView` (Team Directory) and `attendanceView` (Staff Attendance & Punch Logs).
  - HR must NEVER have access to: Sales Funnel (`funnelView`), Overview Command Center, Enquiries (`leadsView`), Units Matrix (`unitsView`), Bookings & Deals (`bookingsView`), Site Visits (`visitsView`), Projects Portfolio (`projectsView`), Customers (`customersView`), Reports (`reportsView`), or Activity History (`auditView`).
  - All such tabs must be added to `tabsToHide` for HR, and `showView()` must immediately redirect HR to `teamView`.

- **Builder / Partner Roles (`role === 'builder'` or `role === 'partner'`)**:
  - **RESTRICTED READ-ONLY**: Builders and Partners only have read-only visibility into their assigned project's unit inventory, masked enquiry counts, and site visit logs.
  - **NO SALES FUNNEL ACCESS**: Builders and Partners must NEVER have access to the Sales Funnel (`funnelView`), conversion drop-off rates, deal cohort explorers, or executive revenue dossiers.
  - Whenever a new strategic view or tab like `funnelView` is added:
    1. It MUST be added to `tabsToHide` in `applyRolePermissions()` for `isBuilder`.
    2. `showView(id)` must redirect to `overview` if a builder tries to open it.
    3. Tab click listeners must check `(isBuilderUser && b.dataset.view === 'funnelView')` and abort (`return;`).
    4. All export triggers (`.xls` Excel, PDF dossiers, `.csv` exports) must remain hidden from Builders.

---

## 2. Safe Production Workflow & User Consent
- Never push unapproved layout overhauls directly into production `admin.html` without first providing an interactive standalone demo (e.g., `demo-layout-switcher.html`) for the user to test and approve.
- Always validate JavaScript syntax across all inline `<script>` blocks in `admin.html` before committing (`node -e "new Function(...)"`).
- Maintain full backward compatibility for all existing element IDs, modals, customer drawers, cost sheets, and WhatsApp deep links.
