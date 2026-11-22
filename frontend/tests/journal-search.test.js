import assert from 'node:assert/strict';
import test from 'node:test';
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
  '@/components/journal/components/FilterDialog',
  '@/components/journal/TradeFormDialog', '@/components/journal/TagManager', '@/components/journal', '@/components/journal/utils',
].map(find => ({ find: new RegExp(`^${find.replaceAll('/', '\\/').replaceAll('@', '\\@')}$`), replacement: mockFile }));
mockAliases.push({ find: /^@\/components\/journal\/components\/TradesList$/, replacement: path.join(root, 'src/components/journal/components/TradesList.tsx') });
mockAliases.push({ find: '../TradeCard', replacement: mockFile });
mockAliases.push({ find: 'react-intersection-observer', replacement: mockFile });
mockAliases.push({ find: /^@\//, replacement: `${path.join(root, 'src')}/` });

const waitFor = async predicate => {
  for (let i = 0; i < 50; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('timed out waiting for mounted journal state');
};

const makeDom = () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local/' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  globalThis.__uiTest = { searches: [], suggestions: [], calculations: [], baseTrades: [{ id: 99, company_name: 'Unrelated base row' }] };
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

test('changing status after search clears old matches and searches with current filters', async () => {
  const dom = makeDom();
  const server = await makeServer();
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const Router = await import('react-router-dom');
    const { default: JournalPage } = await server.ssrLoadModule('/src/pages/JournalPage.tsx');
    const App = () => React.createElement(JournalPage);
    const rootNode = createRoot(document.getElementById('root'));
    await React.act(async () => rootNode.render(React.createElement(Router.MemoryRouter, {
      initialEntries: ['/journal?query=ACME&company=ACME&trade_type=EQUITY_DELIVERY'],
    }, React.createElement(App))));

    await waitFor(() => __uiTest.searches.length === 1);
    assert.equal(document.querySelector('[role="status"]')?.textContent, 'Searching trades...');
    assert.equal(document.querySelector('[data-trade-id="99"]'), null, 'base rows should not be shown while the server search is pending');
    assert.deepEqual(__uiTest.searches[0].args, ['ACME', {
      trade_type: ['EQUITY_DELIVERY'], company: ['ACME'], companies: ['ACME'],
    }]);
    await React.act(async () => __uiTest.searches[0].resolve({ results: [{ id: 1, status: 'CLOSED_MANUAL' }] }));
    assert.deepEqual([...document.querySelectorAll('[data-testid="trade-card"]')].map(card => card.dataset.tradeId), ['1']);

    await React.act(async () => document.getElementById('open-filter-dialog').click());
    await React.act(async () => document.getElementById('select-open-status').click());
    assert.equal(__uiTest.searches.length, 2, 'selecting Open while search results are visible should rerun the server search');
    assert.equal(document.querySelector('[role="status"]')?.textContent, 'Searching trades...');
    assert.equal(document.querySelector('[data-trade-id="1"]'), null, 'old closed matches should disappear while the Open search is pending');
    assert.equal(document.querySelector('[data-trade-id="99"]'), null, 'base rows should not replace active search results');
    assert.deepEqual(__uiTest.journalFilters, {
      status: ['OPEN'], trade_type: ['EQUITY_DELIVERY'], tags: [], company: ['ACME'], companies: ['ACME'],
    });
    assert.deepEqual(__uiTest.searches[1].args, ['ACME', {
      status: ['OPEN'], trade_type: ['EQUITY_DELIVERY'], company: ['ACME'], companies: ['ACME'],
    }]);

    await React.act(async () => document.getElementById('select-closed-status').click());
    assert.equal(__uiTest.searches.length, 3);
    await React.act(async () => __uiTest.searches[2].resolve({ results: [{ id: 3, status: 'CLOSED_MANUAL' }] }));
    await React.act(async () => __uiTest.searches[1].resolve({ results: [{ id: 2, status: 'OPEN' }] }));
    assert.deepEqual([...document.querySelectorAll('[data-testid="trade-card"]')].map(card => card.dataset.tradeId), ['3'], 'a late Open response must not replace the latest filter result');

    await React.act(async () => rootNode.unmount());
  } finally {
    await server.close();
    dom.window.close();
  }
});
