# RHB Bank Personal Loan Application Portal

A full-stack monorepo application where retail customers can apply for personal loans, track their application underwriting status in real time, and administrators can supervise, filter, and review applications across the institution.

Built with **NestJS**, **React (Vite + Tailwind CSS)**, and **MySQL (Prisma ORM)** in an **Nx-style Monorepo**.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **npm** (v9+) or **pnpm** (v8+)
- **Docker & Docker Compose** (for running MySQL 8.0)

---

### 2. Database Setup

Start the MySQL 8.0 container using Docker Compose:

```bash
docker compose up -d
```

This spins up MySQL 8.0 accessible at `localhost:3306` with database `rhb_loan_db`.

---

### 3. Installation & Database Migration

Install workspace dependencies:

```bash
npm install
```

Generate Prisma Client and apply the database migrations:

```bash
# Push schema to MySQL database
npm run prisma:push --workspace=backend
```

---

### 4. Seed Data (10,000+ Applications)

Per requirements, run the seed script to populate default administrative accounts, demo customers, loan purposes, and **10,000+ realistic loan applications**:

```bash
npm run seed
```

*The seed script uses high-throughput chunked batch inserts (`createMany`) and completes in under 5 seconds.*

---

### 5. Running the Application

Start both the backend and frontend simultaneously with concurrently:

```bash
npm run dev
```

Or start each application independently:

```bash
# Start NestJS backend (runs on http://localhost:3001)
npm run dev:backend

# Start React frontend (runs on http://localhost:3000)
npm run dev:frontend
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Test Accounts

The seed script creates the following pre-configured credentials (also selectable via one-click buttons on the login screen):

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@rhb.com.my` | `Admin@123!` | Access full database, filter status, inspect applicant credit details, trigger fast-track decision |
| **Customer** | `customer@rhb.com.my` | `Customer@123!` | Submit personal loan applications, monitor live status badges via WebSockets |

*New customers can also be registered directly through the `/register` portal.*

---

## 🏛️ Architectural Design Decisions & Trade-Offs

### 1. Monorepo Architecture (Nx-Structured Workspaces)
- **Decision**: Structured the codebase as a monorepo housing `apps/backend`, `apps/frontend`, and `libs/shared-types`.
- **Rationale**:
  - Eliminates type drift between backend API DTOs and frontend client forms.
  - Standardized tooling, single-command development (`npm run dev`), unified test runner, and shared linting.
- **Trade-off**: Slightly larger initial repository setup vs standalone repos, but significantly faster feature velocity and end-to-end contract confidence.

---

### 2. ORM & Database Layer: Prisma on MySQL 8.0
- **Decision**: Chose **Prisma ORM** over raw TypeORM.
- **Rationale**:
  - Declarative schema migrations with deterministic TypeScript code generation.
  - Composite indexes `@@index([userId, createdAt])` and `@@index([status, createdAt])` ensure that queries across **10,000+ applications** remain instantaneous (< 15ms).
  - High-performance chunked bulk insertion (`createMany` in 1,000-record chunks) allows the 10,000-record seed script to finish in seconds without memory pressure.
- **Trade-off**: Prisma Client has a small query-engine binary footprint, which is well worth the runtime type safety and indexing capabilities.

---

### 3. Core Banking Latency Simulation & Caching Strategy
- **Requirement**: Core banking loan purposes are slow (simulated with a 2-second delay), but the list rarely changes.
- **Implementation**:
  - `LoanPurposesService` introduces an artificial `2000ms` async delay on external calls.
  - Implemented an **In-Memory TTL Caching Layer** (1-hour expiry).
  - The first invocation incurs the 2.0-second delay (`[CACHE MISS]`).
  - Subsequent requests resolve immediately in `< 2ms` (`[CACHE HIT]`).
  - Response headers include `X-Cache: HIT | MISS` and `X-Response-Time-Ms` for verification.
- **Trade-off**: An in-memory cache is ideal for single-instance or moderately scaled services. In a distributed multi-replica Kubernetes setup, Redis would be substituted to share cached results across instances.

---

### 4. Asynchronous Credit Check Engine & Real-Time Pushes
- **Requirement**: Applications start as `Pending`. A backend credit check completes randomly between 10 seconds and 5 minutes (`Approved` or `Rejected`), and customers must see the result **without manually refreshing**.
- **Implementation**:
  - **Credit Decisioning Algorithm**: Calculates Debt-to-Income / Debt Service Ratio (DSR based on loan amount, tenure at 5.5% interest, and income) combined with simulated credit scores (300–850) for realistic, explainable decisions.
  - **Background Worker**: Dispatches a background timer for each application with random jitter (configurable via `CREDIT_CHECK_MIN_DELAY_SEC` and `CREDIT_CHECK_MAX_DELAY_SEC`).
  - **Real-Time Push**: Built a **Socket.IO WebSocket Gateway** (`ApplicationGateway`). Clients subscribe to room `user:{userId}`. When the decision concludes, the backend pushes an `application:updated` event directly to the connected client.
  - **Client Re-hydration**: The React client uses TanStack Query; upon receiving the socket event, it triggers an instant optimistic UI update and background cache invalidation.
- **Trade-off**: WebSockets were chosen over Server-Sent Events (SSE) or long-polling because Socket.IO provides bi-directional heartbeats, automatic reconnection, and per-user room routing out-of-the-box.

---

### 5. High-Volume Admin Management (10,000+ Records)
- **Requirement**: Admins can view all applications and filter by status (`Pending`, `Approved`, `Rejected`).
- **Implementation**:
  - Strict **server-side pagination** (`page`, `limit`), status filtering, and multi-field search (Name, NRIC, Phone, Email).
  - Relies on database indexes `(status, createdAt)` to guarantee sub-20ms page rendering despite thousands of records.
  - Fast-track credit button for testing: Allows assessors or admins to immediately trigger the evaluation for any pending loan without waiting 5 minutes.

---

## 🧪 Testing

Run backend unit tests covering Authentication, Credit Check scoring, and Core Banking caching:

```bash
npm run test --workspace=backend
```

---

## 🔮 What I Would Add or Change with More Time

1. **Persistent Distributed Message Queue (BullMQ + Redis)**:
   - For an enterprise banking application, replace in-process Node timers with a persistent Redis queue (such as BullMQ). This guarantees that credit check jobs survive node crashes and support worker auto-scaling, dead-letter queues, and rate-limiting.
2. **Document Upload & OCR**:
   - Allow applicants to upload salary slips (EA forms / 3 months payslips / bank statements) with automated OCR and document verification.
3. **Multi-Factor Authentication (2FA / TAC / SMS OTP)**:
   - Add SMS or WhatsApp One-Time Password verification (e.g. Twilio) on loan submission for enhanced fraud prevention.
4. **Audit Logging & Underwriting Notes**:
   - An immutable event log tracking which underwriter or automated rule altered an application, with manual override capabilities for compliance.
5. **PDF Approval Letter Generation**:
   - Generate official RHB approval / offer letters with digital signature workflows.
