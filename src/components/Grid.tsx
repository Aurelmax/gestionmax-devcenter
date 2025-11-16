import { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export default function Grid({
  children,
  columns = 3,
  gap = "md",
  className = "",
}: GridProps) {
  const gapClass = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  }[gap];

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];

  return (
    <div
      className={`
        grid ${gridCols} ${gapClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

