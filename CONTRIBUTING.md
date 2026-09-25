# Contributing to Laxminarayan Group Portal

Thank you for contributing to Laxminarayan Group's digital platform! To maintain high code quality, security, and developer efficiency, we adhere to professional engineering standards.

---

## 1. Git Branching Strategy

We follow a structured Git-Flow branching model:

| Branch Type | Naming Format | Purpose | Base Branch |
| :--- | :--- | :--- | :--- |
| **Main** | `main` | Production-ready code. Must always be deployable. | — |
| **Develop** | `develop` | Integration branch for testing new features before release. | `main` |
| **Feature** | `feature/feature-name` | Developing a new feature or enhancement. | `develop` |
| **Bugfix** | `fix/bug-description` | Fixing bugs found in development/staging. | `develop` |
| **Hotfix** | `hotfix/critical-issue` | Urgent production fixes applied directly to `main`. | `main` |

---

## 2. Commit Message Standards (Conventional Commits)

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in present tense>

[optional body explaining motivation and context]

[optional footer referencing issue numbers, e.g. Fixes #12]
```

### Allowed Types:
- `feat`: A new feature for the user or system (e.g. `feat(crm): add dynamic unit type filter`).
- `fix`: A bug fix (e.g. `fix(auth): prevent session timeout during token refresh`).
- `docs`: Documentation changes only (e.g. `docs(readme): update API endpoint table`).
- `style`: Formatting changes that do not affect code logic (whitespace, semi-colons).
- `refactor`: Code reorganization without fixing bugs or adding features.
- `perf`: Performance improvements (e.g. `perf(images): compress hero banner assets`).
- `test`: Adding or correcting tests.
- `chore`: Maintenance tasks, package dependencies, configs (e.g. `chore(deps): upgrade express to 5.1`).

---

## 3. Pull Request (PR) Workflow

1. **Create your branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes**:
   - Write clean, well-commented code.
   - Never commit sensitive information or credentials.
3. **Verify locally**:
   ```bash
   npm test
   ```
4. **Push your branch to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request**:
   - Fill out the PR template completely.
   - Link any related GitHub issues.
   - Request code review before merging into `main` or `develop`.

---

## 4. Code Standards & Best Practices

- **Node.js**: Modern JavaScript (ES6+ / async-await), Node 22+.
- **Database**: Use parameterized queries (`db.prepare('...').get(param)`) to completely avoid SQL injection.
- **Security**: Sanitize inputs, enforce authentication middleware (`auth`, `admin`), and never log sensitive customer passwords.
