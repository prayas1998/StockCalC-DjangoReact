export const withCompanyApiFilters = <T extends { companies?: string[] }>(filters: T): T & { company?: string[] } => {
  const { companies, ...otherFilters } = filters;
  if (!companies?.length) return filters;
  return {
    ...otherFilters,
    company: companies,
    ...(companies.some(name => name.includes(',')) ? {} : { companies }),
  } as T & { company?: string[] };
};
