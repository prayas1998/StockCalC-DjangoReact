import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Tag as TagIcon } from "lucide-react";
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
import { TradeJournalCreate, TradeStatus, TradeType, TradeTags, TradeDirection } from "@/types/journal";

// Define the form schema using zod
const tradeFormSchema = z.object({
  company_name: z.string().min(1, { message: "Company name is required" }),
  trade_type: z.nativeEnum(TradeType),
  direction: z.nativeEnum(TradeDirection),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive" }),
  entry_price: z.coerce.number().nonnegative().optional(),
  exit_price: z.coerce.number().nonnegative().optional(),
  sl: z.coerce.number().nonnegative().optional(),
  target_price: z.coerce.number().nonnegative().optional(),
  entry_date: z.date(),
  exit_date: z.date().optional(),
  status: z.nativeEnum(TradeStatus),
  personal_notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
}).refine(
  (data) => (data.entry_price && data.entry_price > 0) || (data.exit_price && data.exit_price > 0),
  {
    message: "Either Entry Price or Exit Price (or both) must be greater than 0 (₹)",
    path: ["entry_price"],
  }
);

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
  // Initialize form with default values or provided initialData
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      company_name: initialData?.company_name || "",
      trade_type: initialData?.trade_type || TradeType.EQUITY_DELIVERY,
      direction: initialData?.direction || TradeDirection.LONG,
      quantity: initialData?.quantity || 0,
      entry_price:
        (initialData?.direction === TradeDirection.SHORT
          ? initialData?.sell_price
          : initialData?.buy_price) || 0,
      exit_price:
        (initialData?.direction === TradeDirection.SHORT
          ? initialData?.buy_price
          : initialData?.sell_price) || undefined,
      sl: initialData?.stop_loss,
      target_price: initialData?.target_price,
      entry_date: initialData?.entry_date ? new Date(initialData.entry_date) : new Date(),
      exit_date: initialData?.exit_date ? new Date(initialData.exit_date) : undefined,
      status: initialData?.status || TradeStatus.OPEN,
      personal_notes: initialData?.personal_notes || "",
      tags: initialData?.tags || [],
    },
  });

  const direction = form.watch("direction");
  const status = form.watch("status");
  const stopLoss = form.watch("sl");
  const targetPrice = form.watch("target_price");
  const entryPrice = form.watch("entry_price");

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

  // Handle form submission
  function handleSubmit(values: TradeFormValues) {
    // Convert dates to ISO strings for API
    const formattedValues = {
      ...values,
      entry_date: format(values.entry_date, "yyyy-MM-dd"),
      exit_date: values.exit_date ? format(values.exit_date, "yyyy-MM-dd") : undefined,
    };
    
    // Map entry/exit price to buy/sell price based on direction
    let buy_price, sell_price;
    if (formattedValues.direction === TradeDirection.LONG) {
      buy_price = formattedValues.entry_price;
      sell_price = formattedValues.exit_price;
    } else {
      buy_price = formattedValues.exit_price;
      sell_price = formattedValues.entry_price;
    }

    onSubmit({
      company_name: formattedValues.company_name!,
      trade_type: formattedValues.trade_type!,
      direction: formattedValues.direction!,
      quantity: formattedValues.quantity!,
      buy_price: buy_price!,
      sell_price: sell_price,
      entry_date: formattedValues.entry_date,
      status: formattedValues.status!,
      exit_date: formattedValues.exit_date,
      stop_loss: formattedValues.sl,
      target_price: formattedValues.target_price,
      personal_notes: formattedValues.personal_notes,
      tags: formattedValues.tags
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Trade Type */}
          <FormField
            control={form.control}
            name="trade_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trade Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trade type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TradeType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Trade Direction */}
          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trade Direction</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TradeDirection.LONG}>Long (Buy first, Sell later)</SelectItem>
                    <SelectItem value={TradeDirection.SHORT}>Short (Sell first, Buy later)</SelectItem>
                  </SelectContent>
                </Select>
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
                  Entry Price (₹)
                  <span className="ml-2 text-xs text-muted-foreground">
                    {direction === TradeDirection.LONG ? "(Buy Price)" : "(Sell Price)"}
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
                  Exit Price (Optional, ₹)
                  <span className="ml-2 text-xs text-muted-foreground">
                    {direction === TradeDirection.LONG ? "(Sell Price)" : "(Buy Price)"}
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
                <FormLabel>SL (Optional, ₹)</FormLabel>
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
                <FormLabel>Target Price (Optional, ₹)</FormLabel>
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

          {/* Entry Date */}
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
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
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
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Exit Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Trade Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Trade Status</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.values(TradeStatus).map((status) => (
                      <FormItem key={status} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={status} />
                        </FormControl>
                        <FormLabel className="font-normal">
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

        {/* Personal Notes */}
        <FormField
          control={form.control}
          name="personal_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any personal notes about this trade..."
                  className="resize-none min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags - Will be implemented in a future task */}
        {availableTags.length > 0 && (
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (Optional)</FormLabel>
                <FormDescription>
                  Select tags to categorize your trade
                </FormDescription>
                <FormControl>
                  <Select
                    onValueChange={(value) => {
                      const tagId = parseInt(value);
                      if (!field.value?.includes(tagId)) {
                        field.onChange([...(Array.isArray(field.value) ? field.value : []), tagId]);
                      }
                    }}
                    value=""
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()} className="flex items-center gap-2">
                          <TagIcon className="h-3 w-3 mr-1" style={{ color: tag.color }} />
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((tagId) => {
                      const tag = availableTags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted/40"
                          style={{ backgroundColor: tag.color + '33' }}
                        >
                          <TagIcon className="h-3 w-3" style={{ color: tag.color }} />
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange(field.value.filter((id) => id !== tag.id));
                            }}
                            className="text-muted-foreground hover:text-foreground ml-1"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Update Trade" : "Add Trade"}
          </Button>
        </div>
      </form>
    </Form>
  );
}