# Personal Budgeting App

Express + MongoDB + TypeScript app with JWT auth, transactions, budgets, and PDF/CSV reports.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# edit .env (set JWT_SECRET and MONGODB_URI)

# 3. Make sure MongoDB is running locally (or point MONGODB_URI to Atlas)

# 4. Dev
npm run dev

# 5. Open
# http://localhost:3000/signup
```

## Pages
- `/signup` – create account
- `/login` – sign in
- `/dashboard` – overview
- `/transactions` – add/list/delete transactions
- `/budgets` – per-category monthly budgets
- `/reports` – charts + PDF/CSV export

## API (all under `/api/v1`, JWT required except auth)
- `POST /auth/signup` `{ fullName, email, password }`
- `POST /auth/login` `{ email, password }` → `{ token, user }`
- `GET  /auth/me`
- `GET/POST/DELETE /finance/transactions[/:id]`
- `GET/POST/DELETE /budgets[/:id]?month=YYYY-MM`
- `GET /reports/summary|category-wise|chart-data|export/pdf|export/csv`

## Build for production
```bash
npm run build
npm start
```

## Notes / fixes in this version
- Auth-page links between signup ⇄ login now use relative `./login.html` / `./signup.html` so they work even before Express's pretty-route handlers run (previous `/login` link was failing in some setups).
- Removed stale duplicate source files that were sitting at the repo root (`Budget.ts`, `FinanceManager.ts`, `TransactionRepo.ts`, `budgetController.ts`, `budgetRoutes.ts`, `financeController.ts`, `financeRoutes.ts`, `reportController.ts`, `server.ts`, and the duplicated `*.html` copies). The canonical sources live in `src/` and `public/`.
- Added `.env.example`.
