# Contributing to Humanly

Thank you for your interest in contributing to Humanly. This document outlines development guidelines and contribution workflows.

---

## Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-org/humanly.git
   cd humanly
   ```

2. **Verify Node.js Version**:
   - Ensure Node.js v20.0.0 or higher is installed (`node -v`).

3. **Start the Development Server**:
   ```bash
   npm start
   # or
   python server.py
   ```
   Open `http://localhost:8080` in your browser.

---

## Branching & Commit Guidelines

- Create focused feature branches from `main`:
  `git checkout -b feature/your-feature-name`
  or
  `git checkout -b fix/issue-description`
- Write clear, concise commit messages following conventional guidelines:
  - `feat: add new survey question type`
  - `fix: resolve mobile sidebar drawer tap target`
  - `docs: update API specification for user endpoints`

---

## Pull Request Process

1. Ensure code follows our natural solid color design system without artificial gradient effects.
2. Verify all syntax checks pass before opening a PR (`node -c <file>`).
3. Fill out the pull request template and request review from maintainers.
