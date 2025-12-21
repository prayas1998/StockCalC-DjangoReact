import { Context } from 'hono';
import { requireAuth, getAccessToken } from '../middleware/auth';
import { tradeJournalCreateSchema, paginationSchema, journalFilterSchema, tagCreateSchema } from '../validators/schemas';
import { TradeJournalCreate, PaginatedResponse } from '../types';
import { supabaseClient, withUserScope } from '../services/supabase';
import { TradeType, Broker, Exchange } from '../types/database';

// Helper function to calculate P&L for a trade (mirrors Django calculate_pnl exactly)
async function calculatePnl(trade: any): Promise<number | null> {
  if (trade.status !== 'CLOSED_TARGET' && trade.status !== 'CLOSED_STOPLOSS' && trade.status !== 'CLOSED_MANUAL') {
    return null;
  }
  
  // Get exit price
  const exitPrice = getExitPrice(trade);
  if (exitPrice === null) {
    return null;
  }
  
  try {
    // Import calculator classes
    const { EquityDeliveryCalculator, EquityIntradayCalculator } = await import('../calculations');
    
    // Map journal trade type to calculator trade type (exact match to Django)
    const tradeTypeMapping: Record<string, string> = {
      'EQUITY_DELIVERY': 'equity-delivery',
      'EQUITY_INTRADAY': 'equity-intraday',
    };
    
    const calculatorTradeType = tradeTypeMapping[trade.trade_type];
    if (!calculatorTradeType) {
      return null;
    }
    
    // Prepare transaction data for calculator (exact match to Django)
    let entryPrice: number;
    let transactionData: any[];
    
    if (trade.direction === 'SHORT') {
      // For short trades: Entry price is stored in sell_price, Exit price is stored in buy_price
      entryPrice = trade.sell_price; // Entry price for short trades
      transactionData = [{
        quantity: String(trade.quantity),
        buyPrice: String(entryPrice),   // Entry price (sell action) - same as main calculator
        sellPrice: String(exitPrice)    // Exit price (buy action) - same as main calculator
      }];
    } else {
      // Long trades: Entry = buy_price, Exit = exit_price
      entryPrice = trade.buy_price; // Entry price for long trades
      transactionData = [{
        quantity: String(trade.quantity),
        buyPrice: String(entryPrice),   // Entry price (buy to open)
        sellPrice: String(exitPrice)    // Exit price (sell to close)
      }];
    }
    
    // Get appropriate calculator (same logic as calculate_charges view)
    const platform = trade.broker.toLowerCase();
    const exchange = trade.exchange.toUpperCase();
    const positionType = trade.direction === 'SHORT' ? 'short' : 'long';
    
    let calculator;
    if (calculatorTradeType === 'equity-delivery') {
      calculator = new EquityDeliveryCalculator(platform, exchange, calculatorTradeType);
    } else if (calculatorTradeType === 'equity-intraday') {
      calculator = new EquityIntradayCalculator(platform, exchange, calculatorTradeType);
    } else {
      return null;
    }
    
    // Calculate charges using same logic as view (exact match to Django)
    const result = calculator.calculate_transaction_charges(transactionData, positionType);
    
    // Check for errors (intraday calculator returns error dict for unsupported brokers)
    if (result && typeof result === 'object' && 'error' in result) {
      return null;
    }
    
    // Extract net P&L from result (exact match to Django)
    if (result && typeof result === 'object' && 'summary' in result && 'netPnL' in result.summary) {
      return Number(result.summary.netPnL);
    }
    
    return null;
  } catch (error) {
    console.warn(`P&L calculation failed for trade ${trade.id}:`, error);
    return null;
  }
}

// Helper function to get exit price (mirroring Django get_exit_price)
function getExitPrice(trade: any): number | null {
  if (trade.status === 'OPEN' || trade.status === 'CANCELLED') {
    return null;
  }
  
  if (trade.status === 'CLOSED_TARGET' && trade.target_price) {
    return trade.target_price;
  } else if (trade.status === 'CLOSED_STOPLOSS' && trade.stop_loss) {
    return trade.stop_loss;
  } else if (trade.status === 'CLOSED_MANUAL' && trade.sell_price) {
    return trade.sell_price;
  }
  
  return null;
}

