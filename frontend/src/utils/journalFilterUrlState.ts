import type { JournalFilters, TradeStatus, TradeType } from '@/types/journal';

export const filtersFromParams = (params: URLSearchParams): JournalFilters => {
  const filters: JournalFilters = {};
  const status = params.get('status');
  if (status) filters.status = status.split(',') as TradeStatus[];
  const tradeType = params.get('trade_type');
  if (tradeType) filters.trade_type = tradeType.split(',') as TradeType[];
  const startDate = params.get('start_date');
  if (startDate) filters.start_date = startDate;
  const endDate = params.get('end_date');
  if (endDate) filters.end_date = endDate;
  const tagIds = params.get('tag_ids');
  if (tagIds) filters.tags = tagIds.split(',').map(id => parseInt(id, 10));
  const companies = params.getAll('company');
  if (companies.length) filters.companies = companies;
  else {
    const legacyCompanies = params.get('companies');
    if (legacyCompanies) filters.companies = legacyCompanies.split(',');
  }
  const isProfitable = params.get('is_profitable');
  if (isProfitable !== null) filters.is_profitable = isProfitable === 'true';
  return filters;
};

export const filtersToParams = (filters: JournalFilters, query: string): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status);
  if (filters.trade_type?.length) params.set('trade_type', Array.isArray(filters.trade_type) ? filters.trade_type.join(',') : filters.trade_type);
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (filters.tags?.length) params.set('tag_ids', filters.tags.join(','));
  filters.companies?.forEach(company => params.append('company', company));
  if (filters.is_profitable !== undefined) params.set('is_profitable', String(filters.is_profitable));
  if (query) params.set('query', query);
  return params;
};
