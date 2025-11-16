import { Power, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UseCommandReturn } from "@/hooks/useCommand";
import { useState } from "react";

interface DashboardHeaderProps {
  globalStatus: "healthy" | "warning" | "error" | null;
  onStopAll: UseCommandReturn;
}

export default function DashboardHeader({
  globalStatus,
  onStopAll,
}: DashboardHeaderProps) {
  const [open, setOpen] = useState(false);

  const statusLabel = globalStatus
    ? globalStatus.charAt(0).toUpperCase() + globalStatus.slice(1)
    : "Unknown";

  const handleStopAll = () => {
    onStopAll.execute();
    setOpen(false);
  };

  return (
    <header className="w-full bg-gray-800/50 border-b border-gray-700/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">GestionMax DevCenter</h1>
              <p className="text-sm text-gray-400">v1 — Dashboard de pilotage</p>
            </div>
          </div>

          {/* Status global et bouton STOP ALL */}
          <div className="flex items-center gap-4">
            {/* Status badge */}
            <Badge
              variant={
                globalStatus === "healthy" ? "success" :
                globalStatus === "warning" ? "warning" :
                globalStatus === "error" ? "error" : "secondary"
              }
              className="px-4 py-2"
            >
              <div
                className={`
                  w-2 h-2 rounded-full mr-2
                  ${globalStatus === "healthy" ? "bg-green-400" : ""}
                  ${globalStatus === "warning" ? "bg-orange-400" : ""}
                  ${globalStatus === "error" ? "bg-red-400" : ""}
                  ${!globalStatus ? "bg-gray-400" : ""}
                `}
              />
              {statusLabel}
            </Badge>

            {/* Bouton STOP ALL avec Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="default">
                  <Power className="w-4 h-4 mr-2" />
                  STOP ALL
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arrêter tous les services ?</DialogTitle>
                  <DialogDescription>
                    Cette action va arrêter tous les services en cours d'exécution :
                    Tunnel SSH, Backend Payload, Frontend Next.js et Netdata.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button variant="destructive" onClick={handleStopAll} disabled={onStopAll.isLoading}>
                    {onStopAll.isLoading ? "Arrêt en cours..." : "Confirmer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
