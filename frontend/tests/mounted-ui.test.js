import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mockFile = path.join(root, 'tests/fixtures/uiMocks.ts');
const mockAliases = [
  '@/services/api', '@/services/journalApi', '@/hooks/useJournal', '@/hooks/useTradeTags',
  '@/components/ui/button', '@/components/ui/tabs', '@/components/journal/components/SearchAndFilters',
  '@/components/journal/components/TradesList', '@/components/journal/components/FilterDialog',
  '@/components/journal/TradeFormDialog', '@/components/journal/TagManager', '@/components/journal', '@/components/journal/utils',
].map(find => ({ find: new RegExp(`^${find.replaceAll('/', '\\/').replaceAll('@', '\\@')}$`), replacement: mockFile }));
mockAliases.push({ find: /^@\//, replacement: `${path.join(root, 'src')}/` });

const waitFor = async predicate => {
  for (let i = 0; i < 50; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('timed out waiting for mounted UI state');
};
const makeDom = () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local/' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  globalThis.__uiTest = { searches: [], suggestions: [], calculations: [] };
  return dom;
};
const makeServer = () => createServer({
  configFile: false,
  root,
  plugins: [react()],
  resolve: { alias: mockAliases },
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: 'custom',
});

test('mounted journal restores the URL being visited and ignores reversed search replies', async () => {
  const dom = makeDom();
  const server = await makeServer();
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const Router = await import('react-router-dom');
    const { default: JournalPage } = await server.ssrLoadModule('/src/pages/JournalPage.tsx');
    let navigate;
    const App = () => { navigate = Router.useNavigate(); return React.createElement(JournalPage); };
    const rootNode = createRoot(document.getElementById('root'));
    await React.act(async () => rootNode.render(React.createElement(Router.MemoryRouter, {
      initialEntries: ['/journal?query=Bravo&status=CLOSED&company=ACME%2C%20Inc&company=Second', '/journal?query=Alpha&status=OPEN&company=Simple', '/journal'], initialIndex: 2,
    }, React.createElement(App))));

    await React.act(async () => {
      __uiTest.searchProps.onSearchQueryChange('A');
      await new Promise(resolve => setTimeout(resolve, 30));
    });
    assert.equal(__uiTest.searches.length, 0, 'typing a query on a bare URL should not automatically search');

    await React.act(async () => navigate(-1));
    await waitFor(() => __uiTest.searches.length === 1);
    assert.deepEqual(__uiTest.searches[0].args, ['Alpha', { status: ['OPEN'], company: ['Simple'], companies: ['Simple'] }]);
    assert.deepEqual(__uiTest.journalFilters, { status: ['OPEN'], trade_type: [], tags: [], companies: ['Simple'], company: ['Simple'] });
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    assert.equal(__uiTest.searches.length, 1, 'pending debounced typing must not overwrite the restored URL state');
    await React.act(async () => navigate(-1));
    await waitFor(() => __uiTest.searches.length === 2);
    assert.deepEqual(__uiTest.searches[1].args, ['Bravo', { status: ['CLOSED'], company: ['ACME, Inc', 'Second'] }]);
    assert.deepEqual(__uiTest.journalFilters, { status: ['CLOSED'], trade_type: [], tags: [], company: ['ACME, Inc', 'Second'] });

    await React.act(async () => __uiTest.searches[1].resolve({ results: [{ id: 2 }] }));
    await React.act(async () => __uiTest.searches[0].resolve({ results: [{ id: 1 }] }));
    assert.deepEqual(__uiTest.tradeProps.searchResults.map(({ id }) => id), [2]);

    await React.act(async () => { __uiTest.searchProps.onSearch(); });
    await waitFor(() => __uiTest.searches.length === 3);
    await React.act(async () => { __uiTest.searchProps.onSuggestionSelect({ text: 'Suggested', type: 'company' }); });
    await waitFor(() => __uiTest.searches.length === 4);
    await React.act(async () => __uiTest.searches[3].resolve({ results: [{ id: 4 }] }));
    await React.act(async () => __uiTest.searches[2].resolve({ results: [{ id: 3 }] }));
    assert.deepEqual(__uiTest.tradeProps.searchResults.map(({ id }) => id), [4]);

    await React.act(async () => { void __uiTest.formProps.onTradeUpdated(); });
    await waitFor(() => __uiTest.searches.length === 5);
    await React.act(async () => document.getElementById('clear-search').click());
    await React.act(async () => __uiTest.searches[4].resolve({ results: [{ id: 5 }] }));
    assert.equal(__uiTest.tradeProps.searchQuery, '');
    assert.equal(__uiTest.tradeProps.searchResults, null);
    await React.act(async () => rootNode.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test('mounted calculator clears old result and ignores delayed success/error after clear or newer calculation', async () => {
  const dom = makeDom();
  const server = await makeServer();
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { CalculatorProvider, useCalculatorContext } = await server.ssrLoadModule('/src/context/CalculatorContext.tsx');
    const { useCalculation } = await server.ssrLoadModule('/src/hooks/useCalculation.tsx');
    let controls;
    const Probe = () => {
      const context = useCalculatorContext();
      const calculation = useCalculation();
      controls = { ...context, ...calculation };
      return React.createElement('output', null, JSON.stringify(calculation.calculationState));
    };
    const rootNode = createRoot(document.getElementById('root'));
    await React.act(async () => rootNode.render(React.createElement(CalculatorProvider, null, React.createElement(Probe))));
    await React.act(async () => controls.setTransactions([{ id: '1', companyName: '', quantity: '1', buyPrice: '10', sellPrice: '0' }]));
    await React.act(async () => { void controls.handleManualCalculation(); });
    await waitFor(() => __uiTest.calculations.length === 1);
    await React.act(async () => {
      controls.clearCalculation();
      controls.setTransactions([{ id: '1', companyName: '', quantity: '0', buyPrice: '0', sellPrice: '0' }]);
    });
    await React.act(async () => __uiTest.calculations[0].resolve({ summary: { netPnL: '99' }, charges: {} }));
    assert.equal(controls.calculationState.result, null);

    await React.act(async () => controls.setTransactions([{ id: '1', companyName: '', quantity: '2', buyPrice: '10', sellPrice: '0' }]));
    await React.act(async () => { void controls.handleManualCalculation(); });
    await waitFor(() => __uiTest.calculations.length === 2);
    await React.act(async () => controls.setTransactions([{ id: '1', companyName: '', quantity: '3', buyPrice: '10', sellPrice: '0' }]));
    await React.act(async () => { void controls.handleManualCalculation(); });
    await waitFor(() => __uiTest.calculations.length === 3);
    await React.act(async () => __uiTest.calculations[2].resolve({ summary: { netPnL: '30' }, charges: {} }));
    await React.act(async () => __uiTest.calculations[1].reject(new Error('late failure')));
    assert.equal(controls.calculationState.result.summary.netPnL, '30');
    await React.act(async () => rootNode.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});

test('mounted suggestions ignore reversed replies and a cleared query', async () => {
  const dom = makeDom();
  const server = await makeServer();
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { useSimpleSearch } = await server.ssrLoadModule('/src/hooks/useSimpleSearch.ts');
    let setQuery;
    let state;
    const Probe = () => {
      const [query, updateQuery] = React.useState('');
      setQuery = updateQuery;
      state = useSimpleSearch({ searchQuery: query });
      return React.createElement('output', { id: 'suggestions' }, JSON.stringify(state.suggestions));
    };
    const rootNode = createRoot(document.getElementById('root'));
    await React.act(async () => rootNode.render(React.createElement(Probe)));
    await React.act(async () => { setQuery('Alpha'); });
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 220)); });
    await waitFor(() => __uiTest.suggestions.length === 1);
    await React.act(async () => { setQuery('Bravo'); });
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 220)); });
    await waitFor(() => __uiTest.suggestions.length === 2);
    await React.act(async () => __uiTest.suggestions[1].resolve([{ id: '2', text: 'Bravo Co', type: 'company', score: 8 }, { id: 'bad', text: 2 }]));
    await React.act(async () => __uiTest.suggestions[0].resolve([{ id: '1', text: 'Alpha Co', type: 'company', score: 7 }]));
    assert.deepEqual(state.suggestions.map(({ text }) => text), ['Bravo Co']);

    await React.act(async () => { setQuery('Charlie'); });
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 220)); });
    await waitFor(() => __uiTest.suggestions.length === 3);
    await React.act(async () => { setQuery(''); });
    await React.act(async () => __uiTest.suggestions[2].resolve([{ id: '3', text: 'Charlie Co', type: 'company', score: 6 }]));
    assert.deepEqual(state.suggestions, []);
    assert.equal(state.isLoading, false);
    await React.act(async () => rootNode.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