// Helper function to calculate max drawdown and drawdown series
function calculateDrawdown(tradePnls: number[]): { maxDrawdown: number; drawdownSeries: any[] } {
  let cumulativePnl = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const drawdownSeries: any[] = [];
  
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
      drawdown: drawdown
    });
  }
  
  return { maxDrawdown, drawdownSeries };
}

// Helper function to calculate stock performance
async function calculateStockPerformance(closedTrades: any[]): Promise<{ bestPerformingStocks: any[]; worstPerformingStocks: any[] }> {
  const stockPerformance: Record<string, { totalPnl: number; tradeCount: number }> = {};
  
  for (const trade of closedTrades) {
    const pnl = await calculatePnl(trade);
    if (pnl !== null) {
      const company = trade.company_name;
      if (!stockPerformance[company]) {
        stockPerformance[company] = { totalPnl: 0, tradeCount: 0 };
      }
      stockPerformance[company].totalPnl += pnl;
      stockPerformance[company].tradeCount += 1;
    }
  }
  
  const stockList = Object.entries(stockPerformance).map(([companyName, data]) => ({
    company_name: companyName,
    total_pnl: Number(data.totalPnl.toFixed(2)),
    trade_count: data.tradeCount
  }));
  
  // Best performers (profitable stocks only)
  const profitableStocks = stockList.filter(stock => stock.total_pnl > 0);
  const bestPerformingStocks = profitableStocks
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 5);
  
  // Worst performers (all stocks)
  const worstPerformingStocks = stockList
    .sort((a, b) => a.total_pnl - b.total_pnl)
    .slice(0, 5);
  
  return { bestPerformingStocks, worstPerformingStocks };
}

