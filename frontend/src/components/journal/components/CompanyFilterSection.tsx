"use client"

/**
 * CompanyFilterSection Component
 * Handles company name filtering with search suggestions
 */

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Building2, X, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchSuggestions } from "./SearchSuggestions"
import type { TradeJournal } from "@/types/journal"
import { searchJournalTrades } from "@/services/journalApi"

interface CompanySuggestion {
  id: string
  text: string
  type: "company"
  score: number
}

interface CompanyFilterSectionProps {
  selectedCompanies: string[]
  trades: TradeJournal[]
  onCompanyChange: (companies: string[]) => void
}

export const CompanyFilterSection: React.FC<CompanyFilterSectionProps> = ({
  selectedCompanies,
  trades,
  onCompanyChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch company suggestions from server
  useEffect(() => {
    const fetchCompanySuggestions = async () => {
      if (searchQuery.length < 1) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      setIsLoadingSuggestions(true)
      try {
        const result = await searchJournalTrades(searchQuery)

        if ("error" in result) {
          console.error("Failed to fetch company suggestions:", result.error)
          setSuggestions([])
        } else {
          // Extract unique company names from search results
          const companySet = new Set<string>()
          const companySuggestions: CompanySuggestion[] = []
          ;(result.results || []).forEach((trade) => {
            if (!companySet.has(trade.company_name)) {
              companySet.add(trade.company_name)
              companySuggestions.push({
                id: `company-${trade.company_name}`,
                text: trade.company_name,
                type: "company",
                score: 0, // Will be calculated in sorting logic below
              })
            }
          })

          // Calculate scores and sort company suggestions by match quality
          const query = searchQuery.toLowerCase()
          
          companySuggestions.forEach((suggestion) => {
            const text = suggestion.text.toLowerCase()
            
            // Calculate score based on match quality (higher is better)
            if (text === query) {
              suggestion.score = 100 // Exact match
            } else if (text.startsWith(query)) {
              suggestion.score = 80 // Prefix match
            } else if (text.includes(query)) {
              suggestion.score = 60 // Substring match
            } else {
              suggestion.score = 0 // No match (shouldn't happen in this context)
            }
          })
          
          const sortedSuggestions = companySuggestions.sort((a, b) => {
            // Sort by score (descending), then alphabetically
            if (a.score !== b.score) {
              return b.score - a.score
            }
            return a.text.localeCompare(b.text)
          })

          setSuggestions(sortedSuggestions.slice(0, 10)) // Increased limit for better UX
          setShowSuggestions(sortedSuggestions.length > 0)
        }
      } catch (error) {
        console.error("Error fetching company suggestions:", error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    const timeoutId = setTimeout(fetchCompanySuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break

      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break

      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const suggestion = suggestions[selectedIndex]
          addCompany(suggestion.text)
          setSearchQuery("")
          setShowSuggestions(false)
          setSelectedIndex(-1)
        } else if (suggestions.length > 0) {
          // Select first suggestion if none selected
          addCompany(suggestions[0].text)
          setSearchQuery("")
          setShowSuggestions(false)
          setSelectedIndex(-1)
        }
        break

      case "Escape":
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (index: number) => {
    if (index >= 0 && index < suggestions.length) {
      const suggestion = suggestions[index]
      addCompany(suggestion.text)
      setSearchQuery("")
      setShowSuggestions(false)
      setSelectedIndex(-1)
      inputRef.current?.focus()
    }
  }

  // Add company to selected list
  const addCompany = useCallback(
    (companyName: string) => {
      if (!selectedCompanies.includes(companyName)) {
        onCompanyChange([...selectedCompanies, companyName])
      }
    },
    [selectedCompanies, onCompanyChange],
  )

  // Remove company from selected list
  const removeCompany = useCallback(
    (companyName: string) => {
      onCompanyChange(selectedCompanies.filter((c) => c !== companyName))
    },
    [selectedCompanies, onCompanyChange],
  )

  // Handle input focus
  const handleInputFocus = () => {
    if (suggestions.length > 0 && searchQuery.length >= 1) {
      setShowSuggestions(true)
    }
  }

  // Handle input blur
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 200)
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search company names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="pl-8 pr-8 h-9 text-xs"
            aria-label="Search companies"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {isLoadingSuggestions ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : searchQuery ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-transparent"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            ) : (
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Company Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="relative z-50">
            <SearchSuggestions
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSuggestionClick={handleSuggestionClick}
              className="absolute top-1 left-0 right-0"
            />
          </div>
        )}
      </div>

      {/* Selected Companies */}
      {selectedCompanies.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {selectedCompanies.map((company) => (
              <Badge
                key={company}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300"
              >
                {company}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1.5 hover:bg-transparent"
                  onClick={() => removeCompany(company)}
                  aria-label={`Remove ${company} filter`}
                >
                  <X className="h-3 w-3 hover:text-destructive" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quick Select Popular Companies */}
      {selectedCompanies.length === 0 && !searchQuery && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Popular companies</div>
          <div className="flex flex-wrap gap-1.5">
            {getPopularCompanies(trades).map((company) => (
              <Badge
                key={company}
                variant="outline"
                className="text-xs px-2 py-0.5 cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors dark:hover:bg-blue-900/20 dark:hover:border-blue-700/50 dark:hover:text-blue-300"
                onClick={() => addCompany(company)}
              >
                <Building2 className="h-3 w-3 mr-1" />
                {company}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get popular companies from trades
function getPopularCompanies(trades: TradeJournal[]): string[] {
  const companyCounts = new Map<string, number>()

  trades.forEach((trade) => {
    const count = companyCounts.get(trade.company_name) || 0
    companyCounts.set(trade.company_name, count + 1)
  })

  return Array.from(companyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((entry) => entry[0])
}
