import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Configuration from "./pages/Configuration";
import About from "./pages/About";
import Documentation from "./pages/Documentation";
import ApiTester from "./pages/ApiTester";
import Navigation from "./components/Navigation";
import { Toaster } from "./components/ui/toaster";
import { ProjectProvider } from "./core/projects/project.context";
import { RuntimeProvider } from "./core/runtime/runtime.store";
import { SessionProvider } from "./core/session/session.store";
import { loadProjectsV3 } from "./lib/projectManager";
import { ProjectV3 } from "./types/ProjectV3";

export default function App() {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjectsV3()
      .then(config => {
        setProjects(config.projects || []);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to load projects:", error);
        setProjects([]);
        setIsLoading(false);
      });
  }, []);

  return (
    <ProjectProvider>
      <SessionProvider>
        <RuntimeProvider projects={projects}>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-900">
              <Navigation />
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/api-tester" element={<ApiTester />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/config" element={<Configuration />} />
                <Route path="/about" element={<About />} />
                <Route path="/docs" element={<Documentation />} />
              </Routes>
              <Toaster />
            </div>
          </BrowserRouter>
        </RuntimeProvider>
      </SessionProvider>
    </ProjectProvider>
  );
}
