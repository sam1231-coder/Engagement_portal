# Humanly RESTful API Specification

The Humanly backend provides an interface on port 8080 supporting JSON request and response payloads with CORS headers enabled.

Protected endpoints require the client to supply an HTTP authorization header containing the active session bearer token:

```http
Authorization: Bearer <your_session_token>
```

---

Authentication Services

User Sign In Endpoint

The POST /api/auth/login route validates employee credentials against salted PBKDF2 database records.

Request parameters must include email and password. Upon successful verification, the server records an audit log entry and responds with an HTTP 200 status code containing the bearer token string, session expiration timestamp, and public profile data.

```json
{
  "email": "admin@humanly.io",
  "password": "Admin@2026!"
}
```

New Account Provisioning

The POST /api/auth/register route creates a new record in the users table, generating a distinct salt and hashed credential.

Expected parameters include name, email, password, and optional values for department, title, and initial role. The server returns an HTTP 201 status code with the newly generated session and user details.

Session Profile Inspection

The GET /api/auth/me route inspects the bearer token supplied in the authorization header and returns the validated profile data. An HTTP 401 code is returned if the token is absent, invalid, or expired.

Session Termination

The POST /api/auth/logout route revokes the active bearer token by deleting the corresponding record from the sessions table.

---

Workforce Management Services

Workforce Directory Listing

The GET /api/users route retrieves an array of registered workforce members, returning public fields including identifier, name, email, role, department, job title, avatar URL, and retention health metrics.

Administrative User Creation

The POST /api/users route enables administrators to provision new accounts. This endpoint is protected by role-based checks and returns an HTTP 403 status code if accessed by non-administrative users.

Role Modification

The PUT /api/users/:id/role route allows administrators to update the access level of a user between employee and admin. The server logs the event in the audit trail and returns the updated user record.

Account Deactivation

The DELETE /api/users/:id route deletes an employee record and cascades removal of associated sessions.

---

Review and Survey Services

Survey Listing

The GET /api/surveys route returns active, draft, and closed review campaigns, including total target headcount and real-time participation percentages.

Campaign Creation

The POST /api/surveys route allows administrators to launch new organizational pulse reviews. Payload fields include title, category, department, deadline, target headcount, and descriptive focus areas.

Feedback Submission

The POST /api/surveys/:id/respond route records confidential employee participation, accepting a 1 to 5 numerical rating, a 1 to 10 work-life score, and optional text commentary. The system automatically recalculates survey completion metrics upon submission.

---

Recognition and Collaboration Services

Kudos Wall Listing

The GET /api/kudos route delivers the fifty most recent peer appreciation cards, complete with sender details, recipient profile, core organizational value, badge, and emoji reaction tallies.

Recognition Submission

The POST /api/kudos route persists a new peer recognition post, accepting recipient name, recipient role, badge, core organizational value, and appreciation message.

Calendar Schedule Coordination

The GET /api/calendar and POST /api/calendar routes facilitate viewing and booking team events, one-on-one reviews, and cross-functional meetings with associated video conference links.

---

Administrative Telemetry and Auditing

Executive Overview Statistics

The GET /api/admin/stats route provides consolidated organizational metrics, covering active headcount, administrator ratios, review compliance, and departmental distributions.

Security Audit Logs

The GET /api/admin/audit-logs route returns recent security events, detailing timestamp, acting user email, event action, descriptive notes, and originating IP address.

Organizational Broadcasts

The POST /api/admin/broadcast route enables leadership to dispatch urgent announcements and company-wide notices.
