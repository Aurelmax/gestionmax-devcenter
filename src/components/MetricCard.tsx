import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  unit?: string;
  color?: "blue" | "purple" | "green" | "yellow";
  showProgress?: boolean;
}

export default function MetricCard({
  icon,
  label,
  value,
  unit = "%",
  color = "blue",
  showProgress = true,
}: MetricCardProps) {
  const colorClasses = {
    blue: "text-[#00B5FF]",
    purple: "text-purple-400",
    green: "text-[#00FF9D]",
    yellow: "text-[#FFBF00]",
  };

  const progressColorClasses = {
    blue: "[&>div]:bg-[#00B5FF]",
    purple: "[&>div]:bg-purple-400",
    green: "[&>div]:bg-[#00FF9D]",
    yellow: "[&>div]:bg-[#FFBF00]",
  };

  const iconColor = colorClasses[color] || colorClasses.blue;
  const progressColor = progressColorClasses[color] || progressColorClasses.blue;

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={iconColor}>{icon}</div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {value.toFixed(1)}
              {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-400">{label}</p>
        {showProgress && (
          <Progress 
            value={value} 
            className={cn("h-2 bg-gray-700", progressColor)}
          />
        )}
      </CardContent>
    </Card>
  );
}

