import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { readLogs } from "@/lib/commands";
import TerminalOutput from "@/components/TerminalOutput";

export default function Logs() {
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const logData = await readLogs();
      setLogs(logData);
    } catch (error) {
      setLogs(`Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Polling toutes les 2 secondes pour les logs en temps réel
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    setLogs("");
  };

  return (
    <div className="bg-gray-900 text-gray-100 p-6">
      <div className="container mx-auto">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Logs</CardTitle>
            <CardDescription>Logs en temps réel du système</CardDescription>
          </CardHeader>
        </Card>
        <div className="h-[calc(100vh-200px)]">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Chargement des logs...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TerminalOutput logs={logs} onClear={handleClear} />
          )}
        </div>
      </div>
    </div>
  );
}
