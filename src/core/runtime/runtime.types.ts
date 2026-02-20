/**
 * Statut d'un projet dans le runtime
 */
export type ProjectStatus = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "ERROR";

/**
 * Interface pour le résultat d'une commande gmdev
 */
export interface GmdResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * État global du runtime (mono-projet)
 * 
 * Modèle "Single Active Project" :
 * - Un seul projet actif à la fois
 * - Status, logs, commandes concernent uniquement le projet actif
 */
export interface RuntimeState {
  /** ID du projet actuellement actif */
  activeProjectId: string | null;
  
  /** Chemin du projet actif (pour cwd des commandes gmdev) */
  activeProjectPath: string | null;
  
  /** Statut du projet actif uniquement */
  status: ProjectStatus | null;
  
  /** Logs du projet actif uniquement (isolés par projet) */
  logs: string[];
  
  /** Verrou mutex pour empêcher les commandes concurrentes */
  commandInFlight: boolean;
}

/**
 * Contexte du runtime
 */
export interface RuntimeContextValue {
  /** État actuel du runtime */
  state: RuntimeState;
  
  /** Fonction atomique pour switcher de projet */
  switchProject: (projectId: string) => Promise<void>;
  
  /** Rafraîchir le statut du projet actif uniquement (polling) */
  refreshActiveStatus: () => Promise<void>;
  
  /** Exécuter une commande gmdev */
  runGmd: (args: string[], options?: { cwd?: string }) => Promise<GmdResult>;
  
  /** Effacer les logs du projet actif */
  clearLogs: () => void;
}
