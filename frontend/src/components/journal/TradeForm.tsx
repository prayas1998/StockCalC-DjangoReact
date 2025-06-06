import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
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
import { TradeJournalCreate, TradeStatus, TradeType, TradeTags } from "@/types/journal";

// Define the form schema using zod
const tradeFormSchema = z.object({
  company_name: z.string().min(1, { message: "Company name is required" }),
  trade_type: z.nativeEnum(TradeType),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive" }),
  buy_price: z.coerce.number().nonnegative().optional(),
  sell_price: z.coerce.number().nonnegative().optional(),
  stop_loss: z.coerce.number().nonnegative().optional(),
  target_price: z.coerce.number().nonnegative().optional(),
  entry_date: z.date(),
  exit_date: z.date().optional(),
  status: z.nativeEnum(TradeStatus),
  personal_notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
}).refine(
  (data) => (data.buy_price && data.buy_price > 0) || (data.sell_price && data.sell_price > 0),
  {
    message: "Either Buy Price or Sell Price (or both) must be greater than 0 (₹)",
    path: ["buy_price"],
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
      quantity: initialData?.quantity || 0,
      buy_price: initialData?.buy_price || 0,
      sell_price: initialData?.sell_price,
      stop_loss: initialData?.stop_loss,
      target_price: initialData?.target_price,
      entry_date: initialData?.entry_date ? new Date(initialData.entry_date) : new Date(),
      exit_date: initialData?.exit_date ? new Date(initialData.exit_date) : undefined,
      status: initialData?.status || TradeStatus.OPEN,
      personal_notes: initialData?.personal_notes || "",
      tags: initialData?.tags || [],
    },
  });

  // Handle form submission
  function handleSubmit(values: TradeFormValues) {
    // Convert dates to ISO strings for API
    const formattedValues = {
      ...values,
      entry_date: format(values.entry_date, "yyyy-MM-dd"),
      exit_date: values.exit_date ? format(values.exit_date, "yyyy-MM-dd") : undefined,
    };
    
    onSubmit({
      company_name: formattedValues.company_name!,
      trade_type: formattedValues.trade_type!,
      quantity: formattedValues.quantity!,
      buy_price: formattedValues.buy_price!,
      entry_date: formattedValues.entry_date,
      status: formattedValues.status!,
      exit_date: formattedValues.exit_date,
      sell_price: formattedValues.sell_price,
      stop_loss: formattedValues.stop_loss,
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

          {/* Buy Price */}
          <FormField
            control={form.control}
            name="buy_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buy Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sell Price */}
          <FormField
            control={form.control}
            name="sell_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell Price (Optional, ₹)</FormLabel>
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

          {/* Stop Loss */}
          <FormField
            control={form.control}
            name="stop_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stop Loss (Optional, ₹)</FormLabel>
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
                        field.onChange([...(field.value || []), tagId]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>
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
                        <div
                          key={tag.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                          style={{ backgroundColor: tag.color + "33" }}
                        >
                          <span>{tag.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange(
                                field.value?.filter((id) => id !== tag.id)
                              );
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
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