# Laxminarayan Group — Enterprise Real Estate Portal & CRM

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20(WAL%20Mode)-blue.svg)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Hardened%20(Helmet%20%2B%20Bcrypt%20%2B%20JWT)-purple.svg)](SECURITY.md)
[![CI Status](https://img.shields.io/badge/CI-Automated%20Integrity%20Check-brightgreen.svg)](.github/workflows/ci.yml)

A high-performance, full-stack digital web portal and enterprise CRM designed specifically for **Laxminarayan Group** (Gujarat, India). Built with modern vanilla JavaScript, Express 5, and native Node.js SQLite with WAL (Write-Ahead Logging), this platform delivers lightning-fast load times, zero build lag, and an end-to-end CRM workflow for real estate operations.

---

## 🏛️ Live Projects Showcase

The platform features two flagship real estate developments:
1. **DS 208 (Developed by Akshar Group)**:
   - Location: Opp. Shreedhar Sparsh, S.P. Ring Road, Vastral, Ahmedabad, Gujarat (RERA: `PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/MAA11899/030623`).
   - Configurations: **2 BHK**, **3 BHK**, and **Ground Floor Commercial Shops**.
   - Floor Matrix: 10 floors, 14 residential units + 2 commercial shops (16 total units).
2. **Nilkanth Villa**:
   - Location: Near Kunj Mall / Raspan Corridor, Kanbha, Ahmedabad, Gujarat.
   - Configurations: **Type A (Luxury 4 BHK)**, **Type B (Corner 4 BHK)**, and **Type C (Presidential 5 BHK)**.
   - Floor Matrix: 7 exclusive private bungalow units.

---

## 🌟 Key Features & Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAXMINARAYAN WEB ECOSYSTEM                          │
├───────────────────────────────┬─────────────────────────────────────────────┤
│   PUBLIC PORTAL (CLIENTS)     │        ENTERPRISE CRM (ADMIN & STAFF)       │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ • Interactive Unit Showcase   │ • Speed-to-Lead Action Pulse Alerts         │
│ • Dynamic Configuration Filter│ • Visual Pipeline Kanban & Enquiry Tables   │
│ • Direct WhatsApp Booking Link│ • Real-Time Units Allocation Matrix (23)    │
│ • Site Visit Appointment Flow │ • Staff Attendance & Role-Based Access      │
│ • Brochure & Floor Plan PDFs  │ • Universal CSV/Excel Export Engine         │
│ • 100% Mobile Responsive UX   │ • Immutable Activity History & Audit Logs   │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

### 1. Public Customer Experience
- **Dynamic Configuration Filter**: Seamlessly filter project units by configuration (*2 BHK, 3 BHK, Shops, Type A, Type B, Type C*) without page reloads.
- **One-Click WhatsApp Integration**: Pre-populates inquiry messages directly to official sales representatives.
- **Site Visit Scheduling**: Real-time preferred time slot booking with automated email receipts.
- **Digital Allotment & Brochure Downloads**: Instant client PDF generation for brochures and reservation slips.

### 2. Enterprise CRM Command Center (`/admin.html`)
- **Real-Time KPI Strip**: Instant tracking of Total Enquiries, Active Pipeline, Site Visits, Available Units, and Bookings.
- **Units Matrix**: Visual grid representing unit occupancy (Open Allotment, Under Reservation, Acquired/Closed).
- **Dynamic Config Discovery**: Automatically discovers any new unit types (e.g. *Penthouse, Studio, 4 BHK, Type D*) dynamically from database records with zero code changes.
- **Role-Based Access Control**:
  - `admin`: Full unrestricted control over projects, units, pricing, team members, and audit logs.
  - `employee` / `advisor`: Field access for sales advisors to manage assigned leads and mark attendance.
  - `customer`: Public buyer profile with private enquiry history.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v22.5.0` or higher
- **npm**: `v10.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/maanshuu/Laxminarayan-Group.git
   cd Laxminarayan-Group
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   # Copy the sanitized template
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Customer Portal: [http://localhost:5000](http://localhost:5000)
   - Admin CRM: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port the server listens on | `5000` |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `development` |
| `TZ` | System timezone | `Asia/Kolkata` |
| `DB_FILE` | Fallback SQLite database path | `./data/laxminarayan.db` |
| `JWT_SECRET` | Secret key used for signing session tokens | *(Generate a 64+ char key)* |
| `ADMIN_EMAIL` | Default administrator login email | `admin@laxminarayangroup.com` |
| `ADMIN_PASSWORD`| Default administrator password | *(Set strong password)* |
| `FAST2SMS_API_KEY`| API key for Fast2SMS OTP delivery | *(Optional)* |
| `SMTP_HOST` | Outgoing email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Outgoing email server port | `465` |
| `SMTP_USER` | Email username / sender address | `msinfraprojects2021@gmail.com` |
| `SMTP_PASS` | Email app-specific password | *(16-character app password)* |
| `ADMIN_WHATSAPP_PHONE` | Official WhatsApp number for notifications | `916352000017` |

---

## 📊 Database Architecture & Data Persistence

The platform utilizes SQLite with **WAL mode** (`journal_mode = WAL`) and a **5000ms busy timeout** for optimal concurrency and crash-resilience.

### Enterprise Persistence
On Windows systems, production data is permanently stored outside the repository directory:
```
%APPDATA%\LaxminarayanGroup\
  ├── data\
  │   ├── laxminarayan.db       # Primary database
  │   ├── laxminarayan.db-wal   # Write-Ahead Log
  │   └── laxminarayan.db-shm   # Shared memory
  ├── backups\                  # Timestamped safety snapshots
  └── uploads\projects\         # Project media library
```
This guarantees that git pulls, code refactors, or new folder extractions never overwrite client and booking data.

---

## 📡 REST API Endpoints Overview

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status and Indian Standard Time (IST) heartbeat |
| `GET` | `/api/projects` | Public | List all active developments with unit counts |
| `GET` | `/api/projects/:id/units` | Public | List available floor units for a specific project |
| `POST`| `/api/enquiries` | Public / Customer | Submit an online inquiry or callback request |
| `POST`| `/api/auth/signup` | Public | Register new customer account |
| `POST`| `/api/auth/login` | Public | Authenticate via email/phone + password |
| `POST`| `/api/auth/logout` | Authenticated | Terminate session cookie |
| `GET` | `/api/admin/dashboard` | Admin | Real-time statistics, lead pipeline, and unit breakdown |
| `GET` | `/api/admin/leads` | Admin / Staff | List and filter CRM leads by status and priority |
| `PATCH`| `/api/admin/leads/:id` | Admin / Staff | Update follow-up dates, notes, and lead sentiment |
| `GET` | `/api/admin/employees` | Admin | Manage sales team members, credentials, and roles |
| `GET` | `/api/admin/audit-logs` | Admin | Immutable tamper-evident activity history |

---

## 🛠️ Developer Scripts

Run operational tasks via npm commands:

```bash
# Start production server
npm start

# Start development server with automatic file watching
npm run dev

# Run automated syntax and database integrity test
npm test

# Create an immediate safety backup of the database
npm run backup

# Reset database to a clean production state for fresh testing
npm run clean-slate
```

---

## 🤝 Contributing Guidelines

We follow a professional Git-Flow branching model and Conventional Commits.  
Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide before opening a Pull Request.

- **Main Branch**: `main` (Protected, production-ready).
- **Feature Branches**: `feature/<feature-name>`
- **Bug Fix Branches**: `fix/<bug-name>`
- **Commit Convention**: `feat:`, `fix:`, `docs:`, `perf:`, `refactor:`, `chore:`.

---

## 🔒 Security

For security vulnerability reporting and responsible disclosure, please refer to our [SECURITY.md](SECURITY.md) policy.

---

## 📄 License

This software is licensed under the [MIT License](LICENSE).  
Copyright © 2026 **Laxminarayan Group**. All rights reserved.
