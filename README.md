# PersonalManager — Backend API
**Student:** Charmy Vora | **Subject:** Backend Development & Database Connectivity

---

## 🛠 Tech Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken) |
| Password | bcryptjs (salt rounds: 12) |
| Config | dotenv |

---

## 📁 Project Structure
```
backend/
├── server.js              ← Entry point, middleware, route mounting
├── package.json
├── .env                   ← Environment variables (JWT_SECRET, PORT)
├── .env.example
├── db/
│   └── database.js        ← SQLite connection + schema init
├── middleware/
│   ├── auth.js            ← JWT protect + adminOnly guards
│   └── errorHandler.js    ← Global error handler + asyncHandler wrapper
└── routes/
    ├── auth.js            ← Register, Login, Profile
    ├── todos.js           ← To-Do CRUD
    ├── meals.js           ← Calorie/Meal CRUD
    ├── goals.js           ← Goals CRUD
    └── admin.js           ← Admin: list/delete users (role-based)
```

---

## ⚙️ Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env
# (edit JWT_SECRET in .env if needed)

# 3. Start server (production)
npm start

# 4. Start with auto-reload (development)
npm run dev
```

Server runs at: **http://localhost:5000**

---

## 🗄 Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| name | TEXT | required |
| email | TEXT UNIQUE | lowercase |
| password | TEXT | bcrypt hash |
| role | TEXT | 'user' or 'admin' |
| created_at | TEXT | datetime |

### todos
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users.id CASCADE |
| text | TEXT | min 3 chars |
| done | INTEGER | 0/1 boolean |
| priority | TEXT | high/medium/low |
| category | TEXT | Study/College/Health/… |
| created_at | TEXT | |

### meals
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users.id CASCADE |
| name | TEXT | |
| calories | INTEGER | positive |
| meal_time | TEXT | HH:MM |
| meal_type | TEXT | Breakfast/Lunch/… |
| meal_date | TEXT | YYYY-MM-DD |

### goals
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users.id CASCADE |
| title | TEXT | min 3 chars |
| description | TEXT | optional |
| progress | INTEGER | 0–100 |
| deadline | TEXT | YYYY-MM-DD |
| priority | TEXT | high/medium/low |
| goal_type | TEXT | short/long |

---

## 🔐 Authentication

All routes except `POST /api/auth/register` and `POST /api/auth/login` require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login → get token |
| GET | `/api/auth/me` | ✅ | Get my profile |
| PUT | `/api/auth/me` | ✅ | Update name/password |

### Todos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | List all (filter: `?priority=high&done=false&search=gym`) |
| POST | `/api/todos` | Create todo |
| GET | `/api/todos/:id` | Get one |
| PUT | `/api/todos/:id` | Update todo |
| PATCH | `/api/todos/:id/done` | Toggle done |
| DELETE | `/api/todos/:id` | Delete todo |
| DELETE | `/api/todos` | Delete all completed |

### Meals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meals` | List meals (`?date=2026-03-22`) |
| GET | `/api/meals/summary` | 7-day calorie summary |
| POST | `/api/meals` | Log meal |
| GET | `/api/meals/:id` | Get one |
| PUT | `/api/meals/:id` | Update meal |
| DELETE | `/api/meals/:id` | Delete meal |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List all (`?type=short`) |
| POST | `/api/goals` | Create goal |
| GET | `/api/goals/:id` | Get one |
| PUT | `/api/goals/:id` | Update goal |
| PATCH | `/api/goals/:id/progress` | Update progress % |
| DELETE | `/api/goals/:id` | Delete goal |

### Admin (role: admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users + stats |
| GET | `/api/admin/users/:id` | User + all their data |
| DELETE | `/api/admin/users/:id` | Delete user (cascades) |

---

## 📝 Sample Request / Response

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Charmy Vora",
  "email": "charmy@example.com",
  "password": "mypassword123"
}
```
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": 1, "name": "Charmy Vora", "email": "charmy@example.com", "role": "user" }
}
```

### Create Todo
```http
POST /api/todos
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Submit backend project",
  "priority": "high",
  "category": "College"
}
```
```json
{
  "success": true,
  "message": "Todo created.",
  "data": { "id": 1, "text": "Submit backend project", "done": false, "priority": "high" }
}
```

---

## 🔒 Security Features
- **JWT authentication** — stateless, 7-day expiry
- **bcrypt password hashing** — salt rounds: 12
- **Role-based access control** — user vs admin routes
- **Environment variables** — secrets in `.env`, never hardcoded
- **Input validation** — all routes validate and sanitise input
- **Foreign key cascades** — deleting user removes all their data
- **404 & error handlers** — consistent JSON error responses
