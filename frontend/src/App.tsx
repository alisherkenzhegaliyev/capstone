import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import UploadForm from "./components/UploadForm";
import ClinicalPage from "./pages/ClinicalPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";


function HomePage() {
  const { logout, user } = useAuth();

  return (
    <div className="bg-white min-h-screen">
      <div className="fixed right-4 top-4 z-30 flex items-center gap-3 rounded-full border border-amber-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
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
          <UploadForm />
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
