import { Context } from 'hono';
import { requireAuth, getAccessToken } from '../middleware/auth.js';
import { tradeJournalCreateSchema, tagCreateSchema } from '../validators/schemas.js';
import { PaginatedResponse } from '../types/index.js';
import { withUserScope } from '../services/supabase.js';

const CLOSED_STATUSES = ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'] as const;
const VALID_STATUSES = ['OPEN', 'CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL', 'CANCELLED'] as const;

const TRADE_SELECT_WITH_TAGS = `
  *,
  journal_tradejournaltags(
    tag_id,
    journal_tradetags(id, name, color, user_id, created_at)
  )
`;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function isClosedStatus(status: string): boolean {
  return CLOSED_STATUSES.includes(status as (typeof CLOSED_STATUSES)[number]);
}

function getTradeTags(trade: any): any[] {
  const tagsFromRelations = Array.isArray(trade.journal_tradejournaltags)
    ? trade.journal_tradejournaltags
        .map((relation: any) => {
          const rawTag = Array.isArray(relation.journal_tradetags)
            ? relation.journal_tradetags[0]
            : relation.journal_tradetags;
          if (!rawTag) return null;
          return {
            id: rawTag.id,
            name: rawTag.name,
            color: rawTag.color,
            user_id: rawTag.user_id ?? null,
            created_at: rawTag.created_at ?? null
          };
        })
        .filter(Boolean)
    : [];

  if (tagsFromRelations.length > 0) {
    const seen = new Set<number>();
    return tagsFromRelations.filter((tag: any) => {
      if (seen.has(tag.id)) return false;
      seen.add(tag.id);
      return true;
    });
  }

  if (Array.isArray(trade.tags)) {
    return trade.tags;
  }

  return [];
}

function getExitPrice(trade: any): number | null {
  if (trade.status === 'OPEN' || trade.status === 'CANCELLED') {
    return null;
  }

  if (trade.status === 'CLOSED_TARGET') {
    return toNumberOrNull(trade.target_price);
  }
  if (trade.status === 'CLOSED_STOPLOSS') {
    return toNumberOrNull(trade.stop_loss);
  }
  if (trade.status === 'CLOSED_MANUAL') {
    if (trade.direction === 'SHORT') {
      return toNumberOrNull(trade.buy_price);
    }
    return toNumberOrNull(trade.sell_price);
  }

  return null;
}

function getMissingFieldsForPnl(trade: any): string[] {
  const missing: string[] = [];

  if (trade.status === 'CLOSED_TARGET' && !trade.target_price) {
    missing.push('target_price');
  }
  if (trade.status === 'CLOSED_STOPLOSS' && !trade.stop_loss) {
    missing.push('stop_loss');
  }
  if (trade.status === 'CLOSED_MANUAL') {
    if (trade.direction === 'SHORT') {
      if (!trade.buy_price) missing.push('buy_price');
    } else if (!trade.sell_price) {
      missing.push('sell_price');
    }
  }

  if (isClosedStatus(trade.status) && !trade.exit_date) {
    missing.push('exit_date');
  }

  return missing;
}

function isPreciseCalculationAvailable(trade: any): boolean {
  if (trade.trade_type === 'EQUITY_INTRADAY') {
    return trade.broker === 'Dhan';
  }
  return (
    (trade.trade_type === 'EQUITY_DELIVERY' || trade.trade_type === 'EQUITY_INTRADAY') &&
    (trade.broker === 'Dhan' || trade.broker === 'Groww')
  );
}

function calculateRiskRewardRatio(trade: any): number | null {
  const stopLoss = toNumberOrNull(trade.stop_loss);
  const targetPrice = toNumberOrNull(trade.target_price);
  if (stopLoss === null || targetPrice === null) return null;

  const entryPrice = trade.direction === 'SHORT'
    ? toNumberOrNull(trade.sell_price)
    : toNumberOrNull(trade.buy_price);

  if (entryPrice === null) return null;

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(targetPrice - entryPrice);
  if (risk <= 0) return null;

  return roundTo(reward / risk, 2);
}

function calculateDrawdown(tradePnls: number[]): { maxDrawdown: number; drawdownSeries: Array<{ cumulative_pnl: number; drawdown: number }> } {
  let cumulativePnl = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const drawdownSeries: Array<{ cumulative_pnl: number; drawdown: number }> = [];

  for (const pnl of tradePnls) {
    cumulativePnl += pnl;
    if (cumulativePnl > peak) {
      peak = cumulativePnl;
    }
    const drawdown = peak - cumulativePnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    drawdownSeries.push({
      cumulative_pnl: cumulativePnl,
      drawdown
    });
  }

  return { maxDrawdown, drawdownSeries };
}

