import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project, ProjectCommand } from "@/types/Project";
import { X, Plus } from "lucide-react";

interface ProjectFormProps {
  project?: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (project: Project) => void;
}

export default function ProjectForm({
  project,
  open,
  onOpenChange,
  onSave,
}: ProjectFormProps) {
  const [formData, setFormData] = useState<Project>({
    name: "",
    backend_path: "",
    frontend_path: "",
    scripts_path: "",
    services: {
      tunnel: null,
      backend: null,
      frontend: null,
      netdata: null,
    },
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      setFormData({
        name: "",
        backend_path: "",
        frontend_path: "",
        scripts_path: "",
        services: {
          tunnel: null,
          backend: null,
          frontend: null,
          netdata: null,
        },
      });
    }
  }, [project, open]);

  const updateService = (
    serviceName: keyof typeof formData.services,
    command: ProjectCommand | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        [serviceName]: command,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const ServiceEditor = ({
    serviceName,
    label,
  }: {
    serviceName: keyof typeof formData.services;
    label: string;
  }) => {
    const service = formData.services[serviceName];
    const showPort = serviceName !== "tunnel";

    return (
      <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {service ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateService(serviceName, null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                updateService(serviceName, {
                  start: "",
                  stop: null,
                  port: showPort ? 3000 : null,
                })
              }
              className="h-6 w-6 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>

        {service && (
          <div className="space-y-2">
            <div>
              <Label htmlFor={`${serviceName}-start`} className="text-xs">
                Commande start
              </Label>
              <Input
                id={`${serviceName}-start`}
                value={service.start}
                onChange={(e) =>
                  updateService(serviceName, {
                    ...service,
                    start: e.target.value,
                  })
                }
                placeholder="ex: tunnel.sh"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${serviceName}-stop`} className="text-xs">
                Commande stop (optionnel)
              </Label>
              <Input
                id={`${serviceName}-stop`}
                value={service.stop || ""}
                onChange={(e) =>
                  updateService(serviceName, {
                    ...service,
                    stop: e.target.value || null,
                  })
                }
                placeholder="ex: tunnel-off.sh"
                className="mt-1"
              />
            </div>
            {showPort && (
              <div>
                <Label htmlFor={`${serviceName}-port`} className="text-xs">
                  Port
                </Label>
                <Input
                  id={`${serviceName}-port`}
                  type="number"
                  value={service.port || ""}
                  onChange={(e) =>
                    updateService(serviceName, {
                      ...service,
                      port: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                  placeholder="3000"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? "Modifier le projet" : "Ajouter un projet"}
          </DialogTitle>
          <DialogDescription>
            Configurez les chemins et les services du projet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                placeholder="GestionMax OPS"
              />
            </div>

            <div>
              <Label htmlFor="backend_path">Chemin Backend *</Label>
              <Input
                id="backend_path"
                value={formData.backend_path}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    backend_path: e.target.value,
                  }))
                }
                required
                placeholder="/home/user/projects/backend"
              />
            </div>

            <div>
              <Label htmlFor="frontend_path">Chemin Frontend *</Label>
              <Input
                id="frontend_path"
                value={formData.frontend_path}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    frontend_path: e.target.value,
                  }))
                }
                required
                placeholder="/home/user/projects/frontend"
              />
            </div>

            <div>
              <Label htmlFor="scripts_path">Chemin Scripts *</Label>
              <Input
                id="scripts_path"
                value={formData.scripts_path}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scripts_path: e.target.value,
                  }))
                }
                required
                placeholder="/home/user/scripts/dev-tools"
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3">
            <Label className="text-base">Services</Label>
            <ServiceEditor serviceName="tunnel" label="Tunnel SSH" />
            <ServiceEditor serviceName="backend" label="Backend" />
            <ServiceEditor serviceName="frontend" label="Frontend" />
            <ServiceEditor serviceName="netdata" label="Netdata" />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

