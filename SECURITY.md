# Security Policy

## Supported Versions

Only the latest release on the `main` branch receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 4.x.x   | :white_check_mark: |
| < 4.0   | :x:                |

---

## Reporting a Vulnerability

We take the security of Laxminarayan Group's platform and customer data seriously. If you discover a security vulnerability, please do **NOT** open a public issue.

Instead, please send an email directly to:
- **Security Contact**: `msinfraprojects2021@gmail.com`
- **Subject**: `[SECURITY VULNERABILITY REPORT] - Laxminarayan Group Web Portal`

Please include:
1. Type of issue (e.g. SQL injection, XSS, CSRF, broken access control).
2. Step-by-step instructions or proof of concept to reproduce the issue.
3. Affected endpoints or components.
4. Any potential mitigations or suggested fixes.

We will acknowledge receipt within 24 hours and provide an estimated timeline for remediation.

---

## Security Best Practices for Maintainers

1. **Never Commit Secrets**: Never commit `.env`, private keys, passwords, or production database files (`*.db`).
2. **Environment Variable Validation**: All sensitive credentials must be injected via runtime environment variables.
3. **Session Cookies**: Always ensure `HttpOnly; SameSite=Lax; Secure` flags are enabled in production environments.
4. **Regular Dependency Audits**: Run `npm audit` periodically to scan for vulnerable npm packages.
