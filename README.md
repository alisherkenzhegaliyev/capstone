# Capstone

FastAPI + React application for explainable clinical decision support. The app uses PostgreSQL for authentication and supports email/password sign-up, sign-in, and a mock 6-digit email verification step.

## Authentication

The frontend includes:

- Sign up with email and password
- Sign in with an existing verified account
- Email verification via a 6-digit code entry screen

For local development, no real email is sent. The backend accepts a deterministic 6-digit verification code based on the current date in `DDMMYY` format.

Examples:

- April 18, 2026 -> `180426`
- January 5, 2027 -> `050127`

The backend also seeds one verified account from environment variables on startup:

- `APP_LOGIN_EMAIL`
- `APP_LOGIN_PASSWORD`

If that seeded user already exists, startup updates its password hash to match the current environment value.

## Local Setup

### 1. Model files

The `backend/models/` folder is not tracked in git because of file size.

**Chest X-ray model (CheXNet):**
Download `model.pth.tar` from the [arnoweng/CheXNet releases](https://github.com/arnoweng/CheXNet) and place it at:

```bash
backend/models/chexnet.pth.tar
```

**Tabular models** should be placed at:

```text
backend/models/
├── chexnet.pth.tar
├── coronary/
│   ├── best_model_v2.pkl
│   ├── preprocessor.pkl
│   ├── shap_explainer.pkl
│   ├── lime_config.pkl
│   └── model_metadata_v2.json
└── readmission/
    ├── best_model_case2.pkl
    ├── preprocessor_case2.pkl
    ├── shap_explainer_case2.pkl
    ├── lime_config_case2.pkl
    └── model_metadata_case2.json
```

### 2. Docker Compose

Start the full stack with PostgreSQL:

```bash
docker compose up --build
```

Default login credentials from `docker-compose.yml`:

- Email: `dr.maya.kim@northstar-clinic.test`
- Password: `NorthstarDemo!2026`

Override them with environment variables before startup if needed.

You can either:

- Sign in with the seeded account above
- Create a new account from the UI and verify it with the date-based 6-digit code

### 3. Manual startup without Docker

Start PostgreSQL locally first.

If you installed PostgreSQL with Homebrew, use the version you actually have:

```bash
brew list | rg postgresql
brew services start postgresql@15
```

If this is the first run, create the app role and database:

```bash
createuser -s capstone
createdb -O capstone capstone
psql -d postgres -c "ALTER USER capstone WITH PASSWORD 'capstone';"
```

You can verify PostgreSQL is listening on `localhost:5432` with:

```bash
pg_isready -h localhost -p 5432
```

### 4. Manual backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://capstone:capstone@localhost:5432/capstone'
export APP_LOGIN_EMAIL='dr.maya.kim@northstar-clinic.test'
export APP_LOGIN_PASSWORD='NorthstarDemo!2026'
export JWT_SECRET='change-me-in-production'
./.venv/bin/python -m uvicorn app.main:app --reload
```

Notes:

- Use the project virtualenv when starting the backend. Running a different global `uvicorn` may fail if it does not have `psycopg` installed.
- If startup fails with a PostgreSQL connection error, make sure Postgres is actually running and reachable on `localhost:5432`.
- If startup says port `8000` is already in use, another backend instance is already running.

### 5. Manual frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend docs: `http://localhost:8000/docs`

Seeded login credentials:

- Email: `dr.maya.kim@northstar-clinic.test`
- Password: `NorthstarDemo!2026`

You can also create a new account from the sign-up page.
