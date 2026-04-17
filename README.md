# Capstone

FastAPI + React application for explainable clinical decision support. The app now uses PostgreSQL for authentication and exposes a single seeded email/password login for access to the prediction flows.

## Login

There is no signup flow. One account is created from environment variables on backend startup:

- `APP_LOGIN_EMAIL`
- `APP_LOGIN_PASSWORD`

If the user already exists, startup updates that account's password hash to match the current environment value.

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

- Email: `doctor@example.com`
- Password: `changeme123`

Override them with environment variables before startup if needed.

### 3. Manual backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://capstone:capstone@localhost:5432/capstone'
export APP_LOGIN_EMAIL='doctor@example.com'
export APP_LOGIN_PASSWORD='changeme123'
uvicorn app.main:app --reload
```

### 4. Manual frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend docs: `http://localhost:8000/docs`
