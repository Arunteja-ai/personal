# PersonalManager Backend — Setup & Screenshot Guide
**Student:** Charmy Vora | **Subject:** Backend Development & Database Connectivity

---

## Step 1 — Clone / Extract Project
```
personalmanager-backend/
├── server.js              ← Entry point
├── package.json           ← Dependencies
├── .env                   ← Environment variables
├── db/
│   └── database.js        ← SQLite schema + CRUD wrapper
├── middleware/
│   ├── auth.js            ← JWT protect + adminOnly
│   └── errorHandler.js    ← Global error handler
└── routes/
    ├── auth.js            ← Register, Login, Profile
    ├── todos.js           ← To-Do CRUD (7 endpoints)
    ├── meals.js           ← Calorie CRUD (6 endpoints)
    ├── goals.js           ← Goals CRUD (6 endpoints)
    └── admin.js           ← Admin panel (3 endpoints)
```

---

## Step 2 — Install & Start
```bash
npm install
node server.js
```

Expected output:
```
✅  Created new DB
✅  Schema ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  PersonalManager API
📦  Port     : 5000
🌍  Env      : development
🗄️  Database : SQLite → db/personalmanager.db
👤  Student  : Charmy Vora
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 3 — Test APIs with Postman

### 3.1 Register
- Method: POST
- URL: http://localhost:5000/api/auth/register
- Body (JSON):
```json
{
  "name": "Charmy Vora",
  "email": "charmy@gmail.com",
  "password": "charmy123"
}
```
- Response: 201 Created + JWT token

### 3.2 Login
- Method: POST
- URL: http://localhost:5000/api/auth/login
- Body (JSON):
```json
{
  "email": "charmy@gmail.com",
  "password": "charmy123"
}
```
- Copy the token from the response

### 3.3 Add Authorization Header
For all following requests:
- In Postman → Headers tab
- Add: `Authorization` = `Bearer <paste_token_here>`

### 3.4 Create To-Do
- Method: POST
- URL: http://localhost:5000/api/todos
- Body:
```json
{
  "text": "Submit backend project",
  "priority": "high",
  "category": "College"
}
```

### 3.5 List To-Dos (with filters)
- Method: GET
- URL: http://localhost:5000/api/todos?priority=high&done=false

### 3.6 Toggle Done
- Method: PATCH
- URL: http://localhost:5000/api/todos/1/done

### 3.7 Log a Meal
- Method: POST
- URL: http://localhost:5000/api/meals
- Body:
```json
{
  "name": "Dal Rice",
  "calories": 550,
  "meal_time": "13:00",
  "meal_type": "Lunch"
}
```

### 3.8 Get Calorie Summary (7 days)
- Method: GET
- URL: http://localhost:5000/api/meals/summary

### 3.9 Create Goal
- Method: POST
- URL: http://localhost:5000/api/goals
- Body:
```json
{
  "title": "Complete Full Stack Project",
  "description": "Submit before deadline",
  "progress": 70,
  "deadline": "2026-04-30",
  "priority": "high",
  "goal_type": "short"
}
```

### 3.10 Update Goal Progress
- Method: PATCH
- URL: http://localhost:5000/api/goals/1/progress
- Body:
```json
{ "progress": 100 }
```
- Response includes "🎉 Goal achieved!" message

---

## Step 4 — Validation Error Testing

### Missing fields
- POST /api/todos with body `{}` → 400 errors object
- POST /api/auth/register with short password → 400 error

### Unauthorized access
- GET /api/todos without Authorization header → 401 error

### Not found
- GET /api/todos/999 → 404 error

---

## Database Schema

Tables created automatically on first run:

| Table | Columns |
|-------|---------|
| users | id, name, email, password (bcrypt), role, created_at |
| todos | id, user_id (FK), text, done, priority, category, created_at |
| meals | id, user_id (FK), name, calories, meal_time, meal_type, meal_date |
| goals | id, user_id (FK), title, description, progress, deadline, priority, goal_type |

---

## Security Features Implemented
| Feature | Implementation |
|---------|---------------|
| Password hashing | bcryptjs, salt rounds = 10 |
| Authentication | JWT Bearer token, 7-day expiry |
| Role-based access | 'user' vs 'admin' middleware guard |
| Environment secrets | dotenv, JWT_SECRET in .env |
| Input validation | All routes validate and return specific errors |
| Error handling | Global errorHandler middleware, consistent JSON |
| 404 handling | Catches all unmatched routes |
