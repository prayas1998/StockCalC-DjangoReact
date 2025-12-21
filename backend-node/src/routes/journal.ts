import { Context } from 'hono';
import { requireAuth } from '../middleware/auth';
import { tradeJournalCreateSchema, paginationSchema, journalFilterSchema, tagCreateSchema } from '../validators/schemas';
import { TradeJournalCreate, PaginatedResponse } from '../types';
import { supabaseClient, withUserScope } from '../services/supabase';
import { TradeType, Broker, Exchange } from '../types/database';

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
        
        // Create journal entry with user scoping
        const { data: trade, error } = await withUserScope(user.id, 'TradeJournal').insert({
          ...validatedData,
          user_id: user.id
        }).select().single();
        
        if (error) {
          throw error;
        }
        
        // Handle tags if provided
        if (validatedData.tags && validatedData.tags.length > 0) {
          // Create tag relationships
          const tagRelations = validatedData.tags.map(tagId => ({
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
        
        const { data: trade, error } = await withUserScope(user.id, 'TradeJournal')
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
        const { error } = await withUserScope(user.id, 'TradeJournal')
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
        
        const { data: tag, error } = await withUserScope(user.id, 'TradeTags').insert({
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
        // Get all user trades for analytics
        const { data: trades, error } = await supabaseClient
          .from('TradeJournal')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) {
          throw error;
        }
        
        const closedTrades = trades?.filter(t => t.status === 'CLOSED') || [];
        const profitableTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
        
        const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalWinAmount = profitableTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLossAmount = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        
        const winRate = closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length) * 100 : 0;
        const avgPnl = closedTrades.length > 0 ? totalPnl / closedTrades.length : 0;
        const avgWin = profitableTrades.length > 0 ? totalWinAmount / profitableTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? totalLossAmount / losingTrades.length : 0;
        const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
        const expectancy = closedTrades.length > 0 ? (totalPnl / closedTrades.length) : 0;
        
        return c.json({
          total_trades: trades?.length || 0,
          open_trades: trades?.filter(t => t.status === 'OPEN').length || 0,
          closed_trades: closedTrades.length,
          win_rate: Number(winRate.toFixed(2)),
          total_pnl: Number(totalPnl.toFixed(2)),
          avg_pnl_per_trade: Number(avgPnl.toFixed(2)),
          profit_factor: Number(profitFactor.toFixed(2)),
          max_drawdown: 0, // TODO: Calculate drawdown
          largest_win: profitableTrades.length > 0 ? Math.max(...profitableTrades.map(t => t.pnl || 0)) : 0,
          largest_loss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0,
          avg_win: Number(avgWin.toFixed(2)),
          avg_loss: Number(avgLoss.toFixed(2)),
          expectancy: Number(expectancy.toFixed(2)),
          avg_risk_reward: 0, // TODO: Calculate risk/reward
          profitable_trades: profitableTrades.length,
          losing_trades: losingTrades.length,
          best_performing_stocks: [], // TODO: Calculate by stock performance
          worst_performing_stocks: [], // TODO: Calculate by stock performance
          monthly_performance: [], // TODO: Group by month
          drawdown_series: [], // TODO: Calculate drawdown series
          trade_type_distribution: [], // TODO: Group by trade_type
          status_distribution: [], // TODO: Group by status
          tag_performance: [] // TODO: Calculate by tags
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
  }
];