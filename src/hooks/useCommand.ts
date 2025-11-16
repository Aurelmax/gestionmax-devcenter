import { useState, useCallback } from "react";
import { ServiceName, startService, stopService, stopAllServices, killZombies } from "@/lib/commands";
import { useToast } from "@/components/ui/use-toast";
import { getServiceLabel } from "@/lib/system";

export interface UseCommandReturn {
  execute: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook pour exécuter une commande avec gestion d'état et toasts
 */
export function useCommand(
  commandFn: () => Promise<string>,
  onSuccess?: () => void,
  successMessage?: { title: string; description?: string },
  errorMessage?: { title: string; description?: string }
): UseCommandReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await commandFn();
      onSuccess?.();
      if (successMessage) {
        toast({
          title: successMessage.title,
          description: successMessage.description || result,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      // Ne pas stocker l'erreur dans l'état pour éviter le badge Error global
      // setError(errorMsg);
      toast({
        title: errorMessage?.title || "Erreur",
        description: errorMessage?.description || errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [commandFn, onSuccess, successMessage, errorMessage, toast]);

  return { execute, isLoading, error };
}

/**
 * Hook pour gérer un service (start/stop)
 */
export function useService(service: ServiceName, onSuccess?: () => void) {
  const serviceLabel = getServiceLabel(service);
  
  const start = useCommand(
    () => startService(service),
    onSuccess,
    {
      title: `${serviceLabel} démarré`,
      description: `Le service ${serviceLabel} est désormais actif.`,
    },
    {
      title: `Échec du démarrage`,
      description: `Impossible de démarrer ${serviceLabel}.`,
    }
  );

  const stop = useCommand(
    () => stopService(service),
    onSuccess,
    {
      title: `${serviceLabel} arrêté`,
      description: `Le service ${serviceLabel} a été arrêté.`,
    },
    {
      title: `Échec de l'arrêt`,
      description: `Impossible d'arrêter ${serviceLabel}.`,
    }
  );

  return { start, stop };
}

/**
 * Hook pour arrêter tous les services
 */
export function useStopAll(onSuccess?: () => void) {
  return useCommand(
    () => stopAllServices(),
    onSuccess,
    {
      title: "Tous les services arrêtés",
      description: "Tous les services ont été arrêtés avec succès.",
    },
    {
      title: "Erreur lors de l'arrêt",
      description: "Impossible d'arrêter tous les services.",
    }
  );
}

/**
 * Hook pour tuer les processus zombies
 */
export function useKillZombies(onSuccess?: () => void) {
  return useCommand(
    () => killZombies(),
    onSuccess,
    {
      title: "Processus zombies supprimés",
      description: "Les processus zombies ont été supprimés avec succès.",
    },
    {
      title: "Erreur",
      description: "Impossible de supprimer les processus zombies.",
    }
  );
}