async function calculatePnl(trade: any): Promise<number | null> {
  if (!isClosedStatus(trade.status)) {
    return null;
  }

  const exitPrice = getExitPrice(trade);
  if (exitPrice === null) {
    return null;
  }

  try {
    const { EquityDeliveryCalculator } = await import('../calculations/equityDelivery.js');
    const { EquityIntradayCalculator } = await import('../calculations/equityIntraday.js');

    const tradeTypeMapping: Record<string, string> = {
      EQUITY_DELIVERY: 'equity-delivery',
      EQUITY_INTRADAY: 'equity-intraday'
    };

    const calculatorTradeType = tradeTypeMapping[trade.trade_type];
    if (!calculatorTradeType) {
      return null;
    }

    let entryPrice: number | null;
    let transactionData: any[];

    if (trade.direction === 'SHORT') {
      entryPrice = toNumberOrNull(trade.sell_price);
      if (entryPrice === null) return null;

      transactionData = [{
        quantity: String(trade.quantity),
        buyPrice: String(entryPrice),
        sellPrice: String(exitPrice)
      }];
    } else {
      entryPrice = toNumberOrNull(trade.buy_price);
      if (entryPrice === null) return null;

      transactionData = [{
        quantity: String(trade.quantity),
        buyPrice: String(entryPrice),
        sellPrice: String(exitPrice)
      }];
    }

    const platform = String(trade.broker || '').toLowerCase();
    const exchange = String(trade.exchange || '').toUpperCase();
    const positionType = trade.direction === 'SHORT' ? 'short' : 'long';

    let calculator;
    if (calculatorTradeType === 'equity-delivery') {
      calculator = new EquityDeliveryCalculator(platform, exchange, calculatorTradeType);
    } else if (calculatorTradeType === 'equity-intraday') {
      calculator = new EquityIntradayCalculator(platform, exchange, calculatorTradeType);
    } else {
      return null;
    }

    const result = calculator.calculate_transaction_charges(transactionData, positionType);
    if (result && typeof result === 'object' && 'error' in result) {
      return null;
    }

    if (result && typeof result === 'object' && 'summary' in result && result.summary && 'netPnL' in result.summary) {
      return Number((result.summary as any).netPnL);
    }

    return null;
  } catch (error) {
    console.warn(`P&L calculation failed for trade ${trade.id}:`, error);
    return null;
  }
}

function toTradeBasePayload(trade: any): any {
  const { journal_tradejournaltags, ...rest } = trade;
  return {
    ...rest,
    tags: getTradeTags(trade)
  };
}

async function decorateTradeForList(trade: any): Promise<any> {
  const base = toTradeBasePayload(trade);
  const pnl = await calculatePnl(trade);

  return {
    ...base,
    pnl,
    risk_reward_ratio: calculateRiskRewardRatio(trade),
    is_profitable: pnl !== null && pnl > 0,
    is_precise_calculation: isPreciseCalculationAvailable(trade),
    missing_fields_for_pnl: getMissingFieldsForPnl(trade)
  };
}

async function decorateTradeForDetail(trade: any): Promise<any> {
  const listPayload = await decorateTradeForList(trade);
  return {
    ...listPayload,
    unrealized_pnl: null
  };
}

function toCreateUpdateTradeResponse(trade: any, tagIds: number[]): any {
  const { user_id, created_at, updated_at, ...rest } = trade;
  return {
    ...rest,
    tags: tagIds
  };
}

async function fetchTradeTagIds(accessToken: string, tradeId: number): Promise<number[]> {
  const { data, error } = await withUserScope(accessToken, 'journal_tradejournaltags')
    .from()
    .select('tag_id')
    .eq('trade_id', tradeId);

  if (error) {
    throw error;
  }

  return (data || [])
    .map((relation: any) => Number(relation.tag_id))
    .filter((tagId: number) => Number.isFinite(tagId));
}

async function replaceTradeTags(accessToken: string, tradeId: number, tagIds: number[]): Promise<void> {
  const deleteResult = await withUserScope(accessToken, 'journal_tradejournaltags')
    .from()
    .delete()
    .eq('trade_id', tradeId);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (tagIds.length === 0) {
    return;
  }

  const rows = tagIds.map((tagId) => ({
    trade_id: tradeId,
    tag_id: tagId
  }));

  const insertResult = await withUserScope(accessToken, 'journal_tradejournaltags')
    .from()
    .insert(rows);

  if (insertResult.error) {
    throw insertResult.error;
  }
}

async function getTradeIdsMatchingAllTags(accessToken: string, tagFilterValues: string[]): Promise<string[]> {
  const numericTagIds = tagFilterValues
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numericTagIds.length === 0) {
    return [];
  }

  const { data, error } = await withUserScope(accessToken, 'journal_tradejournaltags')
    .from()
    .select('trade_id, tag_id')
    .in('tag_id', numericTagIds);

  if (error) {
    throw error;
  }

  const tradeToTags = new Map<string, Set<number>>();
  for (const relation of data || []) {
    const tradeId = String(relation.trade_id);
    const tagId = Number(relation.tag_id);
    const tagSet = tradeToTags.get(tradeId) || new Set<number>();
    tagSet.add(tagId);
    tradeToTags.set(tradeId, tagSet);
  }

  return Array.from(tradeToTags.entries())
    .filter(([, tagSet]) => numericTagIds.every((tagId) => tagSet.has(tagId)))
    .map(([tradeId]) => tradeId);
}

