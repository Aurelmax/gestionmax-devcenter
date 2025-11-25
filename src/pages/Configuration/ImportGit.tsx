import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GitBranch, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cloneGitRepo, autoscanProject } from "@/lib/autoscan";
import { addProjectFromScan } from "@/lib/projectManager";
import { ProjectScanResult } from "@/types/Project";
import AutoScanSummary from "@/components/AutoScanSummary";

export default function ImportGit() {
  const [gitUrl, setGitUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scanData, setScanData] = useState<{ rootPath: string; result: ProjectScanResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCloneAndScan = async () => {
    if (!gitUrl.trim()) {
      toast({
        title: "URL requise",
        description: "Veuillez saisir une URL Git valide",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setScanData(null);

    try {
      // Étape 1: Cloner le dépôt
      toast({
        title: "Clonage en cours...",
        description: `Clonage de ${gitUrl}`,
      });

      const clonedPath = await cloneGitRepo(gitUrl);

      // Étape 2: Scanner automatiquement le projet
      toast({
        title: "Scan en cours...",
        description: "Analyse de la structure du projet",
      });

      const result = await autoscanProject(clonedPath);

      // Étape 3: Afficher le résumé
      setScanData({ rootPath: clonedPath, result });

      toast({
        title: "Scan terminé",
        description: `Projet "${result.name}" détecté avec succès`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMsg);
      toast({
        title: "Erreur",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!scanData) return;

    setIsLoading(true);

    try {
      await addProjectFromScan(scanData.result, scanData.rootPath);

      toast({
        title: "Projet ajouté",
        description: `Le projet "${scanData.result.name}" a été ajouté avec succès`,
      });

      // Rediriger vers le Dashboard
      navigate("/dashboard");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      toast({
        title: "Erreur",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Import depuis Git
          </CardTitle>
          <CardDescription>
            Clonez un dépôt Git et configurez-le automatiquement dans DevCenter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="git-url">URL du dépôt Git</Label>
            <Input
              id="git-url"
              type="url"
              placeholder="https://github.com/user/repo.git"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleCloneAndScan();
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              Le projet sera cloné dans ~/CascadeProjects/
            </p>
          </div>

          <Button
            onClick={handleCloneAndScan}
            disabled={isLoading || !gitUrl.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Clonage et scan en cours...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4 mr-2" />
                Cloner & AutoConfig
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {scanData && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Projet détecté
            </CardTitle>
            <CardDescription>
              Le projet a été scanné avec succès. Vérifiez la configuration ci-dessous.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AutoScanSummary scan={scanData.result} />
            <Button
              onClick={handleAddProject}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Ajouter automatiquement au Dashboard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

