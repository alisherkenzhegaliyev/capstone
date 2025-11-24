import Hero from "./components/Hero";
import UploadForm from "./components/UploadForm";
import { DotScreenShader } from "./components/DotScreenShader";

function App() {
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

export default App;
