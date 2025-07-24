"use client"

import { useState, useEffect } from "react"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Trophy,
  Tag,
  Zap,
  AlertTriangle,
  Calendar,
  Star,
  Target,
  BarChart3,
  PieChart,
  Filter,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useJournalAnalytics } from "@/hooks/useJournalAnalytics"
import { formatCurrency } from "@/lib/utils"
import { isJournalAnalytics } from "./utils"
import { getTagAnalytics } from "@/services/journalApi"

export function JournalAnalytics() {
  const { analytics, isLoading, isError, refreshAnalytics } = useJournalAnalytics()
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [tagAnalytics, setTagAnalytics] = useState<Record<string, unknown> | null>(null)
  const [loadingTagAnalytics, setLoadingTagAnalytics] = useState(false)

  // Fetch tag analytics when a tag is selected
  useEffect(() => {
    if (selectedTag) {
      setLoadingTagAnalytics(true)
      getTagAnalytics(selectedTag)
        .then((data) => {
          if ("error" in data) {
            setTagAnalytics(null)
          } else {
            setTagAnalytics(data)
          }
        })
        .catch(() => {
          setTagAnalytics(null)
        })
        .finally(() => {
          setLoadingTagAnalytics(false)
        })
    } else {
      setTagAnalytics(null)
    }
  }, [selectedTag])

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-3">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>

        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              className="relative overflow-hidden bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-800/90 dark:to-slate-900/90 border border-slate-200/50 dark:border-slate-700/50 shadow-md backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card
              key={i}
              className="bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-800/90 dark:to-slate-900/90"
            >
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !isJournalAnalytics(analytics)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl animate-pulse" />
          <AlertTriangle className="h-16 w-16 text-red-500 relative z-10" />
        </div>
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Unable to load analytics
          </h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md">
            {isError ? "There was an error loading your analytics data." : "No analytics data available."}
          </p>
          <Button
            onClick={refreshAnalytics}
            className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Zap className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const {
    total_trades,
    closed_trades,
    open_trades,
    total_pnl,
    win_rate,
    profit_factor,
    avg_win,
    avg_loss,
    best_performing_stocks,
    worst_performing_stocks,
    tag_performance,
    monthly_performance,
  } = analytics

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="text-center space-y-3">
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Comprehensive insights into your trading performance, patterns, and opportunities for improvement.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-bl-3xl" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Trades</p>
                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{total_trades}</p>
              </div>
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2 font-medium">
              {closed_trades} closed • {open_trades} open
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200/50 dark:border-emerald-700/50 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-bl-3xl" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total P&L</p>
                <p className={`text-3xl font-bold ${total_pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(total_pnl)}
                </p>
              </div>
              <div
                className={`inline-flex p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                  total_pnl >= 0
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : "bg-gradient-to-r from-red-500 to-rose-500"
                }`}
              >
                {total_pnl >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-white" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <p className={`text-xs font-medium mt-2 ${total_pnl >= 0 ? "text-green-600/70" : "text-red-600/70"}`}>
              {total_pnl >= 0 ? "Total Profit" : "Total Loss"}
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 dark:border-purple-700/50 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-bl-3xl" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Win Rate</p>
                <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{win_rate}%</p>
              </div>
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-6 w-6 text-white" />
              </div>
            </div>
            <Badge
              variant={win_rate >= 50 ? "default" : "secondary"}
              className={`text-xs mt-2 ${win_rate >= 50 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"}`}
            >
              {win_rate >= 50 ? "Excellent" : "Needs Improvement"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200/50 dark:border-cyan-700/50 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-bl-3xl" />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Profit Factor</p>
                <p className="text-3xl font-bold text-cyan-800 dark:text-cyan-200">{profit_factor}</p>
              </div>
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <Badge
              variant={profit_factor >= 1.5 ? "default" : "secondary"}
              className={`text-xs mt-2 ${
                profit_factor >= 1.5
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : profit_factor >= 1.0
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {profit_factor >= 1.5 ? "Excellent" : profit_factor >= 1.0 ? "Good" : "Poor"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-xl border bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 text-card-foreground shadow-lg backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Risk & Reward Analysis
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">Average performance metrics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/30 dark:border-green-700/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Average Win</span>
              </div>
              <span className="font-bold text-green-600 text-lg">{formatCurrency(avg_win)}</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-200/30 dark:border-red-700/30">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Average Loss</span>
              </div>
              <span className="font-bold text-red-600 text-lg">{formatCurrency(Math.abs(avg_loss))}</span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Risk/Reward Ratio</span>
              </div>
              <span className="font-bold text-blue-600 text-xl">
                {avg_loss !== 0 ? (avg_win / Math.abs(avg_loss)).toFixed(2) : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 text-card-foreground shadow-lg backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Top Performers
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">Best performing stocks</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {best_performing_stocks && best_performing_stocks.length > 0 ? (
              best_performing_stocks
                .filter(stock => stock.total_pnl > 0) // Additional frontend safety filter
                .slice(0, 5)
                .map((stock, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 rounded-lg bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 border border-slate-200/30 dark:border-slate-600/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{stock.company_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 text-lg">{formatCurrency(stock.total_pnl)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{stock.trade_count} trades</div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No top performing stocks currently.</p>
                <p className="text-xs mt-1 opacity-75">Keep Trading!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tag Performance */}
      {tag_performance && tag_performance.length > 0 && (
        <Card className="rounded-xl border bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 text-card-foreground shadow-lg backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Strategy Performance
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                  Analyze performance by trading strategies and tags
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-slate-50/50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200/30 dark:border-slate-600/30">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Strategy</span>
              </div>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200">
                  <SelectValue placeholder="Choose a tag to analyze performance" />
                </SelectTrigger>
                <SelectContent className="bg-background/90 backdrop-blur-sm border-border/50">
                  {tag_performance.map((tag) => (
                    <SelectItem key={tag.tag_name} value={tag.tag_name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{tag.tag_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({tag.trade_count} trades)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag Analytics Display */}
            {selectedTag && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                    Detailed Analytics for "{selectedTag}"
                  </h4>
                </div>

                {loadingTagAnalytics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : tagAnalytics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total P&L</div>
                      <div
                        className={`text-xl font-bold ${(tagAnalytics.total_pnl as number) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(tagAnalytics.total_pnl as number)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Win Rate</div>
                      <div className="text-xl font-bold text-blue-600">{tagAnalytics.win_rate as number}%</div>
                    </div>
                    <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Trades</div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {tagAnalytics.trade_count as number}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg P&L</div>
                      <div
                        className={`text-xl font-bold ${(tagAnalytics.avg_pnl as number) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(tagAnalytics.avg_pnl as number)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No analytics data available for this tag</p>
                  </div>
                )}
              </div>
            )}

            {/* Tag Performance List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                All Strategy Performance
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {tag_performance.slice(0, 10).map((tag, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 rounded-lg bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 border border-slate-200/30 dark:border-slate-600/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${tag.total_pnl >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                      <Badge
                        variant="outline"
                        className="bg-muted/30 border-border/50 text-slate-700 dark:text-slate-300"
                      >
                        {tag.tag_name}
                      </Badge>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{tag.trade_count} trades</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${tag.total_pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(tag.total_pnl)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{tag.win_rate}% win rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Performance */}
      {monthly_performance && monthly_performance.length > 0 && (
        <Card className="rounded-xl border bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 text-card-foreground shadow-lg backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Monthly Performance Trends
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                  Track your trading performance over time
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3">
              {monthly_performance.slice(-6).map((month, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 rounded-lg bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 border border-slate-200/30 dark:border-slate-600/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full ${month.total_pnl >= 0 ? "bg-green-500" : "bg-red-500"} shadow-lg`}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-100 text-lg">{month.month}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-lg ${month.total_pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(month.total_pnl)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{month.trade_count} trades</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
