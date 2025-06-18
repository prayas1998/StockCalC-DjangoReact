import React from 'react';
import { Card } from "@/components/ui/card";
import { Calculator } from "lucide-react";

interface CalculatorCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const CalculatorCard: React.FC<CalculatorCardProps> = ({
  title,
  description,
  children,
  disabled = false,
  className = ""
}) => {
  const cardStyle = disabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {};

  return (
    <Card 
      className={`p-6 bg-card shadow-sm ${className}`} 
      aria-disabled={disabled} 
      style={cardStyle}
    >
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        {description}
      </p>
      {children}
    </Card>
  );
};