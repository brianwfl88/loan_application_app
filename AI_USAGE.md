# AI Usage Report (`AI_USAGE.md`)

This document discloses the use of AI tools in accordance with the assessment instructions.

---

## 1. AI Tools Used

- **Antigravity AI (Google DeepMind Coding Assistant / Gemini 3.8 Flash)**:
  - Used as an interactive pair-programming assistant for project scaffolding, monorepo configuration, boilerplate generation, validation regex crafting, and architectural review.

---

## 2. Tasks Where AI Was Leveraged

1. **Monorepo Scaffolding & Configuration**:
   - Generating standard `tsconfig.base.json`, `nx.json`, and npm workspace configurations linking `apps/backend`, `apps/frontend`, and `libs/shared-types`.
2. **Malaysian Form Validation Regexes**:
   - Creating accurate regex patterns for Malaysian National Registration Identity Cards (NRIC 12-digit format `YYMMDD-PB-###G`) and Malaysian mobile/fixed telephone numbers (`^(\+?60|0)[1-9]\d{7,8}$`).
3. **Realistic 10,000+ Record Seed Script**:
   - Synthesizing representative Malaysian names (Malay, Chinese, Indian, East Malaysian distributions), valid state code matrices, realistic salary ranges, and realistic DSR credit distributions.
   - Crafting chunked bulk insertion queries (`createMany`) to ensure the 10,000 records seed into MySQL within seconds without memory exhaustion.
4. **Tailwind CSS Styling & RHB Theme Configuration**:
   - Generating the RHB banking palette (`#0054A6`, `#003366`, `#0072CE`, `#FFB81C`) and building responsive UI layouts with Lucide React icons and status pulse animations.

---

## 3. Suggestions Reviewed, Changed, or Rejected

### 1. Polling vs. WebSockets for Live Status Updates
- **Initial AI Suggestion**: Use polling (HTTP `GET /api/applications/my` every 3–5 seconds) from the React client.
- **Decision**: **Rejected polling in favor of WebSockets (Socket.IO)**.
- **Why**: The assessment explicit requirement states: *"Customers should see the outcome without manually refreshing the page."* While client polling could achieve this, WebSockets are vastly more performant and elegant for real-time banking notifications, avoiding unnecessary network chatter, reducing server load over 10,000 records, and offering true instant event dispatch the exact moment the credit decision completes.

---

### 2. Credit Check Processor Implementation (In-Process vs. BullMQ)
- **Initial AI Suggestion**: Introduce Redis and BullMQ immediately as a hard dependency in `docker-compose.yml`.
- **Decision**: **Modified to an asynchronous event-driven scheduler with configurable timing presets**.
- **Why**: Requiring a secondary Redis service would increase local dev setup overhead and potential friction during grading. Instead, we implemented a robust in-process asynchronous timeout scheduler with persistent MySQL status transitions and real-time WebSocket broadcasting. We kept the delay configurable via environment variables (`CREDIT_CHECK_MIN_DELAY_SEC` and `CREDIT_CHECK_MAX_DELAY_SEC`) and documented the trade-off of moving to BullMQ/Redis for clustered production scale in `README.md`.

---

### 3. Credit Check Decision Logic
- **Initial AI Suggestion**: Simply flip a coin (`Math.random() > 0.5`) to determine `Approved` vs `Rejected`.
- **Decision**: **Rejected simple random boolean; replaced with an authentic Debt Service Ratio (DSR) & credit scoring algorithm**.
- **Why**: Real core banking systems assess creditworthiness based on monthly income, requested loan amount, tenure, and simulated credit scores. We implemented realistic financial logic (calculating monthly installment at 5.5% interest, computing DSR, and checking if DSR <= 60% and credit score >= 560), providing meaningful decision explanations in the UI (e.g. *"Approved: DSR is 32.4% (within 60% threshold)"* or *"Declined: DSR exceeds 60% limit"*).

---

### 4. Database Seeding Approach
- **Initial AI Suggestion**: Loop through 10,000 records calling `prisma.loanApplication.create()` one by one.
- **Decision**: **Rejected individual insert; replaced with chunked batch `createMany` (1,000 records per chunk)**.
- **Why**: Individual inserts for 10,000 rows over TCP would take several minutes and potentially time out. Batch insertion in chunks of 1,000 reduces the execution time to under 4 seconds.
