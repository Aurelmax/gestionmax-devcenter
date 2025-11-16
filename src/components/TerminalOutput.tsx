import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TerminalOutputProps {
  logs: string;
  onClear?: () => void;
}

export default function TerminalOutput({ logs, onClear }: TerminalOutputProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll vers le bas quand de nouveaux logs arrivent
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-gray-900 border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-sm text-gray-400 font-mono">Terminal</span>
        </div>
        {onClear && (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm text-[#00FF9D] bg-black"
        style={{
          fontFamily: "monospace",
          lineHeight: "1.5",
        }}
      >
        {logs ? (
          <pre className="whitespace-pre-wrap break-words">{logs}</pre>
        ) : (
          <div className="text-gray-500">No logs available...</div>
        )}
      </div>
    </Card>
  );
}
