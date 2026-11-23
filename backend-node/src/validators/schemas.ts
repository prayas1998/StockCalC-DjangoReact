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
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 chars using lowercase letters, numbers, or underscores').optional(),
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
const tradeJournalBaseSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  trade_type: z.enum(['EQUITY_DELIVERY', 'EQUITY_INTRADAY']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  buy_price: z.number().min(0, 'Buy price must be non-negative').optional(),
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

export const tradeJournalCreateSchema = tradeJournalBaseSchema.superRefine((data, ctx) => {
  const { direction, status, buy_price, sell_price, stop_loss, target_price, exit_date } = data;
  const entryPrice = direction === 'LONG' ? buy_price : sell_price;

  // Direction-aware entry price requirement
  if (direction === 'LONG') {
    if (buy_price === undefined || buy_price <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buy_price'], message: 'Buy price is required and must be greater than 0 for long trades' });
    }
  } else {
    if (sell_price === undefined || sell_price <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sell_price'], message: 'Entry price (sell price) is required and must be greater than 0 for short trades' });
    }
  }

  // Status-aware exit price requirement
  if (status === 'CLOSED_MANUAL') {
    if (direction === 'LONG' && (sell_price === undefined || sell_price <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sell_price'], message: 'Exit price (sell price) is required and must be greater than 0 for manually closed long trades' });
    }
    if (direction === 'SHORT' && (buy_price === undefined || buy_price <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buy_price'], message: 'Exit price (buy price) is required and must be greater than 0 for manually closed short trades' });
    }
  }

  if (status === 'CLOSED_TARGET' && (target_price === undefined || target_price <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_price'], message: 'Target price is required and must be greater than 0 for trades closed at target' });
  }

  if (status === 'CLOSED_STOPLOSS' && (stop_loss === undefined || stop_loss <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stop_loss'], message: 'Stop loss is required and must be greater than 0 for trades closed at stop loss' });
  }

  // Exit date required for all closed statuses
  if (['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'].includes(status) && !exit_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exit_date'], message: 'Exit date is required for closed trades' });
  }

  // Price sanity checks
  if (target_price !== undefined && entryPrice !== undefined) {
    if (direction === 'LONG' && target_price <= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_price'], message: `Target price (${target_price}) must be greater than entry price (${entryPrice}) for long positions` });
    }
    if (direction === 'SHORT' && target_price >= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_price'], message: `Target price (${target_price}) must be less than entry price (${entryPrice}) for short positions` });
    }
  }

  if (stop_loss !== undefined && entryPrice !== undefined) {
    if (direction === 'LONG' && stop_loss >= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stop_loss'], message: `Stop loss (${stop_loss}) must be less than entry price (${entryPrice}) for long positions` });
    }
    if (direction === 'SHORT' && stop_loss <= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stop_loss'], message: `Stop loss (${stop_loss}) must be greater than entry price (${entryPrice}) for short positions` });
    }
  }
});

// Update schema: partial fields — cross-field sanity only when both sides are present
export const tradeJournalUpdateSchema = tradeJournalBaseSchema.partial().superRefine((data, ctx) => {
  const { direction, buy_price, sell_price, stop_loss, target_price } = data;
  if (direction === undefined) return;

  const entryPrice = direction === 'LONG' ? buy_price : sell_price;
  if (entryPrice === undefined) return;

  if (target_price !== undefined) {
    if (direction === 'LONG' && target_price <= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_price'], message: `Target price (${target_price}) must be greater than entry price (${entryPrice}) for long positions` });
    }
    if (direction === 'SHORT' && target_price >= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_price'], message: `Target price (${target_price}) must be less than entry price (${entryPrice}) for short positions` });
    }
  }

  if (stop_loss !== undefined) {
    if (direction === 'LONG' && stop_loss >= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stop_loss'], message: `Stop loss (${stop_loss}) must be less than entry price (${entryPrice}) for long positions` });
    }
    if (direction === 'SHORT' && stop_loss <= entryPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stop_loss'], message: `Stop loss (${stop_loss}) must be greater than entry price (${entryPrice}) for short positions` });
    }
  }
});

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
