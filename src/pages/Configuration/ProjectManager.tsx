import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProjectForm from "@/components/ProjectForm";
import {
  loadProjects,
  addProject,
  updateProject,
  deleteProject,
} from "@/lib/projectManager";
import { Project } from "@/types/Project";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const config = await loadProjects();
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

  const handleAdd = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (projectName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`)) {
      return;
    }

    try {
      await deleteProject(projectName);
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

  const handleSave = async (project: Project) => {
    try {
      if (editingProject) {
        await updateProject(project);
        toast({
          title: "Projet modifié",
          description: `Le projet "${project.name}" a été modifié avec succès.`,
        });
      } else {
        await addProject(project);
        toast({
          title: "Projet ajouté",
          description: `Le projet "${project.name}" a été ajouté avec succès.`,
        });
      }
      setIsFormOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
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
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un projet
          </Button>
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
            <Card key={project.name} className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs font-mono">
                      {project.backend_path}
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
                      onClick={() => handleDelete(project.name)}
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
                    <span className="text-gray-500">Backend:</span>{" "}
                    <span className="text-gray-300 font-mono">
                      {project.backend_path}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Frontend:</span>{" "}
                    <span className="text-gray-300 font-mono">
                      {project.frontend_path}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Scripts:</span>{" "}
                    <span className="text-gray-300 font-mono">
                      {project.scripts_path}
                    </span>
                  </div>
                </div>

                {/* Services configurés */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-700">
                  {project.services.tunnel && (
                    <Badge variant="secondary" className="text-xs">
                      Tunnel SSH
                    </Badge>
                  )}
                  {project.services.backend && (
                    <Badge variant="secondary" className="text-xs">
                      Backend
                      {project.services.backend.port && (
                        <span className="ml-1">:{project.services.backend.port}</span>
                      )}
                    </Badge>
                  )}
                  {project.services.frontend && (
                    <Badge variant="secondary" className="text-xs">
                      Frontend
                      {project.services.frontend.port && (
                        <span className="ml-1">:{project.services.frontend.port}</span>
                      )}
                    </Badge>
                  )}
                  {/* Netdata n'est plus affiché ici (service global uniquement) */}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Formulaire modal */}
      <ProjectForm
        project={editingProject}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
      />
    </div>
  );
}

