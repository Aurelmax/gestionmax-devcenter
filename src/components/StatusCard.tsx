import { Clock, Network, Server, Globe, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";
import { ServiceName } from "@/lib/commands";
import { getServiceLabel } from "@/lib/system";
import { UseCommandReturn } from "@/hooks/useCommand";

interface StatusCardProps {
  service: ServiceName;
  isActive: boolean;
  uptime?: number;
  onStart: UseCommandReturn;
  onStop: UseCommandReturn;
}

export default function StatusCard({
  service,
  isActive,
  uptime = 0,
  onStart,
  onStop,
}: StatusCardProps) {
  const label = getServiceLabel(service);
  
  // Mapping des icônes selon le service
  const getIcon = () => {
    switch (service) {
      case "tunnel":
        return Network;
      case "backend":
        return Server;
      case "frontend":
        return Globe;
      case "netdata":
        return Activity;
      default:
        return Activity;
    }
  };
  
  const IconComponent = getIcon();

  const formatUptime = (seconds: number): string => {
    if (seconds === 0) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isLoading = onStart.isLoading || onStop.isLoading;

  return (
    <Card className={`w-[200px] h-[320px] flex flex-col ${isActive ? "border-green-500/50" : "border-red-500/50"}`}>
      <CardHeader className="flex flex-col items-center gap-2 pb-3">
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isActive ? "bg-green-500/20" : "bg-red-500/20"}
          `}
        >
          <IconComponent
            className={`w-6 h-6 ${isActive ? "text-green-400" : "text-red-400"}`}
          />
        </div>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-3 flex-1">
        {/* Status badge */}
        <Badge
          variant={isActive ? "success" : "error"}
          className="text-xs"
        >
          {isActive ? "RUNNING" : "STOPPED"}
        </Badge>

        {/* Uptime */}
        {isActive && uptime > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatUptime(uptime)}</span>
          </div>
        )}

        {/* Boutons ON et OFF séparés */}
        <div className="mt-auto w-full flex flex-col gap-2">
          {/* Bouton ON */}
          <Button
            onClick={onStart.execute}
            disabled={isLoading || isActive}
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            {onStart.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Démarrage...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                <span>ON</span>
              </>
            )}
          </Button>

          {/* Bouton OFF */}
          <Button
            onClick={onStop.execute}
            disabled={isLoading || !isActive}
            variant={isActive ? "destructive" : "secondary"}
            className={`w-full ${
              isActive 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-gray-600 hover:bg-gray-700 text-gray-300 opacity-50"
            }`}
            size="sm"
          >
            {onStop.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Arrêt...</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                <span>OFF</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
