import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Tag as TagIcon, X, Clock } from "lucide-react";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { TradeJournalCreate, TradeStatus, TradeType, TradeTags, TradeDirection } from "@/types/journal";
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector";
import { BrokerType, TradeType as CalculatorTradeType, PositionType } from "@/context/CalculatorContext";

// Define the form schema using zod
const tradeFormSchema = z.object({
  company_name: z.string().min(1, { message: "Company name is required" }),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive" }),
  entry_price: z.coerce.number().min(0.01, { message: "Entry price must be greater than 0" }),
  exit_price: z.coerce.number().nonnegative().optional(),
  sl: z.coerce.number().nonnegative().optional(),
  target_price: z.coerce.number().nonnegative().optional(),
  entry_date: z.date(),
  exit_date: z.date().optional(),
  status: z.nativeEnum(TradeStatus),
  personal_notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
  broker: z.string().min(1, { message: "Broker is required" }),
  exchange: z.string().min(1, { message: "Exchange is required" }),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface TradeFormProps {
  initialData?: TradeJournalCreate;
  availableTags: TradeTags[];
  onSubmit: (data: TradeJournalCreate) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function TradeForm({
  initialData,
  availableTags,
  onSubmit,
  onCancel,
  isSubmitting,
}: TradeFormProps) {
  // State for broker, trade type, and position type (outside of form)
  const [selectedBroker, setSelectedBroker] = useState<BrokerType>(
    (initialData?.broker as BrokerType) || "Dhan"
  );
  const [selectedTradeType, setSelectedTradeType] = useState<CalculatorTradeType>(
    initialData?.trade_type === TradeType.EQUITY_INTRADAY ? 'equity-intraday' : 'equity-delivery'
  );
  const [selectedPositionType, setSelectedPositionType] = useState<PositionType>(
    initialData?.direction === TradeDirection.SHORT ? 'short' : 'long'
  );

  // Helper function to extract tag IDs from initialData
  const getInitialTagIds = () => {
    if (!initialData?.tags) return [];
    
    // Handle both array of objects and array of numbers
    if (Array.isArray(initialData.tags)) {
      return initialData.tags.map((tag: any) => 
        typeof tag === 'object' ? tag.id : tag
      );
    }
    
    return [];
  };

  // Initialize form with default values or provided initialData
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      company_name: initialData?.company_name || "",
      quantity: initialData?.quantity || 0,
      entry_price:
        (selectedPositionType === 'short'
          ? initialData?.sell_price
          : initialData?.buy_price) || 1,
      exit_price:
        (selectedPositionType === 'short'
          ? initialData?.buy_price
          : initialData?.sell_price) || undefined,
      sl: initialData?.stop_loss,
      target_price: initialData?.target_price,
      entry_date: initialData?.entry_date ? new Date(initialData.entry_date) : new Date(),
      exit_date: initialData?.exit_date ? new Date(initialData.exit_date) : undefined,
      status: initialData?.status || TradeStatus.OPEN,
      personal_notes: initialData?.personal_notes || "",
      tags: getInitialTagIds(),
      broker: selectedBroker,
      exchange: initialData?.exchange || "NSE",
    },
  });

  const status = form.watch("status");
  const stopLoss = form.watch("sl");
  const exchange = form.watch("exchange");
  const targetPrice = form.watch("target_price");
  const entryPrice = form.watch("entry_price");
  const selectedTags = form.watch("tags") || [];
  const exitDate = form.watch("exit_date");

  // Helper functions to convert between journal and calculator types
  const calculatorToJournalTradeType = (calcType: CalculatorTradeType): TradeType => {
    switch (calcType) {
      case 'equity-delivery':
        return TradeType.EQUITY_DELIVERY;
      case 'equity-intraday':
        return TradeType.EQUITY_INTRADAY;
      default:
        return TradeType.EQUITY_DELIVERY;
    }
  };

  const positionTypeToDirection = (positionType: PositionType): TradeDirection => {
    return positionType === 'short' ? TradeDirection.SHORT : TradeDirection.LONG;
  };

  // Handlers for broker, trade type, and position changes
  const handleBrokerChange = (newBroker: BrokerType) => {
    setSelectedBroker(newBroker);
    form.setValue("broker", newBroker);
  };

  const handleTradeTypeChange = (newTradeType: CalculatorTradeType) => {
    setSelectedTradeType(newTradeType);
  };

  const handlePositionTypeChange = (newPositionType: PositionType) => {
    setSelectedPositionType(newPositionType);
  };

  useEffect(() => {
    if (
      (status === TradeStatus.CLOSED_TARGET || status === TradeStatus.CLOSED_STOPLOSS) &&
      stopLoss && targetPrice && entryPrice
    ) {
      if (status === TradeStatus.CLOSED_TARGET) {
        form.setValue("exit_price", targetPrice);
      } else if (status === TradeStatus.CLOSED_STOPLOSS) {
        form.setValue("exit_price", stopLoss);
      }
    } else if (status === TradeStatus.CANCELLED) {
      form.setValue("exit_price", undefined);
    }
  }, [status, stopLoss, targetPrice, entryPrice, form]);

  // Auto-fill exit date when status changes to closed
  useEffect(() => {
    const isClosedStatus = status === TradeStatus.CLOSED_TARGET || 
                          status === TradeStatus.CLOSED_STOPLOSS || 
                          status === TradeStatus.CLOSED_MANUAL;
    
    // Only auto-fill if the trade is being closed and exit date is not already set
    if (isClosedStatus && !exitDate) {
      form.setValue("exit_date", new Date());
    }
  }, [status, exitDate, form]);

  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    const id = parseInt(tagId);
    const currentTags = form.getValues("tags") || [];
    
    if (!currentTags.includes(id)) {
      form.setValue("tags", [...currentTags, id]);
    }
  };

  // Handle tag removal
  const handleTagRemove = (tagId: number) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(id => id !== tagId));
  };

  // Get available tags for selection (excluding already selected ones)
  const getAvailableTagsForSelection = () => {
    const currentTags = form.getValues("tags") || [];
    return availableTags.filter(tag => !currentTags.includes(tag.id));
  };

  // Handle form submission
  function handleSubmit(values: TradeFormValues) {
    // Get trade type and direction from external state
    const tradeType = calculatorToJournalTradeType(selectedTradeType);
    const direction = positionTypeToDirection(selectedPositionType);

    // Convert dates to ISO strings for API
    const formattedValues = {
      ...values,
      entry_date: format(values.entry_date, "yyyy-MM-dd"),
      exit_date: values.exit_date ? format(values.exit_date, "yyyy-MM-dd") : undefined,
    };
    
    // Map entry/exit price to buy/sell price based on direction
    let buy_price, sell_price;
    if (direction === TradeDirection.LONG) {
      buy_price = formattedValues.entry_price!; // Entry price is required by validation
      sell_price = formattedValues.exit_price || undefined;
    } else {
      // For short positions: entry_price is the sell price, exit_price is the buy price
      // Note: buy_price is required by model, so we need to provide a value even for open short positions
      sell_price = formattedValues.entry_price!;
      buy_price = formattedValues.exit_price || formattedValues.entry_price!; // Use entry_price as placeholder for open short positions
    }

    onSubmit({
      company_name: formattedValues.company_name!,
      trade_type: tradeType,
      direction: direction,
      quantity: formattedValues.quantity!,
      buy_price: buy_price!,
      sell_price: sell_price,
      entry_date: formattedValues.entry_date,
      status: formattedValues.status!,
      exit_date: formattedValues.exit_date,
      stop_loss: formattedValues.sl,
      target_price: formattedValues.target_price,
      personal_notes: formattedValues.personal_notes,
      tags: formattedValues.tags || [],
      broker: selectedBroker,
      exchange: formattedValues.exchange
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Basic Trade Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
          </div>
          
          {/* Broker and Trade Type Selector */}
          <div>
            <FormLabel className="text-base mb-3 block">Broker & Trade Configuration</FormLabel>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exchange Selector */}
            <FormField
              control={form.control}
              name="exchange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NSE">NSE</SelectItem>
                      <SelectItem value="BSE">BSE</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company Name */}
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Price Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">Price Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Quantity */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Enter quantity" {...field} />
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
                <FormLabel>
                  Entry Price
                  <span className="ml-2 text-xs text-muted-foreground">
                    {selectedPositionType === 'long' ? "(Buy Price)" : "(Sell Price)"}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
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
                <FormLabel>
                  Exit Price (Optional)
                  <span className="ml-2 text-xs text-muted-foreground">
                    {selectedPositionType === 'long' ? "(Sell Price)" : "(Buy Price)"}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SL */}
          <FormField
            control={form.control}
            name="sl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stop Loss (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
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
                <FormLabel>Target Price (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>
        </div>

        {/* Date Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">Trade Dates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Entry Date - Enhanced */}
          <FormField
            control={form.control}
            name="entry_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Entry Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <span>
                          {field.value ? (
                            format(field.value, "EEE, MMM d, yyyy")
                          ) : (
                            "Select entry date"
                          )}
                        </span>
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
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
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

          {/* Exit Date - Enhanced */}
          <FormField
            control={form.control}
            name="exit_date"
            render={({ field }) => {
              const isClosedStatus = status === TradeStatus.CLOSED_TARGET || 
                                   status === TradeStatus.CLOSED_STOPLOSS || 
                                   status === TradeStatus.CLOSED_MANUAL;
              
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>
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
                            "w-full pl-3 text-left font-normal justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span>
                            {field.value ? (
                              format(field.value, "EEE, MMM d, yyyy")
                            ) : isClosedStatus ? (
                              "Select exit date"
                            ) : (
                              "No exit date (trade open)"
                            )}
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
                              : "When will you exit this trade? (optional)"
                            }
                          </span>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
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
                    <FormDescription className="text-xs">
                      Exit date is required for closed trades
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          </div>
        </div>

        {/* Trade Status Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">Trade Status</h3>
          </div>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-base">Current Status</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.values(TradeStatus).map((status) => (
                        <FormItem key={status} className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <FormControl>
                            <RadioGroupItem value={status} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {status.replace("_", " ")}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">Additional Information</h3>
          </div>
          
          {/* Personal Notes */}
          <FormField
            control={form.control}
            name="personal_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any personal notes about this trade, strategy, market conditions, lessons learned, etc..."
                    className="resize-none min-h-[120px]"
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
                  <FormLabel className="text-base">Tags (Optional)</FormLabel>
                  <FormDescription className="text-sm">
                    Select tags to categorize and organize your trades
                  </FormDescription>
                  
                  {/* Tag Selection Dropdown */}
                  {getAvailableTagsForSelection().length > 0 && (
                    <Select
                      onValueChange={handleTagSelect}
                      value=""
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select tags to add" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailableTagsForSelection().map((tag) => (
                          <SelectItem key={tag.id} value={tag.id.toString()}>
                            <div className="flex items-center gap-2">
                              <TagIcon className="h-3 w-3" style={{ color: tag.color }} />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* Selected Tags Display */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/30 rounded-lg">
                      {selectedTags.map((tagId) => {
                        const tag = availableTags.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-3 py-1.5 text-sm"
                            style={{ 
                              backgroundColor: tag.color + '20',
                              borderColor: tag.color,
                              color: tag.color
                            }}
                          >
                            <TagIcon className="h-3 w-3" style={{ color: tag.color }} />
                            {tag.name}
                            <button
                              type="button"
                              onClick={() => handleTagRemove(tag.id)}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t bg-muted/20 -mx-6 px-6 py-4 mt-8">
          <div className="text-sm text-muted-foreground">
            {initialData ? "Make changes and click Update to save" : "Fill in the required fields and click Add Trade"}
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[120px] bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                initialData ? "Update Trade" : "Add Trade"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}