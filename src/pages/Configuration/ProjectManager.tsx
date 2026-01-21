import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProjectFormV3 from "@/components/ProjectFormV3";
import {
  loadProjectsV3,
  addProjectV3,
  updateProjectV3,
  deleteProjectV3,
} from "@/lib/projectManager";
import { ProjectV3 } from "@/types/ProjectV3";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function ProjectManager() {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<ProjectV3 | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const config = await loadProjectsV3();
      setProjects(config.projects);
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de charger les projets: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAdd = (template?: "headless" | "front-only") => {
    // Créer un projet template selon le type
    let templateProject: Partial<ProjectV3> | null = null;
    
    if (template === "headless") {
      // Template Headless (Front + CMS)
      templateProject = {
        ports: {
          backend: 3010,
          frontend: 3000,
        },
        backendType: "payload",
        commands: {
          backend: "pnpm dev",
          frontend: "npm run dev",
        },
        tunnel: {
          enabled: false,
          host: "",
          user: "root",
          port: 22,
          privateKey: "",
          localMongo: 27017,
          remoteMongo: 27017,
        },
        enabled: true, // Par défaut activé pour les nouveaux projets
      };
    } else if (template === "front-only") {
      // Template Front only
      // ⚠️ RÈGLE MÉTIER: Pas de backend = pas de tunnel
      // Le tunnel MongoDB est un service backend uniquement
      templateProject = {
        ports: {
          backend: 3010,
          frontend: 3000,
        },
        backendPath: "", // Pas de backend
        commands: {
          frontend: "npm run dev",
        },
        // Pas de tunnel : front-only n'a pas besoin de MongoDB
        tunnel: undefined,
        enabled: true, // Par défaut activé pour les nouveaux projets
      };
    }

    setEditingProject(templateProject as ProjectV3 | null);
    setIsFormOpen(true);
  };

  const handleEdit = (project: ProjectV3) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`)) {
      return;
    }

    try {
      await deleteProjectV3(projectId);
      toast({
        title: "Projet supprimé",
        description: `Le projet "${projectName}" a été supprimé avec succès.`,
      });
      fetchProjects();
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de supprimer le projet: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleSave = async (project: ProjectV3) => {
    try {
      // S'assurer que tous les champs requis sont présents
      const projectToSave: ProjectV3 = {
        ...project,
        createdAt: project.createdAt || new Date().toISOString(),
        id: project.id || project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        name: project.name || "",
        rootPath: project.rootPath || "",
        backendPath: project.backendPath || "",
        frontendPath: project.frontendPath || "",
        ports: project.ports || { backend: 3010, frontend: 3000 },
        commands: project.commands || {},
      };
      
      // Vérifier si le projet existe déjà dans la liste des projets
      const existingProject = projects.find((p) => p.id === projectToSave.id);
      
      // Debug: afficher dans la console
      console.log("handleSave - projectToSave:", JSON.stringify(projectToSave, null, 2));
      console.log("handleSave - existingProject:", existingProject);
      
      // Si le projet existe déjà dans la liste, c'est une modification
      // Sinon, c'est une création (même si editingProject est défini via template)
      if (existingProject) {
        // Le projet existe -> mise à jour
        console.log("Mode: UPDATE");
        await updateProjectV3(projectToSave);
        toast({
          title: "Projet modifié",
          description: `Le projet "${projectToSave.name}" a été modifié avec succès.`,
        });
      } else {
        // Le projet n'existe pas -> création
        console.log("Mode: CREATE");
        await addProjectV3(projectToSave);
        toast({
          title: "Projet ajouté",
          description: `Le projet "${projectToSave.name}" a été ajouté avec succès.`,
        });
      }
      setIsFormOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      console.error("handleSave error:", error);
      toast({
        title: "Erreur",
        description: `Impossible de sauvegarder le projet: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Chargement des projets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Project Manager</h1>
            <p className="text-sm text-gray-400 mt-1">
              Gérez vos projets de développement
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjects}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleAdd("headless")}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer projet "Headless (Front + CMS)"
            </Button>
            <Button
              onClick={() => handleAdd("front-only")}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer projet "Front only"
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des projets */}
      {projects.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">
              Aucun projet configuré. Cliquez sur "Ajouter un projet" pour commencer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs font-mono">
                      {project.rootPath}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(project)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id, project.name)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-gray-500">Root:</span>{" "}
                    <span className="text-gray-300 font-mono text-[10px]">
                      {project.rootPath}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Backend:</span>{" "}
                    <span className="text-gray-300 font-mono text-[10px]">
                      {project.backendPath}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Frontend:</span>{" "}
                    <span className="text-gray-300 font-mono text-[10px]">
                      {project.frontendPath}
                    </span>
                  </div>
                </div>

                {/* Ports et services */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-700">
                  <Badge variant="secondary" className="text-xs">
                    Backend :{project.ports.backend}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Frontend :{project.ports.frontend}
                  </Badge>
                  {project.tunnel?.enabled && (
                    <Badge variant="secondary" className="text-xs bg-green-900/50">
                      Tunnel :{project.tunnel.localMongo}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Formulaire modal */}
      <ProjectFormV3
        project={editingProject}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
      />
    </div>
  );
}

