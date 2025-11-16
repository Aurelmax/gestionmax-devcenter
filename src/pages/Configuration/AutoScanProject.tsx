import { useState } from "react";
import { FolderOpen, Scan, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AutoScanSummary from "@/components/AutoScanSummary";
import { pickProjectFolder, autoscanProject } from "@/lib/autoscan";
import { addProject } from "@/lib/projectManager";
import { Project } from "@/types/Project";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function AutoScanProject() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProject, setScannedProject] = useState<Project | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePickFolder = async () => {
    try {
      setIsScanning(true);
      setScannedProject(null);

      // 1. Choisir le dossier
      const folderPath = await pickProjectFolder();
      
      if (!folderPath) {
        toast({
          title: "Annulé",
          description: "Sélection du dossier annulée.",
          variant: "default",
        });
        setIsScanning(false);
        return;
      }

      // 2. Scanner le projet
      const project = await autoscanProject(folderPath);
      setScannedProject(project);

      toast({
        title: "Projet scanné",
        description: `Le projet "${project.name}" a été analysé avec succès.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Erreur de scan",
        description: `Impossible de scanner le projet: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddProject = async () => {
    if (!scannedProject) return;

    try {
      setIsAdding(true);

      // Vérifier si le projet existe déjà
      try {
        await addProject(scannedProject);
        
        toast({
          title: "Projet ajouté",
          description: `Le projet "${scannedProject.name}" a été ajouté avec succès.`,
        });

        // Réinitialiser et recharger
        setScannedProject(null);
        
        // Optionnel : rediriger vers Project Manager après 1 seconde
        setTimeout(() => {
          navigate("/config");
        }, 1000);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        if (errorMsg.includes("already exists")) {
          toast({
            title: "Projet existant",
            description: `Un projet avec le nom "${scannedProject.name}" existe déjà. Modifiez-le dans Project Manager.`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter le projet: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Auto-Detection Project Scanner</h1>
        <p className="text-sm text-gray-400 mt-1">
          Détecte automatiquement la structure de votre projet et le configure sans saisie manuelle
        </p>
      </div>

      {/* Instructions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg">Comment ça fonctionne ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">1.</span>
              <span>Cliquez sur "Choisir un dossier" et sélectionnez le dossier racine de votre projet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">2.</span>
              <span>Le scanner détecte automatiquement : Backend Payload, Frontend Next.js, scripts, ports</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">3.</span>
              <span>Netdata est automatiquement configuré (port 19999)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">4.</span>
              <span>Vérifiez le résumé et cliquez sur "Ajouter automatiquement"</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Bouton de scan */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handlePickFolder}
          disabled={isScanning}
          size="lg"
          className="flex items-center gap-2"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Scan en cours...</span>
            </>
          ) : (
            <>
              <FolderOpen className="w-5 h-5" />
              <span>Choisir un dossier</span>
            </>
          )}
        </Button>

        {scannedProject && (
          <Button
            onClick={handleAddProject}
            disabled={isAdding}
            variant="default"
            size="lg"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Ajout en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Ajouter automatiquement</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Résumé du projet scanné */}
      {scannedProject && (
        <div className="space-y-4">
          <AutoScanSummary project={scannedProject} />
          
          {/* Bouton pour scanner un autre projet */}
          <div className="flex justify-end">
            <Button
              onClick={() => setScannedProject(null)}
              variant="outline"
              size="sm"
            >
              Scanner un autre projet
            </Button>
          </div>
        </div>
      )}

      {/* Message si aucun projet scanné */}
      {!scannedProject && !isScanning && (
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Scan className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400">
                Cliquez sur "Choisir un dossier" pour commencer le scan automatique
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

