import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Configuration from "./pages/Configuration";
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
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
