# Contributing to Humanly

We welcome contributions from engineers, designers, and workplace culture advocates. This guide outlines our development philosophy, workflow conventions, and review procedures to ensure high code quality across the platform.

---

Getting Started with Development

To set up your local development environment, begin by cloning the repository to your workstation and moving into the root directory:

```bash
git clone https://github.com/your-org/humanly.git
cd humanly
```

Ensure you have a supported Node.js environment of version 20 or greater installed on your machine. You can start the server using npm start or python server.py. The application will immediately bind to port 8080 and initialize the local database file if it is not already present.

---

Branching Model and Commit Standards

Please base all new work on isolated branches created from main. Choose descriptive branch names that summarize the intent, such as feature/survey-export-enhancement or fix/auth-token-refresh.

Commit messages should convey the functional outcome clearly and professionally. We recommend the conventional commit structure, such as feat: support horizontal bar chart in studio, fix: handle session expiration gracefully, or docs: expand PostgreSQL setup guide.

---

Design System Principles

When crafting user interfaces, we adhere strictly to our natural solid palette without artificial gradients. All interactive elements should maintain high contrast and clear visual hierarchy.

Micro-interactions should remain formal and purposeful. Whenever adding new styles, verify that components look balanced across both dark and light display modes.

---

Submitting Contributions

Before submitting a pull request, ensure that all JavaScript files compile cleanly and that your changes preserve route protection across both employee and administrator roles.

Open your pull request against the main branch, complete the provided pull request template, and provide context regarding the problem solved and the verification steps taken. A maintainer will review your submission promptly.
