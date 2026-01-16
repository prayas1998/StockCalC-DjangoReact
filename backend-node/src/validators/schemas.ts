import { z } from 'zod';

// Calculation request validation
export const calculationRequestSchema = z.object({
  // Django parity: calculation view normalizes platform/exchange casing.
  platform: z.string().min(1, 'Platform is required').default('groww').transform((v) => v.toLowerCase()),
  exchange: z.string().min(1, 'Exchange is required').default('NSE').transform((v) => v.toUpperCase()),
  tradeType: z.string().min(1, 'Trade type is required').default('equity-delivery'),
  transactions: z.array(z.object({
    // Django parity: Django accepts numbers and many valid Decimal(str(x)) string forms
    // (e.g. ".5", "10.", "1e-2"). Accept those here too.
    quantity: z.union([z.string(), z.number()])
      .transform((v) => typeof v === 'number' ? String(v) : v.trim())
      .refine((v) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v), {
        message: 'Quantity must be a numeric value'
      }),
    buyPrice: z.union([z.string(), z.number()])
      .transform((v) => typeof v === 'number' ? String(v) : v.trim())
      .refine((v) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v), {
        message: 'Buy price must be a numeric value'
      }),
    sellPrice: z.union([z.string(), z.number()])
      .transform((v) => typeof v === 'number' ? String(v) : v.trim())
      .refine((v) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v), {
        message: 'Sell price must be a numeric value'
      })
  })).min(1, 'At least one transaction is required'),
  positionType: z.enum(['long', 'short']).default('long')
});

// Profile update validation
export const profileUpdateSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  first_name: z.string().min(1, 'First name must be at least 1 character').optional(),
  last_name: z.string().min(1, 'Last name must be at least 1 character').optional()
});

// Password change validation
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

// Journal trade validation
export const tradeJournalCreateSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  trade_type: z.enum(['EQUITY_DELIVERY', 'EQUITY_INTRADAY']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  buy_price: z.number().min(0, 'Buy price must be non-negative'),
  sell_price: z.number().min(0, 'Sell price must be non-negative').optional(),
  stop_loss: z.number().min(0, 'Stop loss must be non-negative').optional(),
  target_price: z.number().min(0, 'Target price must be non-negative').optional(),
  entry_date: z.string().min(1, 'Entry date is required'),
  exit_date: z.string().min(1, 'Exit date is required').optional(),
  status: z.enum(['OPEN', 'CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL', 'CANCELLED']),
  personal_notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
  direction: z.enum(['LONG', 'SHORT']).default('LONG'),
  broker: z.enum(['Dhan', 'Groww']).default('Dhan'),
  exchange: z.enum(['NSE', 'BSE']).default('NSE')
});

export const tradeJournalUpdateSchema = tradeJournalCreateSchema.partial();

// Tag validation
export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name must be 50 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').default('#3B82F6')
});

export const tagUpdateSchema = tagCreateSchema.partial();

// Query parameter validation
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  page_size: z.string().regex(/^\d+$/).transform(Number).optional()
});

export const journalFilterSchema = z.object({
  status: z.array(z.enum(['OPEN', 'CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL', 'CANCELLED'])).optional(),
  trade_type: z.array(z.enum(['EQUITY_DELIVERY', 'EQUITY_INTRADAY'])).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  tags: z.array(z.string()).transform(val => val ? val.map(Number) : undefined).optional(),
  companies: z.array(z.string()).optional()
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be 100 characters or less')
});

export const tagAnalyticsSchema = z.object({
  tag_name: z.string().min(1, 'Tag name is required')
});

// UUID validation
export const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');

// Request context validation
export const authTokenSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/, 'Invalid authorization header format')
});

export type CalculationRequest = z.infer<typeof calculationRequestSchema>;
export type ProfileUpdateRequest = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type TradeJournalCreate = z.infer<typeof tradeJournalCreateSchema>;
export type TradeJournalUpdate = z.infer<typeof tradeJournalUpdateSchema>;
export type TagCreate = z.infer<typeof tagCreateSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type JournalFilter = z.infer<typeof journalFilterSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;
export type TagAnalyticsQuery = z.infer<typeof tagAnalyticsSchema>;
export type UUID = z.infer<typeof uuidSchema>;
export type AuthToken = z.infer<typeof authTokenSchema>;
