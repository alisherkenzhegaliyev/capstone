import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import UploadForm from "./components/UploadForm";
import ClinicalPage from "./pages/ClinicalPage";

function HomePage() {
  return (
    <div className="bg-white min-h-screen">
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
        <Route path="/" element={<HomePage />} />
        <Route path="/clinical" element={<ClinicalPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
