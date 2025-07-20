import type React from "react"
import { Card } from "@/components/ui/card"
import { Calculator, type LucideIcon } from "lucide-react"

interface CalculatorCardProps {
  title: string
  description: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
  icon?: LucideIcon
}

export const CalculatorCard: React.FC<CalculatorCardProps> = ({
  title,
  description,
  children,
  disabled = false,
  className = "",
  icon: Icon = Calculator,
}) => {
  const cardStyle = disabled ? { opacity: 0.5, pointerEvents: "none" as const } : {}

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
      aria-disabled={disabled}
      style={cardStyle}
    >
      {/* Enhanced Header */}
      <div className="relative p-6 pb-4">
        <div className="flex items-start space-x-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-300 dark:to-slate-400 shadow-lg shadow-slate-500/25">
            <Icon className="w-6 h-6 text-white dark:text-slate-800" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">{children}</div>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/30 dark:to-slate-800/30 pointer-events-none" />
    </Card>
  )
}
