/**
 * Custom hook for managing journal page state
 * Centralizes state management and provides clean interface
 */

import { useState, useCallback } from 'react';
import { TradeJournal, TradeStatus, TradeType } from '@/types/journal';

interface JournalState {
  // Form dialog state
  formDialogOpen: boolean;
  editingTrade: TradeJournal | null;
  formMode: 'add' | 'edit';
  
  // Search state
  searchQuery: string;
  isSearching: boolean;
  searchResults: TradeJournal[] | null;
  selectedCompany: string | null;
  
  // Filter dialog state
  filterDialogOpen: boolean;
  
  // UI state
  activeTab: string;
}

interface JournalStateActions {
  // Form dialog actions
  openAddTradeDialog: () => void;
  openEditTradeDialog: (trade: TradeJournal) => void;
  closeFormDialog: () => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setIsSearching: (searching: boolean) => void;
  setSearchResults: (results: TradeJournal[] | null) => void;
  setSelectedCompany: (company: string | null) => void;
  clearSearch: () => void;
  
  // Filter dialog actions
  openFilterDialog: () => void;
  closeFilterDialog: () => void;
  
  // UI actions
  setActiveTab: (tab: string) => void;
}

const initialState: JournalState = {
  formDialogOpen: false,
  editingTrade: null,
  formMode: 'add',
  searchQuery: '',
  isSearching: false,
  searchResults: null,
  selectedCompany: null,
  filterDialogOpen: false,
  activeTab: 'trades',
};

export function useJournalState(): JournalState & JournalStateActions {
  const [state, setState] = useState<JournalState>(initialState);

  // Form dialog actions
  const openAddTradeDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      formMode: 'add',
      editingTrade: null,
      formDialogOpen: true,
    }));
  }, []);

  const openEditTradeDialog = useCallback((trade: TradeJournal) => {
    setState(prev => ({
      ...prev,
      formMode: 'edit',
      editingTrade: trade,
      formDialogOpen: true,
    }));
  }, []);

  const closeFormDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      formDialogOpen: false,
      editingTrade: null,
    }));
  }, []);

  // Search actions
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setIsSearching = useCallback((searching: boolean) => {
    setState(prev => ({ ...prev, isSearching: searching }));
  }, []);

  const setSearchResults = useCallback((results: TradeJournal[] | null) => {
    setState(prev => ({ ...prev, searchResults: results }));
  }, []);

  const setSelectedCompany = useCallback((company: string | null) => {
    setState(prev => ({ ...prev, selectedCompany: company }));
  }, []);

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      searchResults: null,
      selectedCompany: null,
      isSearching: false,
    }));
  }, []);

  // Filter actions
  const openFilterDialog = useCallback(() => {
    setState(prev => ({ ...prev, filterDialogOpen: true }));
  }, []);

  const closeFilterDialog = useCallback(() => {
    setState(prev => ({ ...prev, filterDialogOpen: false }));
  }, []);


  // UI actions
  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  return {
    ...state,
    openAddTradeDialog,
    openEditTradeDialog,
    closeFormDialog,
    setSearchQuery,
    setIsSearching,
    setSearchResults,
    setSelectedCompany,
    clearSearch,
    openFilterDialog,
    closeFilterDialog,
    setActiveTab,
  };
}