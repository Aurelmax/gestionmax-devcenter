import { Play, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UseCommandReturn } from "@/hooks/useCommand";

interface CommandButtonProps {
  isActive: boolean;
  onStart: UseCommandReturn;
  onStop: UseCommandReturn;
  className?: string;
}

export default function CommandButton({
  isActive,
  onStart,
  onStop,
  className = "",
}: CommandButtonProps) {
  const isLoading = onStart.isLoading || onStop.isLoading;
  const isDisabled = isLoading;

  const handleClick = () => {
    if (isActive) {
      onStop.execute();
    } else {
      onStart.execute();
    }
  };

  // Quand le service est actif : bouton OFF (rouge/destructive)
  // Quand le service est inactif : bouton ON (vert/default)
  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      variant={isActive ? "destructive" : "default"}
      size="default"
      className={`${className} ${isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>{isActive ? "Arrêt..." : "Démarrage..."}</span>
        </>
      ) : isActive ? (
        <>
          <Power className="w-4 h-4 mr-2" />
          <span>OFF</span>
        </>
      ) : (
        <>
          <Play className="w-4 h-4 mr-2" />
          <span>ON</span>
        </>
      )}
    </Button>
  );
}
