# 🚀 CareerOS — Job Application Tracker

**A high-performance, terminal-themed Kanban board for managing the modern job search.** Built with a focus on speed, productivity, and professional aesthetics.

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

---

## ✨ Features

- **Terminal-Themed Kanban**: Drag-and-drop job applications through stages (Applied, Screening, Interview, Offer, Rejected).
- **Follow-up Reminder Engine**: Automated daily scans for "stale" applications (no activity in 7+ days) with snooze functionality.
- **Resume AI Scorer**: Compare job descriptions against your resume to generate a match score.
- **Command Bar interface**: Quick-action interface for power users.
- **JWT Authentication**: Secure user accounts with encrypted password storage.
- **Responsive Design**: Premium dark-mode aesthetic with glassmorphism and micro-animations.

---

## 🏗️ Architecture

```text
       [ FRONTEND ]                  [ BACKEND ]                 [ DATABASE ]
    React + Vite (SPA)    ────►    Node + Express    ────►     MongoDB Atlas
    (Hosted on Vercel)           (Hosted on Render)           (Cloud Cluster)
            ▲                            │
            └────────────────────────────┘
               REST API / JWT Auth / Cron
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas Account

### Local Setup (4 Commands)
```bash
# 1. Clone & Install
git clone https://github.com/your-username/job-tracker.git && cd job-tracker
npm run install-all  # Custom script to install client + server

# 2. Configure Environment
# Create /server/.env and /client/.env based on .env.example files

# 3. Start Development Server
npm run dev

# 4. Build for Production
npm run build
```

---

## 📡 API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create account & return JWT |
| `POST` | `/api/auth/login` | Authenticate & return JWT |
| `GET` | `/api/jobs` | Get all jobs (sorted by date) |
| `POST` | `/api/jobs` | Create new job application |
| `PATCH` | `/api/jobs/:id` | Update job fields (drag-drop) |
| `PATCH` | `/api/jobs/:id/snooze` | Snooze follow-up reminders |
| `GET` | `/api/reminders` | Fetch stale applications |

---

## 🛠️ Environment Variables

### Server (`/server/.env`)
| Variable | Description |
| :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | 64-character random string |
| `CLIENT_URL` | Frontend URL (for CORS) |
| `NODE_ENV` | `development` or `production` |

### Client (`/client/.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_API_BASE_URL` | Backend URL (e.g., Render URL) |

---

## 📦 Deployment Guide

### STEP 1 — MongoDB Atlas
1. Create a free M0 cluster.
2. Add a database user (keep credentials for the URI).
3. Whitelist IP `0.0.0.0/0` (required for Render's dynamic IPs).

### STEP 2 — Render (Backend)
1. New **Web Service** → Connect Repo.
2. Root Directory: `server`.
3. Build Command: `npm install`.
4. Start Command: `node src/index.js`.
5. Add all Server Env Vars listed above.

### STEP 3 — Vercel (Frontend)
1. Import Repo → Set Root Directory: `client`.
2. Framework: `Vite`.
3. Add Env Var: `VITE_API_BASE_URL` = (Your Render URL).

---

## 🧠 Skills Demonstrated

- **Full-stack Architecture**: Designing decoupled Client/Server systems.
- **RESTful API Design**: Building secure, scalable CRUD endpoints.
- **State Management**: Complex global state with **Zustand**.
- **Automated Workflows**: Implementing background tasks with **Node-Cron**.
- **Authentication**: Secure JWT implementation and password hashing with **Bcrypt**.
- **UX/UI Design**: Creating professional, high-performance interfaces without UI libraries.
- **CI/CD**: Configuring automated deployment pipelines with **GitHub Actions**.

---

Developed with ❤️ by [Your Name]
