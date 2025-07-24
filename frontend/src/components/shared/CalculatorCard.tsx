import type React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Calculator, Info, X, type LucideIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CalculatorCardProps {
  title: string
  description: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
  icon?: LucideIcon
  infoContent?: React.ReactNode
}

export const CalculatorCard: React.FC<CalculatorCardProps> = ({
  title,
  description,
  children,
  disabled = false,
  className = "",
  icon: Icon = Calculator,
  infoContent,
}) => {
  const [infoOpen, setInfoOpen] = useState(false)
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {title}
              </h2>
              {infoContent && (
                <Popover open={infoOpen} onOpenChange={setInfoOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors duration-200"
                      onClick={() => setInfoOpen(!infoOpen)}
                    >
                      <Info className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="bottom" 
                    align="end"
                    className="w-[500px] max-w-[90vw] p-0 text-sm max-h-96 overflow-hidden z-50 border border-slate-200 dark:border-slate-700 shadow-xl"
                    sideOffset={8}
                    avoidCollisions={true}
                    collisionPadding={16}
                  >
                    <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <span className="font-medium text-slate-800 dark:text-slate-200">Calculator Guide</span>
                      <button
                        onClick={() => setInfoOpen(false)}
                        className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
                      >
                        <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-80">
                      {infoContent}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
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
