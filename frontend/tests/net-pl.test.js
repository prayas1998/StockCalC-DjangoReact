import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [new URL('../src/services/calculators/NetPLCalculatorService.ts', import.meta.url).pathname],
  tsconfig: new URL('../tsconfig.app.json', import.meta.url).pathname,
  bundle: true,
  format: 'esm',
  write: false,
});
const { NetPLCalculatorService } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

const groww = { exchange: 'NSE', broker: 'Groww', tradeType: 'equity-intraday' };
const lowPriceShort = { ...groww, positionType: 'short', quantity: 10000, entryPrice: 0.01 };

const calculate = params => NetPLCalculatorService.calculateNetPL(params);

test('blank exit skips P&L when a positive breakeven is unavailable', () => {
  const unavailable = { exitPrice: null, reason: 'breakeven-unavailable' };
  assert.deepEqual(calculate(lowPriceShort), unavailable);
  assert.deepEqual(calculate({ ...groww, positionType: 'long', quantity: 1, entryPrice: 1e14 }), unavailable);
});

test('blank exit uses an available breakeven on either side', () => {
  for (const [positionType, expected] of [['long', 106.09], ['short', 94.25]]) {
    const params = { ...groww, positionType, quantity: 1, entryPrice: 100 };
    const result = calculate(params);
    assert.equal(result.exitPrice, expected);
    assert.equal(result.breakevenPrice, expected);
    assert.deepEqual(result, calculate({ ...params, exitPrice: expected }));
  }
});

test('positive manual exits calculate P&L without requiring a breakeven quote', () => {
  const short = calculate({ ...lowPriceShort, exitPrice: 0.01 });
  assert.equal(short.exitPrice, 0.01);
  assert.equal(short.breakevenPrice, 0);
  assert.equal(short.netProfit, -5.91);

  const long = calculate({ ...groww, positionType: 'long', quantity: 1, entryPrice: 100, exitPrice: 120 });
  assert.equal(long.exitPrice, 120);
  assert.equal(long.grossProfit, 20);
  assert.ok(long.netProfit > 0);
});

test('explicit invalid exit values cannot request a breakeven estimate', () => {
  const params = { ...groww, positionType: 'long', quantity: 1, entryPrice: 100 };
  for (const exitPrice of [0, -1, NaN, Infinity]) {
    assert.deepEqual(calculate({ ...params, exitPrice }), { exitPrice: null, reason: 'invalid-exit' });
  }
});

test('mounted Net P&L invalidates stale reports and distinguishes incomplete exits from blank', async () => {
  const { JSDOM } = await import('jsdom');
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react-swc');
  const { createServer: createHttpServer } = await import('node:http');
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local/' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const root = new URL('../', import.meta.url).pathname;
  const server = await createServer({
    root,
    configFile: false,
    plugins: [react()],
    resolve: { alias: [{ find: /^@\//, replacement: `${root}src/` }] },
    optimizeDeps: { noDiscovery: true, entries: [] },
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  });
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { useNetPLCalculator } = await server.ssrLoadModule('/src/hooks/useNetPLCalculator.ts');
    const { NetPLCalculatorPresenter } = await server.ssrLoadModule('/src/components/calculators/NetPLCalculatorPresenter.tsx');
    const initialSettings = { exchange: 'NSE', selectedBroker: 'Dhan', selectedTradeType: 'equity-intraday', positionType: 'long' };
    const commits = [];
    let controls;
    let updateSettings;
    const noop = () => {};
    function Harness() {
      const [settings, setSettings] = React.useState(initialSettings);
      updateSettings = next => setSettings(previous => ({ ...previous, ...next }));
      controls = useNetPLCalculator(settings);
      React.useLayoutEffect(() => {
        const reportVisible = document.body.textContent.includes('P&L Analysis');
        commits.push(reportVisible);
      });
      return React.createElement(NetPLCalculatorPresenter, {
        ...controls,
        sharedState: settings,
        onPositionTypeChange: noop,
        onBrokerChange: noop,
        onTradeTypeChange: noop,
      });
    }
    const mounted = createRoot(document.getElementById('root'));
    await React.act(async () => mounted.render(React.createElement(Harness)));
    try {
      await React.act(async () => {
        controls.updateField('quantity', '10');
        controls.updateField('buyPrice', '100');
        controls.updateField('sellPrice', '110');
      });
      for (const [description, edit] of [
        ['quantity', () => controls.updateField('quantity', '11')],
        ['entry', () => controls.updateField('buyPrice', '101')],
        ['exit', () => controls.updateField('sellPrice', '111')],
        ['broker', () => updateSettings({ selectedBroker: 'Groww' })],
        ['exchange', () => updateSettings({ exchange: 'BSE' })],
        ['direction', () => updateSettings({ positionType: 'short' })],
        ['trade type', () => updateSettings({ selectedTradeType: 'equity-delivery', positionType: 'long' })],
      ]) {
        await React.act(async () => controls.calculate());
        assert.equal(commits.at(-1), true);
        const change = commits.length;
        await React.act(async () => edit());
        assert.equal(commits[change], false, `${description} must hide the report in its first commit`);
      }

      const calculateButton = document.querySelector('button[aria-label="Calculate Net P&L"]');
      await React.act(async () => controls.updateField('sellPrice', '0.'));
      const sellInput = document.getElementById('sellPrice');
      await React.act(async () => sellInput.dispatchEvent(new dom.window.FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: calculateButton,
      })));
      await React.act(async () => calculateButton.click());
      assert.match(document.body.textContent, /Enter a positive exit price/);
      assert.equal(commits.at(-1), false);

      await React.act(async () => controls.updateField('sellPrice', ''));
      await React.act(async () => calculateButton.click());
      assert.equal(commits.at(-1), true);
    } finally {
      await React.act(async () => mounted.unmount());
    }
  } finally {
    await server.close();
    dom.window.close();
  }
});
