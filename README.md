# Capstone — Explainable AI for Clinical Decision Support

## Setup

### 1. Get the model files (not included in this repo)
The `backend/models/` folder is not tracked in git due to file size. Request it from the team and place it at:
```
capstone-main/backend/models/
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
    ├── lime_config_case2.zip  ← unzip this to get lime_config_case2.pkl
    └── model_metadata_case2.json
```

> **Note:** `lime_config_case2.pkl` (151 MB) is shared as a zip. Unzip it in place before starting the backend.

### 2. Backend
```bash
cd backend
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Backend API docs at **http://localhost:8000/docs**.
