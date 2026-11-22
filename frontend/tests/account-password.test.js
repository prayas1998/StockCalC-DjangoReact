import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mockFile = path.join(root, 'tests/fixtures/accountMocks.ts');
const mockAliases = [
  '@/context/AuthContext', '@/services/profileApi', '@/components/ui/use-toast',
  '@/components/ui/button', '@/components/ui/input', '@/components/ui/label', '@/components/ui/card',
  '@/components/ui/tabs', '@/components/ui/separator', '@/components/ui/alert-dialog', '@/components/ui/header',
].map(find => ({ find: new RegExp(`^${find.replaceAll('/', '\\/').replaceAll('@', '\\@')}$`), replacement: mockFile }));
mockAliases.push({ find: /^@\//, replacement: `${path.join(root, 'src')}/` });

const makeDom = (passwordResponse) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local/profile' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  globalThis.__accountTest = { toasts: [], clearCalls: [], passwordResponse };
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

const setInput = (dom, id, value) => {
  const input = document.getElementById(id);
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
};

const submitPasswordForm = async (dom, response) => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const Router = await import('react-router-dom');
  const server = await makeServer();
  const { default: Profile } = await server.ssrLoadModule('/src/pages/Profile.tsx');
  const rootNode = createRoot(document.getElementById('root'));
  await React.act(async () => rootNode.render(React.createElement(Router.MemoryRouter, null, React.createElement(Profile))));
  await React.act(async () => {
    setInput(dom, 'current_password', 'old-password');
    setInput(dom, 'new_password', 'new-password-123');
    setInput(dom, 'confirm_password', 'new-password-123');
  });
  await React.act(async () => {
    document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  return { React, rootNode, server, response };
};

test('Django password-change instruction is not treated as a successful change', async () => {
  const response = { message: 'Password change should be handled through Supabase client', action: 'use_supabase_client' };
  const dom = makeDom(response);
  let mounted;
  try {
    mounted = await submitPasswordForm(dom, response);
    assert.equal(__accountTest.clearCalls.length, 0, 'an instruction-only response must not clear the caller session');
    assert.equal(__accountTest.toasts.some(({ title }) => title === 'Password changed'), false);
    assert.equal(__accountTest.toasts.at(-1).title, 'Unable to change password');
    assert.equal(document.getElementById('current_password').value, 'old-password', 'keep the form available for retry');
  } finally {
    if (mounted) {
      await mounted.React.act(async () => mounted.rootNode.unmount());
      await mounted.server.close();
    }
    dom.window.close();
  }
});

test('confirmed new and legacy Hono responses succeed while warning on failed session cleanup', async () => {
  for (const response of [
    { password_changed: true, message: 'Password changed', caller_session_revoked: true, temporary_session_revoked: true },
    { message: 'Password changed', temporary_session_revoked: false },
  ]) {
    const dom = makeDom(response);
    let mounted;
    try {
      mounted = await submitPasswordForm(dom, response);
      assert.equal(__accountTest.clearCalls.length, 1);
      const toast = __accountTest.toasts.find(({ title }) => title === 'Password changed');
      assert.ok(toast, 'confirmed provider response should be reported as success');
      assert.equal(toast.variant, response.temporary_session_revoked === false ? 'destructive' : 'default');
      if (response.temporary_session_revoked === false) {
        assert.match(toast.description, /sessions may remain signed in/i);
      }
    } finally {
      if (mounted) {
        await mounted.React.act(async () => mounted.rootNode.unmount());
        await mounted.server.close();
      }
      dom.window.close();
    }
  }
});

test('confirmed password change warns when caller-session revocation failed', async () => {
  const response = { password_changed: true, message: 'Password changed', caller_session_revoked: false, temporary_session_revoked: true };
  const dom = makeDom(response);
  let mounted;
  try {
    mounted = await submitPasswordForm(dom, response);
    const toast = __accountTest.toasts.find(({ title }) => title === 'Password changed');
    assert.equal(toast.variant, 'destructive');
    assert.match(toast.description, /sessions may remain signed in/i);
  } finally {
    if (mounted) {
      await mounted.React.act(async () => mounted.rootNode.unmount());
      await mounted.server.close();
    }
    dom.window.close();
  }
});
