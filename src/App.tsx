import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Configuration from "./pages/Configuration";
import About from "./pages/About";
import Documentation from "./pages/Documentation";
import Navigation from "./components/Navigation";
import { Toaster } from "./components/ui/toaster";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<Documentation />} />
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
