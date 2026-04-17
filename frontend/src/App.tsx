import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Hero from "./components/Hero";
import UploadForm from "./components/UploadForm";
import ClinicalPage from "./pages/ClinicalPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import type { HistoryNavigationState } from "./types/history";


function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const selectedEntry = (location.state as HistoryNavigationState | null)?.selectedEntry;
  const initialXrayEntry = selectedEntry?.feature === "xray" ? selectedEntry : undefined;

  return (
    <div className="bg-white min-h-screen">
      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 rounded-full border border-amber-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
        <button
          onClick={() => navigate("/history")}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          History
        </button>
        <span className="text-xs font-medium text-slate-600">{user?.email}</span>
        <button
          onClick={logout}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          Log out
        </button>
      </div>
      <Hero />
      <div id="digital-inspector" className="relative min-h-screen">
        <div className="relative">
          <UploadForm initialEntry={initialXrayEntry} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/clinical" element={<ClinicalPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
