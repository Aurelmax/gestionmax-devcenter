import { useState, useEffect, useCallback } from "react";
import { SystemStatus, getSystemStatus } from "../lib/commands";
import { getGlobalStatus } from "../lib/system";

const POLL_INTERVAL = 2000; // 2 secondes

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getSystemStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const globalStatus = status ? getGlobalStatus(status) : null;

  return {
    status,
    isLoading,
    error,
    globalStatus,
    refetch: fetchStatus,
  };
}

