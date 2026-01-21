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
import { ProjectV3 } from "@/types/ProjectV3";

interface ProjectFormV3Props {
  project?: ProjectV3 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (project: ProjectV3) => void;
}

export default function ProjectFormV3({
  project,
  open,
  onOpenChange,
  onSave,
}: ProjectFormV3Props) {
  const [formData, setFormData] = useState<ProjectV3>({
    id: "",
    name: "",
    rootPath: "",
    backendPath: "",
    frontendPath: "",
    backendType: undefined,
    ports: {
      backend: 3010,
      frontend: 3000,
    },
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
    createdAt: new Date().toISOString(),
    enabled: true, // Par défaut activé pour les nouveaux projets
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      // Generate ID from name
      const defaultId = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData({
        id: defaultId || "",
        name: "",
        rootPath: "",
        backendPath: "",
        frontendPath: "",
        backendType: undefined,
        ports: {
          backend: 3010,
          frontend: 3000,
        },
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
        createdAt: new Date().toISOString(),
        enabled: true, // Par défaut activé pour les nouveaux projets
      });
    }
  }, [project, open]);

  // Auto-generate ID from name
  useEffect(() => {
    if (!project && formData.name) {
      const generatedId = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, id: generatedId }));
    }
  }, [formData.name, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // S'assurer que createdAt est toujours défini
    const projectToSave: ProjectV3 = {
      ...formData,
      createdAt: formData.createdAt || new Date().toISOString(),
    };
    onSave(projectToSave);
  };

  const toggleTunnel = () => {
    setFormData((prev) => ({
      ...prev,
      tunnel: prev.tunnel
        ? {
            ...prev.tunnel,
            enabled: !prev.tunnel.enabled,
          }
        : {
            enabled: true,
            host: "",
            user: "root",
            port: 22,
            privateKey: "",
            localMongo: 27017,
            remoteMongo: 27017,
          },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? "Modifier le projet" : "Ajouter un projet"}
          </DialogTitle>
          <DialogDescription>
            Configurez votre projet monorepo (Next.js + Payload) avec tunnel MongoDB.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => {
                    const id = prev.id && prev.id === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                      ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                      : prev.id;
                    return { ...prev, name, id };
                  });
                }}
                required
                placeholder="GestionMax OPS"
              />
            </div>

            <div>
              <Label htmlFor="id">ID du projet *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, id: e.target.value }))
                }
                required
                placeholder="gestionmax-ops"
                pattern="[a-z0-9-]+"
                title="Uniquement lettres minuscules, chiffres et tirets"
              />
              <p className="text-xs text-gray-400 mt-1">
                Identifiant unique (généré automatiquement depuis le nom)
              </p>
            </div>

            <div>
              <Label htmlFor="rootPath">Chemin racine (rootPath) *</Label>
              <Input
                id="rootPath"
                value={formData.rootPath}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rootPath: e.target.value }))
                }
                required
                placeholder="/home/user/CascadeProjects/monorepo"
              />
            </div>

            <div>
              <Label htmlFor="backendPath">Chemin Backend *</Label>
              <Input
                id="backendPath"
                value={formData.backendPath}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    backendPath: e.target.value,
                  }))
                }
                required
                placeholder="/home/user/CascadeProjects/monorepo/backend"
              />
            </div>

            <div>
              <Label htmlFor="frontendPath">Chemin Frontend *</Label>
              <Input
                id="frontendPath"
                value={formData.frontendPath}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    frontendPath: e.target.value,
                  }))
                }
                required
                placeholder="/home/user/CascadeProjects/monorepo/frontend"
              />
            </div>
          </div>

          {/* Type de Backend */}
          {formData.backendPath && (
            <div>
              <Label htmlFor="backendType">Type de Backend (CMS)</Label>
              <select
                id="backendType"
                value={formData.backendType || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    backendType: e.target.value as "payload" | "directus" | undefined,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500 hover:border-gray-500 transition-colors"
              >
                <option value="" className="bg-gray-800 text-white">Aucun (backend custom)</option>
                <option value="payload" className="bg-gray-800 text-white">Payload CMS</option>
                <option value="directus" className="bg-gray-800 text-white">Directus</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Utilisé pour l'UX (badges, commandes par défaut). Payload n'est plus un projet, c'est un type de backend.
              </p>
            </div>
          )}

          {/* Ports */}
          <div className="space-y-4">
            <Label className="text-base">Ports</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backendPort">Port Backend *</Label>
                <Input
                  id="backendPort"
                  type="number"
                  value={formData.ports.backend}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ports: {
                        ...prev.ports,
                        backend: parseInt(e.target.value) || 3010,
                      },
                    }))
                  }
                  required
                  min="1024"
                  max="65535"
                />
              </div>
              <div>
                <Label htmlFor="frontendPort">Port Frontend *</Label>
                <Input
                  id="frontendPort"
                  type="number"
                  value={formData.ports.frontend}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ports: {
                        ...prev.ports,
                        frontend: parseInt(e.target.value) || 3000,
                      },
                    }))
                  }
                  required
                  min="1024"
                  max="65535"
                />
              </div>
            </div>
          </div>

          {/* Commandes */}
          <div className="space-y-4">
            <Label className="text-base">Commandes de démarrage</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backendCommand">Commande Backend</Label>
                <Input
                  id="backendCommand"
                  value={formData.commands?.backend || "pnpm dev"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      commands: {
                        ...prev.commands,
                        backend: e.target.value,
                      },
                    }))
                  }
                  placeholder="pnpm dev"
                />
              </div>
              <div>
                <Label htmlFor="frontendCommand">Commande Frontend</Label>
                <Input
                  id="frontendCommand"
                  value={formData.commands?.frontend || "npm run dev"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      commands: {
                        ...prev.commands,
                        frontend: e.target.value,
                      },
                    }))
                  }
                  placeholder="npm run dev"
                />
              </div>
            </div>
          </div>

          {/* Tunnel SSH - ⚠️ RÈGLE MÉTIER: Tunnel = service backend uniquement */}
          {/* N'afficher le tunnel que s'il y a un backend */}
          {formData.backendPath && formData.backendPath.trim() !== "" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Tunnel SSH MongoDB (Coolify)</Label>
                  <p className="text-xs text-gray-400 mt-1">
                    Connecte ce projet à sa base MongoDB hébergée sur Coolify
                  </p>
                </div>
              <Button
                type="button"
                variant={formData.tunnel?.enabled ? "default" : "outline"}
                size="sm"
                onClick={toggleTunnel}
              >
                {formData.tunnel?.enabled ? "Activé" : "Désactivé"}
              </Button>
            </div>
            
            {!formData.tunnel?.enabled && (
              <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg text-sm text-blue-300">
                <p className="font-medium mb-1">💡 Comment ça fonctionne :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Chaque projet backend Payload a sa propre base MongoDB sur Coolify</li>
                  <li>Le tunnel SSH mappe un port local unique vers la base MongoDB distante</li>
                  <li>Payload se connecte à <code className="bg-gray-800 px-1 rounded">localhost:PORT_LOCAL</code></li>
                  <li>Configure le host Coolify et active le tunnel pour commencer</li>
                </ul>
              </div>
            )}

              {formData.tunnel?.enabled && formData.tunnel && (
                <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tunnelHost">Host Coolify (IP) *</Label>
                    <Input
                      id="tunnelHost"
                      value={formData.tunnel.host || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tunnel: prev.tunnel
                            ? {
                                ...prev.tunnel,
                                host: e.target.value,
                              }
                            : undefined,
                        }))
                      }
                      required={formData.tunnel.enabled}
                      placeholder="91.99.22.54"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Adresse IP de ton serveur Coolify
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="tunnelUser">User *</Label>
                    <Input
                      id="tunnelUser"
                      value={formData.tunnel.user || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tunnel: prev.tunnel
                            ? {
                                ...prev.tunnel,
                                user: e.target.value,
                              }
                            : undefined,
                        }))
                      }
                      required={formData.tunnel.enabled}
                      placeholder="root"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tunnelPort">Port SSH</Label>
                    <Input
                      id="tunnelPort"
                      type="number"
                      value={formData.tunnel.port || 22}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tunnel: prev.tunnel
                            ? {
                                ...prev.tunnel,
                                port: parseInt(e.target.value) || 22,
                              }
                            : undefined,
                        }))
                      }
                      min="1"
                      max="65535"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tunnelKey">Clé privée SSH *</Label>
                    <Input
                      id="tunnelKey"
                      value={formData.tunnel.privateKey || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tunnel: prev.tunnel
                            ? {
                                ...prev.tunnel,
                                privateKey: e.target.value,
                              }
                            : undefined,
                        }))
                      }
                      required={formData.tunnel.enabled}
                      placeholder="/home/user/.ssh/id_ed25519"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="localMongo">Port MongoDB Local *</Label>
                    <Input
                      id="localMongo"
                      type="number"
                      value={formData.tunnel.localMongo || 27017}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tunnel: prev.tunnel
                            ? {
                                ...prev.tunnel,
                                localMongo: parseInt(e.target.value) || 27017,
                              }
                            : undefined,
                        }))
                      }
                      required={formData.tunnel.enabled}
                      min="1024"
                      max="65535"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Port local unique pour ce projet. Configure <code className="bg-gray-800 px-1 rounded">MONGODB_URI=mongodb://localhost:{formData.tunnel.localMongo || 27017}/your-db</code> dans le <code className="bg-gray-800 px-1 rounded">.env</code> du backend Payload.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="remoteMongo">Port MongoDB Distant</Label>
                    <Input
                      id="remoteMongo"
                      type="number"
                      value={formData.tunnel.remoteMongo || 27017}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tunnel: prev.tunnel
                            ? {
                                ...prev.tunnel,
                                remoteMongo: parseInt(e.target.value) || 27017,
                              }
                            : undefined,
                        }))
                      }
                      min="1"
                      max="65535"
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
          )}

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

