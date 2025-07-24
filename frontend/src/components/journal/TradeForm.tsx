"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, X, DollarSign, CalendarDays, FileText, Settings2, Building2, Clock } from "lucide-react"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type TradeJournalCreate, TradeStatus, TradeType, type TradeTags, TradeDirection } from "@/types/journal"
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector"
import type { BrokerType, TradeType as CalculatorTradeType, PositionType } from "@/context/CalculatorContext"
import type { ValidationErrors } from "@/hooks/useFormValidationErrors"
import { ValidationFieldWrapper } from "./ValidationFieldWrapper"

// Define the form schema using zod
const tradeFormSchema = z.object({
  company_name: z.string().min(1, { message: "Company name is required" }),
  quantity: z
    .string()
    .min(1, { message: "Quantity is required" })
    .refine(
      (val) => {
        const num = Number.parseInt(val)
        return !isNaN(num) && num > 0
      },
      { message: "Quantity must be a positive number" },
    ),
  entry_price: z
    .string()
    .min(1, { message: "Entry price is required" })
    .refine(
      (val) => {
        const num = Number.parseFloat(val)
        return !isNaN(num) && num > 0
      },
      { message: "Entry price must be greater than 0" },
    ),
  exit_price: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true
        const num = Number.parseFloat(val)
        return !isNaN(num) && num >= 0
      },
      { message: "Exit price must be a valid positive number" },
    ),
  sl: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true
        const num = Number.parseFloat(val)
        return !isNaN(num) && num >= 0
      },
      { message: "Stop loss must be a valid positive number" },
    ),
  target_price: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true
        const num = Number.parseFloat(val)
        return !isNaN(num) && num >= 0
      },
      { message: "Target price must be a valid positive number" },
    ),
  entry_date: z.date(),
  exit_date: z.date().optional(),
  status: z.nativeEnum(TradeStatus),
  personal_notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
  broker: z.string().min(1, { message: "Broker is required" }),
  exchange: z.string().min(1, { message: "Exchange is required" }),
})

type TradeFormValues = z.infer<typeof tradeFormSchema>

interface TradeFormProps {
  initialData?: TradeJournalCreate
  availableTags: TradeTags[]
  onSubmit: (data: TradeJournalCreate) => void
  onCancel: () => void
  isSubmitting: boolean
  validationErrors?: ValidationErrors
  onFieldChange?: () => void
}