async function calculateStockPerformance(closedTrades: any[]): Promise<{ best_performing_stocks: any[]; worst_performing_stocks: any[] }> {
  const stockPerformance: Record<string, { total_pnl: number; trade_count: number }> = {};

  for (const trade of closedTrades) {
    const pnl = await calculatePnl(trade);
    if (pnl === null) continue;

    const company = String(trade.company_name);
    if (!stockPerformance[company]) {
      stockPerformance[company] = { total_pnl: 0, trade_count: 0 };
    }
    stockPerformance[company].total_pnl += pnl;
    stockPerformance[company].trade_count += 1;
  }

  const stocks = Object.entries(stockPerformance).map(([company_name, data]) => ({
    company_name,
    total_pnl: data.total_pnl,
    trade_count: data.trade_count
  }));

  const best = stocks
    .filter((stock) => stock.total_pnl > 0)
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 5);

  const worst = stocks
    .sort((a, b) => a.total_pnl - b.total_pnl)
    .slice(0, 5);

  return {
    best_performing_stocks: best,
    worst_performing_stocks: worst
  };
}

async function calculateMonthlyPerformance(closedTrades: any[]): Promise<any[]> {
  const monthly: Record<string, { total_pnl: number; trade_count: number }> = {};

  for (const trade of closedTrades) {
    const pnl = await calculatePnl(trade);
    if (pnl === null || !trade.exit_date) continue;

    const exitDate = new Date(trade.exit_date);
    const monthKey = `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, '0')}`;

    if (!monthly[monthKey]) {
      monthly[monthKey] = { total_pnl: 0, trade_count: 0 };
    }

    monthly[monthKey].total_pnl += pnl;
    monthly[monthKey].trade_count += 1;
  }

  return Object.entries(monthly)
    .map(([month, data]) => ({
      month,
      total_pnl: data.total_pnl,
      trade_count: data.trade_count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

async function calculateTagPerformance(closedTrades: any[]): Promise<any[]> {
  const tagPerformance: Record<string, any> = {};

  for (const trade of closedTrades) {
    const tradePnl = await calculatePnl(trade);
    const tags = getTradeTags(trade);

    for (const tag of tags) {
      const tagKey = String(tag.id);
      if (!tagPerformance[tagKey]) {
        tagPerformance[tagKey] = {
          tag_name: tag.name,
          tag_color: tag.color,
          total_pnl: 0,
          trade_count: 0,
          profitable_trades: 0,
          losing_trades: 0
        };
      }

      if (tradePnl !== null) {
        tagPerformance[tagKey].trade_count += 1;
        tagPerformance[tagKey].total_pnl += tradePnl;
        if (tradePnl > 0) {
          tagPerformance[tagKey].profitable_trades += 1;
        } else {
          tagPerformance[tagKey].losing_trades += 1;
        }
      }
    }
  }

  return Object.values(tagPerformance)
    .map((tag: any) => ({
      ...tag,
      total_pnl: roundTo(tag.total_pnl, 2),
      win_rate: tag.trade_count > 0 ? roundTo(tag.profitable_trades / tag.trade_count, 4) : 0
    }))
    .sort((a, b) => b.total_pnl - a.total_pnl);
}

function calculateTradeTypeDistribution(trades: any[]): any[] {
  const distribution: Record<string, number> = {};
  for (const trade of trades) {
    const tradeType = String(trade.trade_type);
    distribution[tradeType] = (distribution[tradeType] || 0) + 1;
  }
  return Object.entries(distribution).map(([trade_type, count]) => ({ trade_type, count }));
}

function calculateStatusDistribution(trades: any[]): any[] {
  const distribution: Record<string, number> = {};
  for (const trade of trades) {
    const status = String(trade.status);
    distribution[status] = (distribution[status] || 0) + 1;
  }
  return Object.entries(distribution).map(([status, count]) => ({ status, count }));
}

function calculateAvgRiskReward(trades: any[]): number {
  const ratios = trades
    .map((trade) => calculateRiskRewardRatio(trade))
    .filter((ratio): ratio is number => ratio !== null);

  if (ratios.length === 0) return 0;
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  return total / ratios.length;
}

async function calculatePnlMetrics(closedTrades: any[]): Promise<{ total_pnl: number; avg_pnl_per_trade: number; profitable_trades: number; losing_trades: number; trade_pnls: number[] }> {
  let totalPnl = 0;
  let profitableTrades = 0;
  let losingTrades = 0;
  const tradePnls: number[] = [];

  for (const trade of closedTrades) {
    const pnl = await calculatePnl(trade);
    if (pnl === null) continue;

    totalPnl += pnl;
    tradePnls.push(pnl);
    if (pnl > 0) {
      profitableTrades += 1;
    } else {
      losingTrades += 1;
    }
  }

  const avgPnl = tradePnls.length > 0 ? totalPnl / tradePnls.length : 0;

  return {
    total_pnl: roundTo(totalPnl, 2),
    avg_pnl_per_trade: roundTo(avgPnl, 2),
    profitable_trades: profitableTrades,
    losing_trades: losingTrades,
    trade_pnls: tradePnls
  };
}

function calculatePerformanceMetrics(tradePnls: number[]): { win_rate: number; profit_factor: number; max_drawdown: number; largest_win: number; largest_loss: number; avg_win: number; avg_loss: number; expectancy: number } {
  if (tradePnls.length === 0) {
    return {
      win_rate: 0,
      profit_factor: 0,
      max_drawdown: 0,
      largest_win: 0,
      largest_loss: 0,
      avg_win: 0,
      avg_loss: 0,
      expectancy: 0
    };
  }

  const profitableCount = tradePnls.filter((pnl) => pnl > 0).length;
  const winRate = profitableCount / tradePnls.length;
  const totalProfits = tradePnls.filter((pnl) => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
  const totalLosses = Math.abs(tradePnls.filter((pnl) => pnl < 0).reduce((sum, pnl) => sum + pnl, 0));
  const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : 0;

  const largestWin = Math.max(...tradePnls);
  const largestLoss = Math.min(...tradePnls);
  const avgWin = profitableCount > 0 ? totalProfits / profitableCount : 0;
  const losingCount = tradePnls.length - profitableCount;
  const avgLoss = losingCount > 0 ? totalLosses / losingCount : 0;
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  const { maxDrawdown } = calculateDrawdown(tradePnls);

  return {
    win_rate: roundTo(winRate, 4),
    profit_factor: roundTo(profitFactor, 2),
    max_drawdown: roundTo(maxDrawdown, 2),
    largest_win: roundTo(largestWin, 2),
    largest_loss: roundTo(largestLoss, 2),
    avg_win: roundTo(avgWin, 2),
    avg_loss: roundTo(avgLoss, 2),
    expectancy: roundTo(expectancy, 2)
  };
}

async function calculateDrawdownSeries(trades: any[]): Promise<Array<{ cumulative_pnl: number; drawdown: number }>> {
  const sortedClosedTrades = [...trades]
    .filter((trade) => isClosedStatus(trade.status) && !!trade.exit_date)
    .sort((a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime());

  let cumulativePnl = 0;
  let peak = 0;
  const drawdownSeries: Array<{ cumulative_pnl: number; drawdown: number }> = [];

  for (const trade of sortedClosedTrades) {
    const pnl = await calculatePnl(trade);
    if (pnl === null) continue;

    cumulativePnl += pnl;
    if (cumulativePnl > peak) {
      peak = cumulativePnl;
    }

    drawdownSeries.push({
      cumulative_pnl: cumulativePnl,
      drawdown: peak - cumulativePnl
    });
  }

  return drawdownSeries;
}

function getPagination(url: URL): { page: number; pageSize: number; from: number; to: number } {
  const rawPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
  const rawPageSize = Number.parseInt(url.searchParams.get('page_size') || '20', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? rawPageSize : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
}

function parseMultiValueParams(url: URL, key: string): string[] {
  return url.searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildPageUrl(c: Context, targetPage: number): string {
  const pageUrl = new URL(c.req.url);
  pageUrl.searchParams.set('page', String(targetPage));
  return pageUrl.toString();
}

async function buildTagAnalyticsResponse(c: Context, userId: string, tagName: string): Promise<Response> {
  const accessToken = getAccessToken(c);

  const { data: tag, error: tagError } = await withUserScope(accessToken, 'journal_tradetags')
    .from()
    .select('id, name, color')
    .eq('user_id', userId)
    .eq('name', tagName)
    .maybeSingle();

  if (tagError) {
    throw tagError;
  }

  if (!tag) {
    return c.json({ error: `Tag "${tagName}" not found` }, 404);
  }

  const { data: relations, error: relationError } = await withUserScope(accessToken, 'journal_tradejournaltags')
    .from()
    .select('trade_id')
    .eq('tag_id', tag.id);

  if (relationError) {
    throw relationError;
  }

  const tradeIds = (relations || []).map((relation: any) => relation.trade_id);
  let tradesWithTag: any[] = [];

  if (tradeIds.length > 0) {
    const tradeQuery = await withUserScope(accessToken, 'journal_tradejournal')
      .from()
      .select(TRADE_SELECT_WITH_TAGS)
      .eq('user_id', userId)
      .in('id', tradeIds);

    if (tradeQuery.error) {
      throw tradeQuery.error;
    }

    tradesWithTag = tradeQuery.data || [];
  }

  const closedTrades = tradesWithTag.filter((trade) => isClosedStatus(trade.status));
  const pnlMetrics = await calculatePnlMetrics(closedTrades);
  const performance = calculatePerformanceMetrics(pnlMetrics.trade_pnls);

  return c.json({
    tag_name: tag.name,
    tag_color: tag.color,
    total_trades_with_tag: tradesWithTag.length,
    open_trades_with_tag: tradesWithTag.filter((trade) => trade.status === 'OPEN').length,
    closed_trades_with_tag: closedTrades.length,
    calculable_trades: pnlMetrics.trade_pnls.length,
    ...pnlMetrics,
    ...performance
  }, 200);
}

export const journalRoutes = [
  {
    method: 'GET' as const,
    path: '/api/journal/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const accessToken = getAccessToken(c);
        const url = new URL(c.req.url);
        const { page, pageSize, from, to } = getPagination(url);

        const statusFilters = parseMultiValueParams(url, 'status');
        const tradeTypeFilters = parseMultiValueParams(url, 'trade_type');
        const tagFilters = parseMultiValueParams(url, 'tags');
        const companyFilters = parseMultiValueParams(url, 'companies');

        let query = withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .select(TRADE_SELECT_WITH_TAGS, { count: 'exact' })
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .range(from, to);

        if (statusFilters.length > 0) {
          query = query.in('status', statusFilters);
        }

        if (tradeTypeFilters.length > 0) {
          query = query.in('trade_type', tradeTypeFilters);
        }

        if (companyFilters.length > 0) {
          query = query.in('company_name', companyFilters);
        }

        if (tagFilters.length > 0) {
          const matchingTradeIds = await getTradeIdsMatchingAllTags(accessToken, tagFilters);

          if (matchingTradeIds.length === 0) {
            return c.json({
              count: 0,
              next: null,
              previous: null,
              results: []
            }, 200);
          }

          query = query.in('id', matchingTradeIds);
        }

        const { data: trades, error, count } = await query;

        if (error) {
          throw error;
        }

        const results = await Promise.all((trades || []).map((trade: any) => decorateTradeForList(trade)));

        const response: PaginatedResponse<any> = {
          count: count || 0,
          next: count && from + pageSize < count ? buildPageUrl(c, page + 1) : null,
          previous: page > 1 ? buildPageUrl(c, page - 1) : null,
          results
        };

        return c.json(response, 200);
      } catch (error) {
        console.error('Journal fetch error:', error);
        return c.json({
          error: true,
          error_id: `journal_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to fetch journal entries'
        }, 500);
      }
    }
  },
  {
    method: 'POST' as const,
    path: '/api/journal/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const body = await c.req.json();

      try {
        const accessToken = getAccessToken(c);
        const validatedData = tradeJournalCreateSchema.parse(body);

        const { tags = [], ...journalData } = validatedData;

        const { data: trade, error } = await withUserScope(accessToken, 'journal_tradejournal')
          .insert({
            ...journalData,
            user_id: user.id
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        await replaceTradeTags(accessToken, trade.id, tags);

        return c.json(toCreateUpdateTradeResponse(trade, tags), 201);
      } catch (error) {
        console.error('Journal creation error:', error);
        return c.json({
          error: true,
          error_id: `journal_${Date.now()}`,
          category: 'validation' as const,
          message: error instanceof Error ? error.message : 'Invalid trade journal data'
        }, 400);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/journal/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');

      try {
        const accessToken = getAccessToken(c);

        const { data: trade, error } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .select(TRADE_SELECT_WITH_TAGS)
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!trade) {
          return c.json({
            error: true,
            error_id: `journal_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Trade journal entry not found'
          }, 404);
        }

        const payload = await decorateTradeForDetail(trade);
        return c.json(payload, 200);
      } catch (error) {
        console.error('Journal fetch error:', error);
        return c.json({
          error: true,
          error_id: `journal_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to fetch journal entry'
        }, 500);
      }
    }
  },
  {
    method: 'PATCH' as const,
    path: '/api/journal/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');
      const body = await c.req.json();

      try {
        const accessToken = getAccessToken(c);
        const validatedData = tradeJournalCreateSchema.partial().parse(body);
        const { tags, ...journalData } = validatedData;

        const { data: trade, error } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .update(journalData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!trade) {
          return c.json({
            error: true,
            error_id: `journal_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Trade journal entry not found'
          }, 404);
        }

        if (tags !== undefined) {
          await replaceTradeTags(accessToken, trade.id, tags);
        }

        const outputTagIds = tags !== undefined
          ? tags
          : await fetchTradeTagIds(accessToken, trade.id);

        return c.json(toCreateUpdateTradeResponse(trade, outputTagIds), 200);
      } catch (error) {
        console.error('Journal update error:', error);
        return c.json({
          error: true,
          error_id: `journal_${Date.now()}`,
          category: 'validation' as const,
          message: error instanceof Error ? error.message : 'Invalid update data'
        }, 400);
      }
    }
  },
  {
    method: 'DELETE' as const,
    path: '/api/journal/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');

      try {
        const accessToken = getAccessToken(c);

        const { data: existing, error: existingError } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (!existing) {
          return c.json({
            error: true,
            error_id: `journal_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Trade journal entry not found'
          }, 404);
        }

        const { error } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        return new Response(null, { status: 204 });
      } catch (error) {
        console.error('Journal deletion error:', error);
        return c.json({
          error: true,
          error_id: `journal_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to delete journal entry'
        }, 500);
      }
    }
  },
  {
    method: 'PATCH' as const,
    path: '/api/journal/:id/update_status/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');
      const body = await c.req.json();

      try {
        const statusValue = body?.status;
        if (!statusValue) {
          return c.json({ error: 'Status is required' }, 400);
        }

        if (!VALID_STATUSES.includes(statusValue)) {
          return c.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, 400);
        }

        const accessToken = getAccessToken(c);

        const { data: updatedTrade, error } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .update({
            status: statusValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select(TRADE_SELECT_WITH_TAGS)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!updatedTrade) {
          return c.json({
            error: true,
            error_id: `journal_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Trade journal entry not found'
          }, 404);
        }

        const payload = await decorateTradeForDetail(updatedTrade);
        return c.json(payload, 200);
      } catch (error) {
        console.error('Journal status update error:', error);
        return c.json({
          error: true,
          error_id: `journal_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to update trade status'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/tags/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const accessToken = getAccessToken(c);
        const { data: tags, error } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) {
          throw error;
        }

        return c.json(tags || [], 200);
      } catch (error) {
        console.error('Tags fetch error:', error);
        return c.json({
          error: true,
          error_id: `tags_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to fetch tags'
        }, 500);
      }
    }
  },
  {
    method: 'POST' as const,
    path: '/api/tags/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const body = await c.req.json();

      try {
        const accessToken = getAccessToken(c);
        const validatedData = tagCreateSchema.parse(body);

        const { data: existing, error: existingError } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .select('id')
          .eq('user_id', user.id)
          .eq('name', validatedData.name)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (existing) {
          return c.json({
            error: true,
            error_id: `tags_${Date.now()}`,
            category: 'validation' as const,
            message: 'Tag with this name already exists'
          }, 400);
        }

        const { data: tag, error } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .insert({
            ...validatedData,
            user_id: user.id
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return c.json(tag, 201);
      } catch (error) {
        console.error('Tag creation error:', error);
        return c.json({
          error: true,
          error_id: `tags_${Date.now()}`,
          category: 'validation' as const,
          message: error instanceof Error ? error.message : 'Invalid tag data'
        }, 400);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/tags/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');

      try {
        const accessToken = getAccessToken(c);
        const { data: tag, error } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!tag) {
          return c.json({
            error: true,
            error_id: `tag_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Tag not found'
          }, 404);
        }

        return c.json(tag, 200);
      } catch (error) {
        console.error('Tag fetch error:', error);
        return c.json({
          error: true,
          error_id: `tag_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to fetch tag'
        }, 500);
      }
    }
  },
  {
    method: 'PATCH' as const,
    path: '/api/tags/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');
      const body = await c.req.json();

      try {
        const accessToken = getAccessToken(c);
        const validatedData = tagCreateSchema.partial().parse(body);

        const { data: tag, error } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .update(validatedData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!tag) {
          return c.json({
            error: true,
            error_id: `tag_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Tag not found'
          }, 404);
        }

        return c.json(tag, 200);
      } catch (error) {
        console.error('Tag update error:', error);
        return c.json({
          error: true,
          error_id: `tag_${Date.now()}`,
          category: 'validation' as const,
          message: error instanceof Error ? error.message : 'Invalid tag data'
        }, 400);
      }
    }
  },
  {
    method: 'DELETE' as const,
    path: '/api/tags/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');

      try {
        const accessToken = getAccessToken(c);

        const { data: existing, error: existingError } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (!existing) {
          return c.json({
            error: true,
            error_id: `tag_${Date.now()}`,
            category: 'not_found' as const,
            message: 'Tag not found'
          }, 404);
        }

        const { error } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        return new Response(null, { status: 204 });
      } catch (error) {
        console.error('Tag deletion error:', error);
        return c.json({
          error: true,
          error_id: `tag_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to delete tag'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/tags/popular/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const accessToken = getAccessToken(c);

        const { data: tags, error: tagsError } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .select('*')
          .eq('user_id', user.id);

        if (tagsError) {
          throw tagsError;
        }

        if (!tags || tags.length === 0) {
          return c.json([], 200);
        }

        const tagIds = tags.map((tag: any) => tag.id);
        const { data: relations, error: relationError } = await withUserScope(accessToken, 'journal_tradejournaltags')
          .from()
          .select('tag_id')
          .in('tag_id', tagIds);

        if (relationError) {
          throw relationError;
        }

        const counts: Record<string, number> = {};
        for (const relation of relations || []) {
          const tagId = String(relation.tag_id);
          counts[tagId] = (counts[tagId] || 0) + 1;
        }

        const sorted = [...tags]
          .sort((a: any, b: any) => {
            const countA = counts[String(a.id)] || 0;
            const countB = counts[String(b.id)] || 0;
            if (countB !== countA) return countB - countA;
            return String(a.name).localeCompare(String(b.name));
          })
          .slice(0, 10);

        return c.json(sorted, 200);
      } catch (error) {
        console.error('Popular tags error:', error);
        return c.json({
          error: true,
          error_id: `tags_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to fetch popular tags'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/journal/analytics/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const accessToken = getAccessToken(c);
        const { data: trades, error } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .select(TRADE_SELECT_WITH_TAGS)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        const allTrades = trades || [];
        const closedTrades = allTrades.filter((trade: any) => isClosedStatus(trade.status));
        const openTrades = allTrades.filter((trade: any) => trade.status === 'OPEN');

        const pnlMetrics = await calculatePnlMetrics(closedTrades);
        const performanceMetrics = calculatePerformanceMetrics(pnlMetrics.trade_pnls);
        const stockPerformance = await calculateStockPerformance(closedTrades);
        const monthlyPerformance = await calculateMonthlyPerformance(closedTrades);
        const tagPerformance = await calculateTagPerformance(closedTrades);
        const drawdownSeries = await calculateDrawdownSeries(allTrades);

        return c.json({
          total_trades: allTrades.length,
          open_trades: openTrades.length,
          closed_trades: closedTrades.length,
          ...pnlMetrics,
          ...performanceMetrics,
          avg_risk_reward: roundTo(calculateAvgRiskReward(allTrades), 2),
          ...stockPerformance,
          monthly_performance: monthlyPerformance,
          drawdown_series: drawdownSeries,
          trade_type_distribution: calculateTradeTypeDistribution(allTrades),
          status_distribution: calculateStatusDistribution(allTrades),
          tag_performance: tagPerformance
        }, 200);
      } catch (error) {
        console.error('Analytics error:', error);
        return c.json({
          error: true,
          error_id: `analytics_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to calculate analytics'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/journal/search/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const accessToken = getAccessToken(c);
        const url = new URL(c.req.url);
        const query = (url.searchParams.get('query') || url.searchParams.get('q') || '').trim();
        const { page, pageSize, from, to } = getPagination(url);

        if (!query) {
          return c.json({
            error: true,
            error_id: `search_${Date.now()}`,
            category: 'validation' as const,
            message: 'Search query is required'
          }, 400);
        }

        const statusFilters = parseMultiValueParams(url, 'status');
        const tradeTypeFilters = parseMultiValueParams(url, 'trade_type');
        const tagFilters = parseMultiValueParams(url, 'tags');
        const companyFilters = parseMultiValueParams(url, 'companies');

        const { data: trades, error } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .select(TRADE_SELECT_WITH_TAGS)
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false });

        if (error) {
          throw error;
        }

        const queryLower = query.toLowerCase();
        let filteredTrades = trades || [];

        if (statusFilters.length > 0) {
          filteredTrades = filteredTrades.filter((trade: any) => statusFilters.includes(String(trade.status)));
        }

        if (tradeTypeFilters.length > 0) {
          filteredTrades = filteredTrades.filter((trade: any) => tradeTypeFilters.includes(String(trade.trade_type)));
        }

        if (companyFilters.length > 0) {
          filteredTrades = filteredTrades.filter((trade: any) => companyFilters.includes(String(trade.company_name)));
        }

        if (tagFilters.length > 0) {
          const requiredTags = new Set(tagFilters.map((value) => String(Number(value))));
          filteredTrades = filteredTrades.filter((trade: any) => {
            const tradeTagIds = new Set(getTradeTags(trade).map((tag: any) => String(tag.id)));
            for (const requiredTag of requiredTags) {
              if (!tradeTagIds.has(requiredTag)) return false;
            }
            return true;
          });
        }

        const scoredTrades = filteredTrades
          .map((trade: any) => {
            let relevanceScore = 0;

            const companyName = String(trade.company_name || '').toLowerCase();
            if (companyName === queryLower) {
              relevanceScore = Math.max(relevanceScore, 100);
            } else if (companyName.startsWith(queryLower)) {
              relevanceScore = Math.max(relevanceScore, 50);
            } else if (companyName.includes(queryLower)) {
              relevanceScore = Math.max(relevanceScore, 10);
            }

            const notes = String(trade.personal_notes || '').toLowerCase();
            if (notes.includes(queryLower)) {
              relevanceScore = Math.max(relevanceScore, 10);
            }

            for (const tag of getTradeTags(trade)) {
              const tagName = String(tag.name || '').toLowerCase();
              if (tagName === queryLower) {
                relevanceScore = Math.max(relevanceScore, 100);
              } else if (tagName.startsWith(queryLower)) {
                relevanceScore = Math.max(relevanceScore, 50);
              } else if (tagName.includes(queryLower)) {
                relevanceScore = Math.max(relevanceScore, 10);
              }
            }

            return {
              ...trade,
              relevance_score: relevanceScore
            };
          })
          .filter((trade: any) => trade.relevance_score > 0)
          .sort((a: any, b: any) => {
            if (b.relevance_score !== a.relevance_score) {
              return b.relevance_score - a.relevance_score;
            }
            return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
          });

        const totalCount = scoredTrades.length;
        const pageTrades = scoredTrades.slice(from, to + 1);
        const results = await Promise.all(pageTrades.map((trade: any) => decorateTradeForDetail(trade)));

        return c.json({
          query,
          count: totalCount,
          next: totalCount > to + 1 ? buildPageUrl(c, page + 1) : null,
          previous: page > 1 ? buildPageUrl(c, page - 1) : null,
          results
        }, 200);
      } catch (error) {
        console.error('Journal search error:', error);
        return c.json({
          error: true,
          error_id: `search_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to search journal entries'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/journal/suggestions/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const accessToken = getAccessToken(c);
        const url = new URL(c.req.url);
        const query = (url.searchParams.get('query') || url.searchParams.get('q') || '').trim();

        if (query.length < 2) {
          return c.json([], 200);
        }

        const queryLower = query.toLowerCase();
        const suggestions: Array<{ id: string; text: string; type: 'company' | 'tag'; score: number }> = [];

        const { data: trades, error: tradeError } = await withUserScope(accessToken, 'journal_tradejournal')
          .from()
          .select('company_name')
          .eq('user_id', user.id)
          .ilike('company_name', `%${query}%`)
          .limit(100);

        if (tradeError) {
          throw tradeError;
        }

        const companies = new Map<string, number>();
        for (const trade of trades || []) {
          const name = String(trade.company_name || '');
          if (!name) continue;
          if (companies.has(name)) continue;

          const nameLower = name.toLowerCase();
          if (nameLower === queryLower) {
            companies.set(name, 100);
          } else if (nameLower.startsWith(queryLower)) {
            companies.set(name, 50);
          } else {
            companies.set(name, 10);
          }
        }

        for (const [name, score] of companies.entries()) {
          suggestions.push({
            id: `company-${name}`,
            text: name,
            type: 'company',
            score
          });
        }

        const { data: tags, error: tagError } = await withUserScope(accessToken, 'journal_tradetags')
          .from()
          .select('id, name')
          .eq('user_id', user.id)
          .ilike('name', `%${query}%`)
          .limit(20);

        if (tagError) {
          throw tagError;
        }

        const tradingPatterns = [
          /\d+\s*(ma|ema|rsi|sma)/i,
          /(breakout|support|resistance)/i
        ];

        for (const tag of tags || []) {
          const name = String(tag.name || '');
          const nameLower = name.toLowerCase();
          let score = 10;

          if (nameLower === queryLower) {
            score = 100;
          } else if (nameLower.startsWith(queryLower)) {
            score = 50;
          }

          if (tradingPatterns.some((pattern) => pattern.test(queryLower))) {
            score += 25;
          }

          suggestions.push({
            id: `tag-${tag.id}`,
            text: name,
            type: 'tag',
            score
          });
        }

        suggestions.sort((a, b) => b.score - a.score);

        return c.json(suggestions.slice(0, 10), 200);
      } catch (error) {
        console.error('Suggestions error:', error);
        return c.json({
          error: true,
          error_id: `suggestions_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to get suggestions'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/journal/tag_analytics/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const tagName = (new URL(c.req.url)).searchParams.get('tag_name');
        if (!tagName) {
          return c.json({ error: 'tag_name parameter is required' }, 400);
        }

        return await buildTagAnalyticsResponse(c, user.id, tagName);
      } catch (error) {
        console.error('Tag analytics error:', error);
        return c.json({
          error: true,
          error_id: `tag_analytics_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to calculate tag analytics'
        }, 500);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/journal/tag-analytics/',
    handler: async (c: Context) => {
      const user = requireAuth(c);

      try {
        const tagName = (new URL(c.req.url)).searchParams.get('tag_name');
        if (!tagName) {
          return c.json({ error: 'tag_name parameter is required' }, 400);
        }

        return await buildTagAnalyticsResponse(c, user.id, tagName);
      } catch (error) {
        console.error('Tag analytics error:', error);
        return c.json({
          error: true,
          error_id: `tag_analytics_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to calculate tag analytics'
        }, 500);
      }
    }
  }
];