// Helper function to calculate monthly performance
async function calculateMonthlyPerformance(closedTrades: any[]): Promise<any[]> {
  const monthlyPerformance: Record<string, { totalPnl: number; tradeCount: number }> = {};
  
  for (const trade of closedTrades) {
    const pnl = await calculatePnl(trade);
    if (pnl !== null && trade.exit_date) {
      const exitDate = new Date(trade.exit_date);
      const monthKey = `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyPerformance[monthKey]) {
        monthlyPerformance[monthKey] = { totalPnl: 0, tradeCount: 0 };
      }
      monthlyPerformance[monthKey].totalPnl += pnl;
      monthlyPerformance[monthKey].tradeCount += 1;
    }
  }
  
  return Object.entries(monthlyPerformance)
    .map(([month, data]) => ({
      month,
      total_pnl: Number(data.totalPnl.toFixed(2)),
      trade_count: data.tradeCount
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// Helper function to calculate tag performance
async function calculateTagPerformance(closedTrades: any[], userId: string): Promise<any[]> {
  const tagPerformance: Record<string, any> = {};
  
  for (const trade of closedTrades) {
    const pnl = await calculatePnl(trade);
    if (trade.TradeJournalTags) {
      for (const tagRelation of trade.TradeJournalTags) {
        const tag = tagRelation.TradeTags;
        if (!tag) continue;
        
        const tagId = tag.id;
        if (!tagPerformance[tagId]) {
          tagPerformance[tagId] = {
            tag_name: tag.name,
            tag_color: tag.color,
            total_pnl: 0,
            trade_count: 0,
            profitable_trades: 0,
            losing_trades: 0
          };
        }
        
        if (pnl !== null) {
          tagPerformance[tagId].trade_count += 1;
          tagPerformance[tagId].total_pnl += pnl;
          if (pnl > 0) {
            tagPerformance[tagId].profitable_trades += 1;
          } else {
            tagPerformance[tagId].losing_trades += 1;
          }
        }
      }
    }
  }
  
  // Calculate win rates and sort by total P&L
  return Object.values(tagPerformance)
    .map(tag => ({
      ...tag,
      total_pnl: Number(tag.total_pnl.toFixed(2)),
      win_rate: tag.trade_count > 0 ? Number(((tag.profitable_trades / tag.trade_count) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => b.total_pnl - a.total_pnl);
}

// Helper function to calculate trade type distribution
function calculateTradeTypeDistribution(trades: any[]): any[] {
  const distribution: Record<string, number> = {};
  
  for (const trade of trades) {
    const tradeType = trade.trade_type;
    distribution[tradeType] = (distribution[tradeType] || 0) + 1;
  }
  
  return Object.entries(distribution).map(([trade_type, count]) => ({
    trade_type,
    count
  }));
}

// Helper function to calculate status distribution
function calculateStatusDistribution(trades: any[]): any[] {
  const distribution: Record<string, number> = {};
  
  for (const trade of trades) {
    const status = trade.status;
    distribution[status] = (distribution[status] || 0) + 1;
  }
  
  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count
  }));
}

// Helper function to calculate average risk/reward ratio
function calculateAvgRiskReward(trades: any[]): number {
  const riskRewardRatios: number[] = [];
  
  for (const trade of trades) {
    if (trade.stop_loss && trade.target_price && trade.buy_price) {
      let riskReward = 0;
      if (trade.direction === 'LONG') {
        const risk = Math.abs(trade.buy_price - trade.stop_loss);
        const reward = Math.abs(trade.target_price - trade.buy_price);
        riskReward = risk > 0 ? reward / risk : 0;
      } else {
        const risk = Math.abs(trade.stop_loss - trade.buy_price);
        const reward = Math.abs(trade.buy_price - trade.target_price);
        riskReward = risk > 0 ? reward / risk : 0;
      }
      riskRewardRatios.push(riskReward);
    }
  }
  
  return riskRewardRatios.length > 0 ? riskRewardRatios.reduce((sum, ratio) => sum + ratio, 0) / riskRewardRatios.length : 0;
}

export const journalRoutes = [
  {
    method: 'GET' as const,
    path: '/api/journal/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Parse query parameters
        const url = new URL(c.req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('page_size') || '20');
        const search = url.searchParams.get('search') || '';
        const status = url.searchParams.get('status');
        const tradeType = url.searchParams.get('trade_type');
        const broker = url.searchParams.get('broker');
        const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
        
        // Calculate range
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Build query
        let query = supabaseClient
          .from('TradeJournal')
          .select(`
            *,
            TradeTags(id, name, color),
            TradeJournalTags(
              TradeTags(id, name, color)
            )
          `, { count: 'exact' })
          .eq('user_id', user.id)
          .range(from, to)
          .order('created_at', { ascending: false });
        
        // Apply filters
        if (search) {
          query = query.ilike('company_name', `%${search}%`);
        }
        if (status) {
          query = query.eq('status', status);
        }
        if (tradeType && ['EQUITY_DELIVERY', 'EQUITY_INTRADAY'].includes(tradeType)) {
          query = query.eq('trade_type', tradeType);
        }
        if (broker && ['Dhan', 'Groww'].includes(broker)) {
          query = query.eq('broker', broker);
        }
        if (tags.length > 0) {
          query = query.contains('tags', tags);
        }
        
        const { data: trades, error, count } = await query;
        
        if (error) {
          throw error;
        }
        
        // Format response
        const response: PaginatedResponse<any> = {
          count: count || 0,
          next: count && from + pageSize < count ? `?page=${page + 1}` : null,
          previous: page > 1 ? `?page=${page - 1}` : null,
          results: trades || []
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
        const validatedData = tradeJournalCreateSchema.parse(body);
        
        // Create journal entry with user scoping (strip tags field as it doesn't exist in TradeJournal table)
        const { tags, ...journalData } = validatedData;
        const accessToken = getAccessToken(c);
        const { data: trade, error } = await withUserScope(accessToken, 'TradeJournal').insert({
          ...journalData,
          user_id: user.id
        }).select().single();
        
        if (error) {
          throw error;
        }
        
        // Handle tags if provided (after journal entry is created)
        if (tags && tags.length > 0) {
          // Create tag relationships
          const tagRelations = tags.map(tagId => ({
            trade_journal_id: trade.id,
            tag_id: tagId
          }));
          
          const { error: tagError } = await supabaseClient
            .from('TradeJournalTags')
            .insert(tagRelations);
          
          if (tagError) {
            console.warn('Tag assignment failed:', tagError);
          }
        }
        
        return c.json(trade, 201);
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
        const { data: trade, error } = await supabaseClient
          .from('TradeJournal')
          .select(`
            *,
            TradeTags(id, name, color),
            TradeJournalTags(
              TradeTags(id, name, color)
            )
          `)
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return c.json({
              error: true,
              error_id: `journal_${Date.now()}`,
              category: 'not_found' as const,
              message: 'Trade journal entry not found'
            }, 404);
          }
          throw error;
        }
        
        return c.json(trade, 200);
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
        // Validate update data
        const validatedData = tradeJournalCreateSchema.partial().parse(body);
        
        const accessToken = getAccessToken(c);
        const { data: trade, error } = await withUserScope(accessToken, 'TradeJournal')
          .update(validatedData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return c.json({
              error: true,
              error_id: `journal_${Date.now()}`,
              category: 'not_found' as const,
              message: 'Trade journal entry not found'
            }, 404);
          }
          throw error;
        }
        
        return c.json(trade, 200);
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
        const { error } = await withUserScope(accessToken, 'TradeJournal')
          .delete()
          .eq('id', id);
        
        if (error) {
          if (error.code === 'PGRST116') {
            return c.json({
              error: true,
              error_id: `journal_${Date.now()}`,
              category: 'not_found' as const,
              message: 'Trade journal entry not found'
            }, 404);
          }
          throw error;
        }
        
        return c.json({ message: 'Trade journal entry deleted successfully' }, 200);
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
    method: 'GET' as const,
    path: '/api/tags/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        const { data: tags, error } = await supabaseClient
          .from('TradeTags')
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
        const validatedData = tagCreateSchema.parse(body);
        
        // Check if tag name already exists for this user
        const { data: existing, error: checkError } = await supabaseClient
          .from('TradeTags')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', validatedData.name)
          .single();
        
        if (existing) {
          return c.json({
            error: true,
            error_id: `tags_${Date.now()}`,
            category: 'validation' as const,
            message: 'Tag with this name already exists'
          }, 400);
        }
        
        const accessToken = getAccessToken(c);
        const { data: tag, error } = await withUserScope(accessToken, 'TradeTags').insert({
          ...validatedData,
          user_id: user.id
        }).select().single();
        
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
    path: '/api/journal/analytics/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Get all user trades with tags for analytics
        const { data: trades, error } = await supabaseClient
          .from('TradeJournal')
          .select(`
            *,
            TradeTags(id, name, color),
            TradeJournalTags(
              TradeTags(id, name, color)
            )
          `)
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        // Filter closed trades for P&L calculations
        const closedStatuses = ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'];
        const closedTrades = trades?.filter(t => closedStatuses.includes(t.status)) || [];
        const openTrades = trades?.filter(t => t.status === 'OPEN') || [];
        
        // Calculate P&L for closed trades
        const tradePnls: number[] = [];
        const profitableTrades: any[] = [];
        const losingTrades: any[] = [];
        
        for (const trade of closedTrades) {
          const pnl = await calculatePnl(trade);
          if (pnl !== null) {
            tradePnls.push(pnl);
            if (pnl > 0) {
              profitableTrades.push({ ...trade, pnl });
            } else {
              losingTrades.push({ ...trade, pnl });
            }
          }
        }
        
        // Basic metrics
        const totalTrades = trades?.length || 0;
        const totalPnl = tradePnls.reduce((sum, pnl) => sum + pnl, 0);
        const avgPnl = tradePnls.length > 0 ? totalPnl / tradePnls.length : 0;
        const winRate = tradePnls.length > 0 ? profitableTrades.length / tradePnls.length : 0;
        
        // Profit factor and expectancy (with zero guards)
        const totalWins = profitableTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
        
        let expectancy = 0;
        if (profitableTrades.length > 0 && losingTrades.length > 0) {
          expectancy = (winRate * (totalWins / profitableTrades.length)) - ((1 - winRate) * (totalLosses / losingTrades.length));
        }
        
        // Performance metrics
        const largestWin = profitableTrades.length > 0 ? Math.max(...profitableTrades.map(t => t.pnl)) : 0;
        const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
        const avgWin = profitableTrades.length > 0 ? totalWins / profitableTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
        
        // Calculate max drawdown and drawdown series
        const { maxDrawdown, drawdownSeries } = calculateDrawdown(tradePnls);
        
        // Calculate stock performance
        const { bestPerformingStocks, worstPerformingStocks } = await calculateStockPerformance(closedTrades);
        
        // Calculate monthly performance
        const monthlyPerformance = await calculateMonthlyPerformance(closedTrades);
        
        // Calculate tag performance
        const tagPerformance = await calculateTagPerformance(closedTrades, user.id);
        
        // Calculate distributions
        const tradeTypeDistribution = calculateTradeTypeDistribution(trades);
        const statusDistribution = calculateStatusDistribution(trades);
        
        // Calculate risk/reward metrics
        const avgRiskReward = calculateAvgRiskReward(trades);
        
        return c.json({
          total_trades: totalTrades,
          open_trades: openTrades.length,
          closed_trades: closedTrades.length,
          win_rate: Number((winRate * 100).toFixed(2)),
          total_pnl: Number(totalPnl.toFixed(2)),
          avg_pnl_per_trade: Number(avgPnl.toFixed(2)),
          profit_factor: Number(profitFactor.toFixed(2)),
          max_drawdown: Number(maxDrawdown.toFixed(2)),
          largest_win: Number(largestWin.toFixed(2)),
          largest_loss: Number(largestLoss.toFixed(2)),
          avg_win: Number(avgWin.toFixed(2)),
          avg_loss: Number(avgLoss.toFixed(2)),
          expectancy: Number(expectancy.toFixed(2)),
          avg_risk_reward: Number(avgRiskReward.toFixed(2)),
          profitable_trades: profitableTrades.length,
          losing_trades: losingTrades.length,
          best_performing_stocks: bestPerformingStocks,
          worst_performing_stocks: worstPerformingStocks,
          monthly_performance: monthlyPerformance,
          drawdown_series: drawdownSeries,
          trade_type_distribution: tradeTypeDistribution,
          status_distribution: statusDistribution,
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
    method: 'PATCH' as const,
    path: '/api/tags/:id/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const id = c.req.param('id');
      const body = await c.req.json();
      
      try {
        const validatedData = tagCreateSchema.partial().parse(body);
        
        const accessToken = getAccessToken(c);
        const { data: tag, error } = await withUserScope(accessToken, 'TradeTags')
          .update(validatedData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return c.json({
              error: true,
              error_id: `tag_${Date.now()}`,
              category: 'not_found' as const,
              message: 'Tag not found'
            }, 404);
          }
          throw error;
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
        const { error } = await withUserScope(accessToken, 'TradeTags')
          .delete()
          .eq('id', id);
        
        if (error) {
          if (error.code === 'PGRST116') {
            return c.json({
              error: true,
              error_id: `tag_${Date.now()}`,
              category: 'not_found' as const,
              message: 'Tag not found'
            }, 404);
          }
          throw error;
        }
        
        return c.json({ message: 'Tag deleted successfully' }, 200);
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
        // Get tags with usage count
        const { data: tags, error } = await supabaseClient
          .rpc('get_popular_tags', { user_uuid: user.id });
        
        if (error) {
          console.warn('Popular tags RPC failed, using fallback:', error);
          
          // Fallback: Get tags and count usage manually
          const { data: allTags } = await supabaseClient
            .from('TradeTags')
            .select('*')
            .eq('user_id', user.id);
            
          const { data: tagRelations } = await supabaseClient
            .from('TradeJournalTags')
            .select('tag_id');
            
          const tagCounts = tagRelations?.reduce((acc, relation) => {
            acc[relation.tag_id] = (acc[relation.tag_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const tagsWithCounts = allTags?.map(tag => ({
            ...tag,
            usage_count: tagCounts[tag.id] || 0
          })).sort((a, b) => b.usage_count - a.usage_count) || [];
          
          return c.json(tagsWithCounts, 200);
        }
        
        return c.json(tags || [], 200);
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
    path: '/api/journal/search/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        const url = new URL(c.req.url);
        const query = url.searchParams.get('q') || '';
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('page_size') || '20');
        
        if (!query.trim()) {
          return c.json({
            error: true,
            error_id: `search_${Date.now()}`,
            category: 'validation' as const,
            message: 'Search query is required'
          }, 400);
        }
        
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const queryLower = query.toLowerCase();
        
        // Get all trades first (since we need to calculate relevance scores)
        const { data: allTrades, error: fetchError } = await supabaseClient
          .from('TradeJournal')
          .select(`
            *,
            TradeTags(id, name, color),
            TradeJournalTags(
              TradeTags(id, name, color)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Calculate relevance scores with 3-tier scoring (matching Django)
        const tradesWithScores = (allTrades || []).map(trade => {
          let maxScore = 0;
          
          // Company name scoring
          const companyName = trade.company_name?.toLowerCase() || '';
          if (companyName === queryLower) {
            maxScore = Math.max(maxScore, 100); // Exact match
          } else if (companyName.startsWith(queryLower)) {
            maxScore = Math.max(maxScore, 50); // Prefix match
          } else if (companyName.includes(queryLower)) {
            maxScore = Math.max(maxScore, 10); // Contains match
          }
          
          // Tags scoring
          if (trade.TradeJournalTags) {
            for (const tagRelation of trade.TradeJournalTags) {
              const tag = tagRelation.TradeTags;
              if (tag?.name) {
                const tagName = tag.name.toLowerCase();
                if (tagName === queryLower) {
                  maxScore = Math.max(maxScore, 100); // Exact match
                } else if (tagName.startsWith(queryLower)) {
                  maxScore = Math.max(maxScore, 50); // Prefix match
                } else if (tagName.includes(queryLower)) {
                  maxScore = Math.max(maxScore, 10); // Contains match
                }
              }
            }
          }
          
          // Personal notes scoring
          const notes = trade.personal_notes?.toLowerCase() || '';
          if (notes.includes(queryLower)) {
            maxScore = Math.max(maxScore, 10); // Contains match
          }
          
          return { ...trade, relevance_score: maxScore };
        });
        
        // Filter trades that have any match
        const matchedTrades = tradesWithScores.filter(trade => trade.relevance_score > 0);
        
        // Sort by relevance score first, then by date
        matchedTrades.sort((a, b) => {
          if (b.relevance_score !== a.relevance_score) {
            return b.relevance_score - a.relevance_score;
          }
          // If scores are equal, sort by date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        // Apply pagination
        const totalCount = matchedTrades.length;
        const paginatedTrades = matchedTrades.slice(from, to + 1);
        
        const response = {
          query,
          count: totalCount,
          next: totalCount > to ? `?q=${encodeURIComponent(query)}&page=${page + 1}` : null,
          previous: page > 1 ? `?q=${encodeURIComponent(query)}&page=${page - 1}` : null,
          results: paginatedTrades
        };
        
        return c.json(response, 200);
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
        const url = new URL(c.req.url);
        const query = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '10');
        
        if (query.length < 2) {
          return c.json([], 200);
        }
        
        const queryLower = query.toLowerCase();
        const suggestions: any[] = [];
        
        // Get company name suggestions with 3-tier scoring
        const { data: trades, error: tradeError } = await supabaseClient
          .from('TradeJournal')
          .select('company_name')
          .eq('user_id', user.id)
          .ilike('company_name', `%${query}%`)
          .limit(50); // Get more to calculate unique names
        
        if (tradeError) {
          throw tradeError;
        }
        
        // Process company names with scoring
        const companyScores: Record<string, { score: number; tradeCount: number }> = {};
        for (const trade of trades || []) {
          const name = trade.company_name;
          if (!name) continue;
          
          if (!companyScores[name]) {
            companyScores[name] = { score: 0, tradeCount: 0 };
          }
          companyScores[name].tradeCount += 1;
          
          const nameLower = name.toLowerCase();
          // 3-tier scoring
          if (nameLower === queryLower) {
            companyScores[name].score = Math.max(companyScores[name].score, 100); // Exact match
          } else if (nameLower.startsWith(queryLower)) {
            companyScores[name].score = Math.max(companyScores[name].score, 50); // Prefix match
          } else {
            companyScores[name].score = Math.max(companyScores[name].score, 10); // Contains match
          }
        }
        
        // Add company suggestions
        Object.entries(companyScores).forEach(([name, data]) => {
          suggestions.push({
            id: `company-${name}`,
            text: name,
            type: 'company',
            score: data.score,
            trade_count: data.tradeCount
          });
        });
        
        // Get tag suggestions with 3-tier scoring
        const { data: tags, error: tagError } = await supabaseClient
          .from('TradeTags')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', `%${query}%`)
          .limit(20);
        
        if (tagError) {
          throw tagError;
        }
        
        for (const tag of tags || []) {
          const nameLower = tag.name.toLowerCase();
          let score = 0;
          
          // 3-tier scoring
          if (nameLower === queryLower) {
            score = 100; // Exact match
          } else if (nameLower.startsWith(queryLower)) {
            score = 50; // Prefix match
          } else {
            score = 10; // Contains match
          }
          
          // Trading term boost (+25 points) - matching Django
          const tradingPatterns = [
            /\d+\s*(ma|ema|rsi|sma)/i,
            /(breakout|support|resistance)/i
          ];
          if (tradingPatterns.some(pattern => pattern.test(queryLower))) {
            score += 25;
          }
          
          suggestions.push({
            id: `tag-${tag.id}`,
            text: tag.name,
            type: 'tag',
            score,
            color: tag.color
          });
        }
        
        // Sort by score and return top suggestions
        suggestions.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // If scores equal, prioritize companies over tags
          if (a.type !== b.type) {
            return a.type === 'company' ? -1 : 1;
          }
          return a.text.localeCompare(b.text);
        });
        
        return c.json(suggestions.slice(0, limit), 200);
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
    path: '/api/journal/tag-analytics/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Get all trades with their tags
        const { data: trades, error } = await supabaseClient
          .from('TradeJournal')
          .select(`
            pnl,
            status,
            TradeJournalTags(
              TradeTags(id, name, color)
            )
          `)
          .eq('user_id', user.id);
        
        if (error) {
          throw error;
        }
        
        // Calculate analytics per tag
        const tagAnalytics = new Map<string, any>();
        
        trades?.forEach(trade => {
          if (trade.TradeJournalTags) {
            trade.TradeJournalTags.forEach((tagRelation: any) => {
              const tag = tagRelation.TradeTags;
              if (!tag) return;
              
              const tagId = tag.id;
              const existing = tagAnalytics.get(tagId) || {
                ...tag,
                total_trades: 0,
                winning_trades: 0,
                losing_trades: 0,
                total_pnl: 0,
                avg_pnl: 0,
                win_rate: 0
              };
              
              existing.total_trades++;
              
              const pnl = trade.pnl || 0;
              existing.total_pnl += pnl;
              
              if (pnl > 0) {
                existing.winning_trades++;
              } else if (pnl < 0) {
                existing.losing_trades++;
              }
              
              tagAnalytics.set(tagId, existing);
            });
          }
        });
        
        // Calculate derived metrics
        const results = Array.from(tagAnalytics.values()).map(tag => ({
          ...tag,
          avg_pnl: tag.total_trades > 0 ? tag.total_pnl / tag.total_trades : 0,
          win_rate: tag.total_trades > 0 ? (tag.winning_trades / tag.total_trades) * 100 : 0
        })).sort((a, b) => b.total_pnl - a.total_pnl);
        
        return c.json(results, 200);
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