export function TradeForm({
  initialData,
  availableTags,
  onSubmit,
  onCancel,
  isSubmitting,
  validationErrors = {},
  onFieldChange,
}: TradeFormProps) {
  // State for broker, trade type, and position type (outside of form)
  const [selectedBroker, setSelectedBroker] = useState<BrokerType>((initialData?.broker as BrokerType) || "Dhan")
  const [selectedTradeType, setSelectedTradeType] = useState<CalculatorTradeType>(
    initialData?.trade_type === TradeType.EQUITY_INTRADAY ? "equity-intraday" : "equity-delivery",
  )
  const [selectedPositionType, setSelectedPositionType] = useState<PositionType>(
    initialData?.direction === TradeDirection.SHORT ? "short" : "long",
  )

  // Helper function to extract tag IDs from initialData
  const getInitialTagIds = () => {
    if (!initialData?.tags) return []

    // Handle both array of objects and array of numbers
    if (Array.isArray(initialData.tags)) {
      return initialData.tags.map((tag: TradeTags | number) => (typeof tag === "object" ? tag.id : tag))
    }

    return []
  }

  // Initialize form with default values or provided initialData
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      company_name: initialData?.company_name || "",
      quantity: initialData?.quantity?.toString() || "",
      entry_price:
        (selectedPositionType === "short" ? initialData?.sell_price?.toString() : initialData?.buy_price?.toString()) ||
        "",
      exit_price:
        (selectedPositionType === "short" ? initialData?.buy_price?.toString() : initialData?.sell_price?.toString()) ||
        "",
      sl: initialData?.stop_loss?.toString() || "",
      target_price: initialData?.target_price?.toString() || "",
      entry_date: initialData?.entry_date ? new Date(initialData.entry_date) : new Date(),
      exit_date: initialData?.exit_date ? new Date(initialData.exit_date) : undefined,
      status: initialData?.status || TradeStatus.OPEN,
      personal_notes: initialData?.personal_notes || "",
      tags: getInitialTagIds(),
      broker: selectedBroker,
      exchange: initialData?.exchange || "NSE",
    },
  })

  const status = form.watch("status")
  const stopLoss = form.watch("sl")
  const exchange = form.watch("exchange")
  const targetPrice = form.watch("target_price")
  const entryPrice = form.watch("entry_price")
  const selectedTags = form.watch("tags") || []
  const exitDate = form.watch("exit_date")

  // Helper functions to convert between journal and calculator types
  const calculatorToJournalTradeType = (calcType: CalculatorTradeType): TradeType => {
    switch (calcType) {
      case "equity-delivery":
        return TradeType.EQUITY_DELIVERY
      case "equity-intraday":
        return TradeType.EQUITY_INTRADAY
      default:
        return TradeType.EQUITY_DELIVERY
    }
  }

  const positionTypeToDirection = (positionType: PositionType): TradeDirection => {
    return positionType === "short" ? TradeDirection.SHORT : TradeDirection.LONG
  }

  // Handlers for broker, trade type, and position changes
  const handleBrokerChange = (newBroker: BrokerType) => {
    setSelectedBroker(newBroker)
    form.setValue("broker", newBroker)
  }

  const handleTradeTypeChange = (newTradeType: CalculatorTradeType) => {
    setSelectedTradeType(newTradeType)
  }

  const handlePositionTypeChange = (newPositionType: PositionType) => {
    setSelectedPositionType(newPositionType)
  }

  useEffect(() => {
    if (status === TradeStatus.CANCELLED) {
      form.setValue("exit_price", "")
      return
    }

    // Only auto-set exit price if validation passes
    if (
      (status === TradeStatus.CLOSED_TARGET || status === TradeStatus.CLOSED_STOPLOSS) &&
      stopLoss &&
      targetPrice &&
      entryPrice
    ) {
      const entryVal = parseFloat(entryPrice)
      const targetVal = parseFloat(targetPrice)
      const stopVal = parseFloat(stopLoss)

      if (status === TradeStatus.CLOSED_TARGET) {
        // Check if target price is provided
        if (!targetPrice || targetPrice === "" || targetVal === 0) {
          form.setError("target_price", {
            type: "manual",
            message: "Target price is required when status is 'Closed Target'"
          })
          return
        }
        
        // Validate target price vs entry price based on direction
        if (selectedPositionType === "long" && targetVal <= entryVal) {
          // Don't auto-set exit price for invalid target
          form.setError("target_price", {
            type: "manual",
            message: "Target price must be greater than entry price for long positions"
          })
          return
        } else if (selectedPositionType === "short" && targetVal >= entryVal) {
          // Don't auto-set exit price for invalid target
          form.setError("target_price", {
            type: "manual",
            message: "Target price must be less than entry price for short positions"
          })
          return
        } else {
          // Valid target price, clear errors and set exit price
          form.clearErrors("target_price")
          form.setValue("exit_price", targetPrice)
        }
      } else if (status === TradeStatus.CLOSED_STOPLOSS) {
        // Check if stop loss is provided
        if (!stopLoss || stopLoss === "" || stopVal === 0) {
          form.setError("sl", {
            type: "manual",
            message: "Stop loss is required when status is 'Closed StopLoss'"
          })
          return
        }
        
        // Validate stop loss vs entry price based on direction
        if (selectedPositionType === "long" && stopVal >= entryVal) {
          // Don't auto-set exit price for invalid stop loss
          form.setError("sl", {
            type: "manual",
            message: "Stop loss must be less than entry price for long positions"
          })
          return
        } else if (selectedPositionType === "short" && stopVal <= entryVal) {
          // Don't auto-set exit price for invalid stop loss
          form.setError("sl", {
            type: "manual",
            message: "Stop loss must be greater than entry price for short positions"
          })
          return
        } else {
          // Valid stop loss, clear errors and set exit price
          form.clearErrors("sl")
          form.setValue("exit_price", stopLoss)
        }
      }
    }
  }, [status, stopLoss, targetPrice, entryPrice, selectedPositionType, form])

  // Auto-fill exit date when status changes to closed
  useEffect(() => {
    const isClosedStatus =
      status === TradeStatus.CLOSED_TARGET ||
      status === TradeStatus.CLOSED_STOPLOSS ||
      status === TradeStatus.CLOSED_MANUAL

    // Only auto-fill if the trade is being closed and exit date is not already set
    if (isClosedStatus && !exitDate) {
      form.setValue("exit_date", new Date())
    }
  }, [status, exitDate, form])

  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    const id = Number.parseInt(tagId)
    const currentTags = form.getValues("tags") || []

    if (!currentTags.includes(id)) {
      form.setValue("tags", [...currentTags, id])
    }
  }

  // Handle tag removal
  const handleTagRemove = (tagId: number) => {
    const currentTags = form.getValues("tags") || []
    form.setValue(
      "tags",
      currentTags.filter((id) => id !== tagId),
    )
  }

  // Get available tags for selection (excluding already selected ones)
  const getAvailableTagsForSelection = () => {
    const currentTags = form.getValues("tags") || []
    return availableTags.filter((tag) => !currentTags.includes(tag.id))
  }

  // Centralized scroll to error field function
  const scrollToErrorField = (fieldName: string) => {
    setTimeout(() => {
      const selectors = [
        `[name="${fieldName}"]`,
        `[data-field="${fieldName}"]`,
        `input[name="${fieldName}"]`,
        `select[name="${fieldName}"]`,
        `textarea[name="${fieldName}"]`
      ]
      
      let element: HTMLElement | null = null
      for (const selector of selectors) {
        element = document.querySelector(selector)
        if (element) break
      }
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
      }
    }, 100)
  }

  // Handle form submission
  function handleSubmit(values: TradeFormValues) {
    // Re-validate the current form state before submission
    const entryVal = parseFloat(values.entry_price)
    const targetVal = values.target_price ? parseFloat(values.target_price) : null
    const stopVal = values.sl ? parseFloat(values.sl) : null
    const currentStatus = values.status

    // Validate target price if status is CLOSED_TARGET
    if (currentStatus === TradeStatus.CLOSED_TARGET) {
      // Target price is REQUIRED for CLOSED_TARGET status
      if (!values.target_price || values.target_price === "" || targetVal === null || targetVal === 0) {
        form.setError("target_price", {
          type: "manual",
          message: "Target price is required when status is 'Closed Target'"
        })
        scrollToErrorField("target_price")
        return
      }
      
      // Validate target price vs entry price
      if (selectedPositionType === "long" && targetVal <= entryVal) {
        form.setError("target_price", {
          type: "manual",
          message: "Target price must be greater than entry price for long positions"
        })
        scrollToErrorField("target_price")
        return
      } else if (selectedPositionType === "short" && targetVal >= entryVal) {
        form.setError("target_price", {
          type: "manual",
          message: "Target price must be less than entry price for short positions"
        })
        scrollToErrorField("target_price")
        return
      }
    }

    // Validate stop loss if status is CLOSED_STOPLOSS
    if (currentStatus === TradeStatus.CLOSED_STOPLOSS) {
      // Stop loss is REQUIRED for CLOSED_STOPLOSS status
      if (!values.sl || values.sl === "" || stopVal === null || stopVal === 0) {
        form.setError("sl", {
          type: "manual",
          message: "Stop loss is required when status is 'Closed StopLoss'"
        })
        scrollToErrorField("sl")
        return
      }
      
      // Validate stop loss vs entry price
      if (selectedPositionType === "long" && stopVal >= entryVal) {
        form.setError("sl", {
          type: "manual",
          message: "Stop loss must be less than entry price for long positions"
        })
        scrollToErrorField("sl")
        return
      } else if (selectedPositionType === "short" && stopVal <= entryVal) {
        form.setError("sl", {
          type: "manual",
          message: "Stop loss must be greater than entry price for short positions"
        })
        scrollToErrorField("sl")
        return
      }
    }

    // Check for any remaining form errors
    const formErrors = form.formState.errors
    if (Object.keys(formErrors).length > 0) {
      const firstErrorField = Object.keys(formErrors)[0]
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorField}"], [data-field="${firstErrorField}"]`) as HTMLElement
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }, 100)
      return
    }

    // Get trade type and direction from external state
    const tradeType = calculatorToJournalTradeType(selectedTradeType)
    const direction = positionTypeToDirection(selectedPositionType)

    // Convert string values to numbers
    const quantity = Number.parseInt(values.quantity)
    const entryPrice = Number.parseFloat(values.entry_price)
    const exitPrice = values.exit_price && values.exit_price !== "" ? Number.parseFloat(values.exit_price) : undefined
    const stopLoss = values.sl && values.sl !== "" ? Number.parseFloat(values.sl) : undefined
    const targetPrice =
      values.target_price && values.target_price !== "" ? Number.parseFloat(values.target_price) : undefined

    // Convert dates to ISO strings for API
    const formattedValues = {
      ...values,
      entry_date: format(values.entry_date, "yyyy-MM-dd"),
      exit_date: values.exit_date ? format(values.exit_date, "yyyy-MM-dd") : undefined,
    }

    // Smart mapping based on trade direction and status
    let buy_price, sell_price
    if (direction === TradeDirection.LONG) {
      // Long trades: Entry price = Buy price, Exit price = Sell price
      buy_price = entryPrice
      // For LONG trades, only set sell_price for CLOSED_MANUAL status
      // For CLOSED_TARGET/CLOSED_STOPLOSS, exit price comes from target_price/stop_loss
      if (formattedValues.status === 'CLOSED_MANUAL') {
        sell_price = exitPrice || undefined
      } else {
        sell_price = undefined
      }
    } else {
      // Short trades: Entry price = Sell price, Exit price = Buy price
      sell_price = entryPrice
      // For SHORT trades, only set buy_price for CLOSED_MANUAL status
      // For CLOSED_TARGET/CLOSED_STOPLOSS, exit price comes from target_price/stop_loss
      if (formattedValues.status === 'CLOSED_MANUAL') {
        buy_price = exitPrice || undefined
      } else {
        buy_price = undefined
      }
    }

    onSubmit({
      company_name: formattedValues.company_name!,
      trade_type: tradeType,
      direction: direction,
      quantity: quantity,
      buy_price: buy_price!,
      sell_price: sell_price,
      entry_date: formattedValues.entry_date,
      status: formattedValues.status!,
      exit_date: formattedValues.exit_date,
      stop_loss: stopLoss,
      target_price: targetPrice,
      personal_notes: formattedValues.personal_notes,
      tags: formattedValues.tags || [],
      broker: selectedBroker,
      exchange: formattedValues.exchange,
    })
  }

  const handleFieldChange = (fieldName: string, onChange: (value: string) => void) => (value: string) => {
    onChange(value)
    // Clear backend validation errors when user changes field
    if (onFieldChange && validationErrors[fieldName]) {
      onFieldChange()
    }
    // Clear form errors for this field when user changes it
    if (form.formState.errors[fieldName]) {
      form.clearErrors(fieldName as keyof TradeFormValues)
    }
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Trade Configuration Card */}
          <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                Trade Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Broker Selector with Exchange Toggle */}
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">Broker & Exchange</FormLabel>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <BrokerTradeTypeSelector
                      selectedBroker={selectedBroker}
                      selectedTradeType={selectedTradeType}
                      onBrokerChange={handleBrokerChange}
                      onTradeTypeChange={handleTradeTypeChange}
                      positionType={selectedPositionType}
                      onPositionTypeChange={handlePositionTypeChange}
                      compact={true}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="exchange"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex rounded-lg border bg-background p-1">
                            <Button
                              type="button"
                              variant={field.value === "NSE" ? "default" : "ghost"}
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => field.onChange("NSE")}
                            >
                              NSE
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "BSE" ? "default" : "ghost"}
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => field.onChange("BSE")}
                            >
                              BSE
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Company Name */}
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Price & Quantity Card */}
          <Card className="border-l-4 border-l-green-500 dark:border-l-green-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-green-500 dark:text-green-400" />
                Price & Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Quantity</FormLabel>
                      <FormControl>
                        <NumericInput
                          placeholder="Enter quantity"
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          allowDecimal={false}
                          min={1}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Entry Price */}
                <FormField
                  control={form.control}
                  name="entry_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Entry Price
                        <span className="ml-1 text-xs text-muted-foreground">
                          {selectedPositionType === "long" ? "(Buy)" : "(Sell)"}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <NumericInput
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          allowDecimal={true}
                          min={0.01}
                          maxDecimalPlaces={2}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Exit Price */}
                <FormField
                  control={form.control}
                  name="exit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Exit Price
                        <span className="ml-1 text-xs text-muted-foreground">
                          {selectedPositionType === "long" ? "(Sell)" : "(Buy)"}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <NumericInput
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          allowDecimal={true}
                          min={0.01}
                          maxDecimalPlaces={2}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stop Loss */}
                <FormField
                  control={form.control}
                  name="sl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Stop Loss</FormLabel>
                      <FormControl>
                        <ValidationFieldWrapper error={validationErrors.stop_loss} fieldName="stop_loss">
                          <NumericInput
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={handleFieldChange("stop_loss", field.onChange)}
                            allowDecimal={true}
                            min={0.01}
                            maxDecimalPlaces={2}
                            className={cn(
                              "h-10",
                              validationErrors.stop_loss
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "",
                            )}
                            data-field="sl"
                          />
                        </ValidationFieldWrapper>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target Price */}
                <FormField
                  control={form.control}
                  name="target_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Target Price</FormLabel>
                      <FormControl>
                        <ValidationFieldWrapper error={validationErrors.target_price} fieldName="target_price">
                          <NumericInput
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={handleFieldChange("target_price", field.onChange)}
                            allowDecimal={true}
                            min={0.01}
                            maxDecimalPlaces={2}
                            className={cn(
                              "h-10",
                              validationErrors.target_price
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "",
                            )}
                            data-field="target_price"
                          />
                        </ValidationFieldWrapper>
                      </FormControl>
                      <FormMessage>
                        {validationErrors.target_price && (
                          <span className="text-red-500 text-sm font-medium">
                            {validationErrors.target_price}
                          </span>
                        )}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Trade Status Card */}
          <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                Trade Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Current Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 md:grid-cols-6 gap-2"
                      >
                        {Object.values(TradeStatus).map((status) => (
                          <FormItem
                            key={status}
                            className="flex items-center space-x-2 space-y-0 p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <FormControl>
                              <RadioGroupItem value={status} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer text-xs">
                              {status.replace("_", " ")}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                Trade Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Entry Date */}
                <FormField
                  control={form.control}
                  name="entry_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm">Entry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal justify-between h-10",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <span>{field.value ? format(field.value, "MMM d, yyyy") : "Select entry date"}</span>
                              <CalendarIcon className="h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Select the date you entered this trade</span>
                            </div>
                          </div>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                            showOutsideDays={false}
                          />
                          <div className="p-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange(new Date())}
                              className="w-full"
                            >
                              Today
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Exit Date */}
                <FormField
                  control={form.control}
                  name="exit_date"
                  render={({ field }) => {
                    const isClosedStatus =
                      status === TradeStatus.CLOSED_TARGET ||
                      status === TradeStatus.CLOSED_STOPLOSS ||
                      status === TradeStatus.CLOSED_MANUAL

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm">
                          Exit Date
                          {!isClosedStatus && <span className="text-muted-foreground"> (Optional)</span>}
                          {isClosedStatus && <span className="text-red-500"> *</span>}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal justify-between h-10",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <span>
                                  {field.value
                                    ? format(field.value, "MMM d, yyyy")
                                    : isClosedStatus
                                      ? "Select exit date"
                                      : "No exit date (trade open)"}
                                </span>
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <div className="p-3 border-b">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {isClosedStatus
                                    ? "When did you close this trade?"
                                    : "When will you exit this trade? (optional)"}
                                </span>
                              </div>
                            </div>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                              showOutsideDays={false}
                            />
                            <div className="p-3 border-t space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => field.onChange(new Date())}
                                className="w-full"
                              >
                                Today
                              </Button>
                              {!isClosedStatus && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => field.onChange(undefined)}
                                  className="w-full"
                                >
                                  Clear Date
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {isClosedStatus && (
                          <FormDescription className="text-xs">Exit date is required for closed trades</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes & Tags Card */}
          <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                Notes & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Personal Notes */}
              <FormField
                control={form.control}
                name="personal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Personal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add notes about strategy, market conditions, lessons learned..."
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              {availableTags.length > 0 && (
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Tags</FormLabel>
                      <FormDescription className="text-sm">
                        Select tags to categorize and organize your trades
                      </FormDescription>

                      {/* Tag Selection Dropdown */}
                      {getAvailableTagsForSelection().length > 0 && (
                        <Select onValueChange={handleTagSelect} value="">
                          <FormControl>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Add tags..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableTagsForSelection().map((tag) => (
                              <SelectItem key={tag.id} value={tag.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                  {tag.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Selected Tags Display */}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTags.map((tagId) => {
                            const tag = availableTags.find((t) => t.id === tagId)
                            if (!tag) return null
                            return (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
                                style={{
                                  backgroundColor: tag.color + "15",
                                  borderColor: tag.color + "40",
                                  color: tag.color,
                                }}
                              >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                                <button
                                  type="button"
                                  onClick={() => handleTagRemove(tag.id)}
                                  className="ml-1 hover:text-destructive transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t bg-muted/30 dark:bg-muted/20 -mx-6 px-6 py-4 rounded-b-lg">
            <div className="text-sm text-muted-foreground">
              {initialData ? "Update your trade details" : "All required fields must be filled"}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="min-w-[100px] bg-transparent"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px] bg-primary hover:bg-primary/90">
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : initialData ? (
                  "Update Trade"
                ) : (
                  "Add Trade"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
