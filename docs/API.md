# Humanly REST API Specification

The Humanly backend exposes a RESTful API on port `8080` (or `PORT` environment variable).

All protected routes require the HTTP header:
```http
Authorization: Bearer <your_session_token>
```

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a user against the database.
- **Request Body**:
  ```json
  {
    "email": "admin@humanly.io",
    "password": "Admin@2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "7a8f9c2d1e4b...",
    "expiresAt": "2026-11-26T10:19:34.000Z",
    "user": {
      "id": 1,
      "name": "Elena Rostova",
      "email": "admin@humanly.io",
      "role": "admin",
      "department": "Executive Operations",
      "title": "VP of People & Culture (Admin)",
      "avatar": "https://images.unsplash.com/..."
    }
  }
  ```

### `POST /api/auth/register`
Creates a new account in the database.
- **Request Body**:
  ```json
  {
    "name": "Jordan Smith",
    "email": "jordan.smith@humanly.io",
    "password": "SecurePassword123!",
    "role": "employee",
    "department": "Engineering",
    "title": "Full Stack Engineer"
  }
  ```

### `GET /api/auth/me`
Validates the current session token and returns the logged-in profile.

### `POST /api/auth/logout`
Invalidates and deletes the session token from the database.

---

## 2. Workforce & User Endpoints

### `GET /api/users`
Returns all registered workforce members.

### `POST /api/users` *(Admin Only)*
Creates a new workforce account.

### `PUT /api/users/:id/role` *(Admin Only)*
Modifies an employee's role (`admin` or `employee`).
- **Request Body**:
  ```json
  {
    "role": "admin"
  }
  ```

### `DELETE /api/users/:id` *(Admin Only)*
Deletes an account from the database.

---

## 3. Review & Survey Endpoints

### `GET /api/surveys`
Returns all active and closed review campaigns.

### `POST /api/surveys` *(Admin Only)*
Launches a new review campaign.
- **Request Body**:
  ```json
  {
    "title": "Q1 2027 Psychological Safety Review",
    "category": "Well-Being",
    "department": "Engineering",
    "total_target": 120,
    "description": "Quarterly survey on workload and team health."
  }
  ```

### `POST /api/surveys/:id/respond`
Submits an anonymous survey response.
- **Request Body**:
  ```json
  {
    "rating": 5,
    "balanceScore": 9,
    "comments": "Great squad alignment and async communication."
  }
  ```

---

## 4. Kudos & Recognition Endpoints

### `GET /api/kudos`
Returns the recent appreciation wall posts.

### `POST /api/kudos`
Posts peer recognition.
- **Request Body**:
  ```json
  {
    "recipient_name": "Maya Lin",
    "recipient_role": "Lead Product Designer",
    "badge": "🎨 Creative Spark",
    "core_value": "#Innovation",
    "message": "Outstanding work on the new UI interaction model!"
  }
  ```

---

## 5. Administrative Telemetry Endpoints

### `GET /api/admin/stats` *(Admin Only)*
Returns high-level workforce metrics, compliance ratios, and department breakdowns.

### `GET /api/admin/audit-logs` *(Admin Only)*
Returns the recent security and database audit logs.

### `POST /api/admin/broadcast` *(Admin Only)*
Pushes a company-wide announcement.
