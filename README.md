# <Project Name>

A real-time social media platform — feed, follow, like, comment, direct
messages, notifications. Built as a portfolio piece showcasing modern
full-stack development with WebSocket-based live updates.

> **About this project:** This is a 2026 ground-up rewrite of an earlier
> 2024 portfolio project. The original implementation is preserved at
> [social-media-api](https://github.com/ilhankazan/social-media-api) and
> [social-media-frontend](https://github.com/ilhankazan/social-media-frontend)
> for comparison. Read the [case study](docs/CASE-STUDY.md) for what
> changed and why.

[**🌐 Live demo**](<render-url>) · [**📐 Architecture**](docs/ARCHITECTURE.md)

---

## ✨ Features

- 🐦 **Microblog feed** — post, reply, like, dislike, comment
- 🔄 **Real-time updates** — new posts and reactions stream in over WebSocket without refresh
- 👥 **Follow system** — follow/unfollow, follow-based feed vs. global explore
- 💬 **Direct messages** — real-time 1:1 chat with read receipts
- 🔔 **Live notifications** — push-based via WebSocket, with unread badges
- 🖼️ **Image uploads** — profile, cover, post images via Cloudinary
- 🔐 **Auth** — JWT access + refresh, BCrypt password hashing, role-based access
- 🌓 **Dark mode** — system-aware with manual override

## 🛠 Stack

**Backend**
- Java 21 (LTS) · Spring Boot 3.4 · PostgreSQL 16 · Flyway
- Spring Security 6 · jjwt 0.12 · Spring WebSocket (STOMP)
- MapStruct · Lombok · Cloudinary · Bucket4j · springdoc-openapi
- Logback (JSON structured logging)

**Frontend**
- React 19 · TypeScript (strict) · Vite 6
- Tailwind CSS v4 · shadcn/ui · lucide-react
- TanStack Query v5 · Zustand · React Router 7
- React Hook Form + Zod · Axios · @stomp/stompjs · date-fns

**Infra**
- Docker (multi-stage) · Docker Compose · Render.com · GitHub Actions

## 🚀 Quick start (local)

Requires Docker and Node.js 20+.

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
cp .env.example .env
# Fill in JWT_SECRET (any 32+ byte string for local) and Cloudinary keys

# Start backend + database
docker compose up -d

# Start frontend
cd client
npm install
npm run dev
```

Open http://localhost:5173.

API runs at http://localhost:8080. Swagger UI at http://localhost:8080/swagger-ui.html.

## 📁 Project structure

```text
.
├── api/                  # Spring Boot backend
│   ├── src/main/java/com/ilhankazan/social/
│   │   ├── config/       # Spring config
│   │   ├── controller/   # REST + WebSocket handlers
│   │   ├── manager/      # Orchestration layer
│   │   ├── service/      # Business logic
│   │   ├── repository/   # JPA repositories
│   │   ├── entity/       # JPA entities
│   │   ├── dto/          # Request/response records
│   │   ├── security/     # JWT, filters
│   │   ├── event/        # Domain events
│   │   ├── websocket/    # Broadcasters
│   │   └── exception/    # Global exception handler
│   └── src/main/resources/
│       └── db/migration/ # Flyway migrations
├── client/               # React frontend
│   └── src/
│       ├── app/          # Layouts, providers
│       ├── routes/       # Router config
│       ├── features/     # Feature folders
│       ├── components/   # Shared components (incl. ui/ shadcn)
│       ├── hooks/
│       ├── lib/          # api, ws, utils
│       ├── stores/       # Zustand
│       └── types/        # API DTOs mirrored
├── docker-compose.yml
├── render.yaml
└── docs/
```

## 🧪 Testing

```bash
cd api && ./mvnw verify          # backend (Testcontainers Postgres)
cd client && npm run test        # frontend (Vitest)
```

## 📤 Deployment

Production runs on Render.com via `render.yaml`:
- API: Web Service (Docker)
- Client: Static Site (Vite build)
- DB: Managed Postgres

Push to `main` → GitHub Actions runs CI → Render auto-deploys.

## 🙏 Acknowledgements

Original 2024 version of this project taught me where the rough edges were.
Two repos preserved for context:
- [social-media-api](<old-backend-url>)
- [social-media-frontend](<old-frontend-url>)

## 📄 License

MIT
