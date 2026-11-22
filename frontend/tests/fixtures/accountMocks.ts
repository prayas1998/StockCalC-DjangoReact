import React from 'react';

type ToastMessage = { title?: string; description?: string; variant?: string };
type AccountHarness = {
  toasts: ToastMessage[];
  clearCalls: unknown[];
  passwordResponse: Record<string, unknown>;
};
const harness = () => (globalThis as typeof globalThis & { __accountTest: AccountHarness }).__accountTest;

const pushToast = (message: ToastMessage) => harness().toasts.push(message);
export const useToast = () => ({ toast: pushToast });

const clearRevokedSession = async (caller: unknown) => {
  harness().clearCalls.push(caller);
  return true;
};
export const useAuth = () => ({ user: { id: 'alice' }, loading: false, clearRevokedSession });

export const profileApi = {
  getProfile: async () => ({ email: 'alice@example.test', username: 'alice', first_name: '', last_name: '', date_joined: null, last_login: null }),
  getSecurityStatus: async () => ({ active_sessions: 1 }),
  changePassword: async () => ({ data: harness().passwordResponse, caller: { userId: 'alice', accessToken: 'caller-token' } }),
};

type Props = React.PropsWithChildren<Record<string, unknown>>;
export const Button = ({ children, ...props }: Props) => React.createElement('button', props, children);
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props);
export const Label = ({ children, ...props }: Props) => React.createElement('label', props, children);
export const Card = ({ children }: Props) => React.createElement('section', null, children);
export const CardContent = ({ children }: Props) => React.createElement('div', null, children);
export const CardDescription = ({ children }: Props) => React.createElement('p', null, children);
export const CardHeader = ({ children }: Props) => React.createElement('header', null, children);
export const CardTitle = ({ children }: Props) => React.createElement('h2', null, children);
export const Tabs = ({ children }: Props) => React.createElement('div', null, children);
export const TabsContent = ({ children }: Props) => React.createElement('section', null, children);
export const TabsList = ({ children }: Props) => React.createElement('div', null, children);
export const TabsTrigger = ({ children, ...props }: Props) => React.createElement('button', props, children);
export const Separator = () => React.createElement('hr');
export const AlertDialog = ({ children }: Props) => React.createElement('div', null, children);
export const AlertDialogAction = ({ children, ...props }: Props) => React.createElement('button', props, children);
export const AlertDialogCancel = ({ children, ...props }: Props) => React.createElement('button', props, children);
export const AlertDialogContent = ({ children }: Props) => React.createElement('div', null, children);
export const AlertDialogDescription = ({ children }: Props) => React.createElement('p', null, children);
export const AlertDialogFooter = ({ children }: Props) => React.createElement('div', null, children);
export const AlertDialogHeader = ({ children }: Props) => React.createElement('header', null, children);
export const AlertDialogTitle = ({ children }: Props) => React.createElement('h2', null, children);
export const AlertDialogTrigger = ({ children, ...props }: Props) => React.createElement('button', props, children);
const Header = () => null;
export default Header;
