import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Globe, AlertCircle } from "lucide-react";
import { ProjectV3 } from "@/types/ProjectV3";
import { loadProjectsV3 } from "@/lib/projectManager";
import { useToast } from "@/components/ui/use-toast";

type TestStatus = "idle" | "testing" | "success" | "error";

interface ApiTestResult {
  endpoint: string;
  status: TestStatus;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  data?: any;
}

interface ProjectApiTests {
  projectId: string;
  projectName: string;
  backendUrl: string;
  tests: ApiTestResult[];
}

export default function ApiTester() {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [testResults, setTestResults] = useState<Map<string, ProjectApiTests>>(new Map());
  const [testingAll, setTestingAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const loaded = await loadProjectsV3();
      setProjects(loaded);
      
      // Initialiser les résultats de test
      const initialResults = new Map<string, ProjectApiTests>();
      loaded.forEach((project) => {
        if (project.backendPath && project.ports?.backend) {
          const backendUrl = `http://localhost:${project.ports.backend}`;
          initialResults.set(project.id, {
            projectId: project.id,
            projectName: project.name,
            backendUrl,
            tests: [
              { endpoint: "Health Check", status: "idle" },
              { endpoint: "API Status", status: "idle" },
              { endpoint: "Users Endpoint", status: "idle" },
            ],
          });
        }
      });
      setTestResults(initialResults);
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de charger les projets: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        variant: "destructive",
      });
    }
  };

  const testEndpoint = async (
    project: ProjectV3,
    endpoint: string,
    url: string
  ): Promise<ApiTestResult> => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes timeout
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      let data = null;
      try {
        data = await response.json();
      } catch {
        // Pas de JSON, c'est OK
      }
      
      return {
        endpoint,
        status: response.ok ? "success" : "error",
        statusCode: response.status,
        responseTime,
        data: data ? JSON.stringify(data).substring(0, 200) : null,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint,
        status: "error",
        responseTime,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  };

  const testProjectApi = async (project: ProjectV3) => {
    if (!project.backendPath || !project.ports?.backend) {
      toast({
        title: "Erreur",
        description: `Le projet ${project.name} n'a pas de backend configuré`,
        variant: "destructive",
      });
      return;
    }

    const backendUrl = `http://localhost:${project.ports.backend}`;
    const projectResults = testResults.get(project.id);
    
    if (!projectResults) return;

    // Mettre à jour le statut à "testing"
    const updatedResults = {
      ...projectResults,
      tests: projectResults.tests.map((t) => ({ ...t, status: "testing" as TestStatus })),
    };
    setTestResults(new Map(testResults.set(project.id, updatedResults)));

    // Tests pour Payload CMS
    const endpoints: { name: string; path: string }[] = [];
    
    if (project.backendType === "payload") {
      endpoints.push(
        { name: "Health Check", path: "/health" },
        { name: "API Status", path: "/api" },
        { name: "Users Endpoint", path: "/api/users" }
      );
    } else {
      // Pour Directus ou autres
      endpoints.push(
        { name: "Health Check", path: "/health" },
        { name: "API Status", path: "/server/health" }
      );
    }

    // Exécuter les tests
    const testPromises = endpoints.map(({ name, path }) =>
      testEndpoint(project, name, `${backendUrl}${path}`)
    );

    const results = await Promise.all(testPromises);

    // Mettre à jour les résultats
    const finalResults = {
      ...projectResults,
      tests: results,
    };
    setTestResults(new Map(testResults.set(project.id, finalResults)));
  };

  const testAllProjects = async () => {
    setTestingAll(true);
    try {
      const projectsWithBackend = projects.filter(
        (p) => p.backendPath && p.ports?.backend
      );
      
      await Promise.all(
        projectsWithBackend.map((project) => testProjectApi(project))
      );
      
      toast({
        title: "Tests terminés",
        description: `${projectsWithBackend.length} projet(s) testé(s)`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Erreur lors des tests: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        variant: "destructive",
      });
    } finally {
      setTestingAll(false);
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "testing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case "testing":
        return "bg-blue-500/20 border-blue-500/30";
      case "success":
        return "bg-green-500/20 border-green-500/30";
      case "error":
        return "bg-red-500/20 border-red-500/30";
      default:
        return "bg-gray-700/20 border-gray-700/30";
    }
  };

  const projectsWithBackend = projects.filter((p) => p.backendPath && p.ports?.backend);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Testeur d'API</h1>
          <p className="text-gray-400">
            Testez rapidement les connexions API de vos projets sans commandes
          </p>
        </div>
        <button
          className="btn px-4 py-2 rounded bg-blue-700 text-white flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={testAllProjects}
          disabled={testingAll || projectsWithBackend.length === 0}
        >
          {testingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Tester tous les projets
            </>
          )}
        </button>
      </div>

      {projectsWithBackend.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Aucun projet avec backend configuré</p>
          <p className="text-sm text-gray-500">
            Configurez vos projets dans Configuration → Project Manager
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {projectsWithBackend.map((project) => {
            const results = testResults.get(project.id);
            if (!results) return null;

            return (
              <div
                key={project.id}
                className="rounded-lg border border-gray-700 bg-gray-900 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      <Globe className="w-3 h-3 inline mr-1" />
                      {results.backendUrl}
                    </p>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded border border-blue-500 text-blue-500 text-sm flex items-center gap-2 hover:bg-blue-500/10 disabled:opacity-50"
                    onClick={() => testProjectApi(project)}
                    disabled={results.tests.some((t) => t.status === "testing")}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Tester
                  </button>
                </div>

                <div className="space-y-2">
                  {results.tests.map((test, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 ${getStatusColor(test.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <span className="text-sm font-medium text-white">
                            {test.endpoint}
                          </span>
                          {test.statusCode && (
                            <span className="text-xs text-gray-400">
                              HTTP {test.statusCode}
                            </span>
                          )}
                          {test.responseTime !== undefined && (
                            <span className="text-xs text-gray-400">
                              {test.responseTime}ms
                            </span>
                          )}
                        </div>
                        {test.error && (
                          <span className="text-xs text-red-400">{test.error}</span>
                        )}
                      </div>
                      {test.data && test.status === "success" && (
                        <div className="mt-2 text-xs text-gray-400 font-mono bg-gray-800/50 p-2 rounded">
                          {test.data}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
