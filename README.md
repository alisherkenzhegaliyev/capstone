# Capstone — Explainable AI for Clinical Decision Support

## Setup

### Before running the backend
The LIME explainer for the readmission model is stored as a zip archive due to file size:

```
tabular_models/case2/lime_config_case2.zip
```

Unzip it in place so the file `tabular_models/case2/lime_config_case2.pkl` exists before starting the backend.

### Backend
```bash
cd backend
source venv/Scripts/activate   # Windows Git Bash
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Backend API docs at **http://localhost:8000/docs**.
