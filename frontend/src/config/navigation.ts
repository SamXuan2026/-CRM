import demoAccess from './demoAccess.json';

export type AppRole =
  | 'admin'
  | 'manager'
  | 'sales_lead'
  | 'sales'
  | 'marketing'
  | 'customer_service';

export type DemoAccount = (typeof demoAccess.demoAccounts)[number];

const defaultRoutes = demoAccess.defaultRoutes as Record<AppRole, string>;

export const DEMO_ACCOUNTS: DemoAccount[] = demoAccess.demoAccounts;

export const getDefaultRouteForRole = (role?: string | null) => {
  if (!role) {
    return '/settings';
  }

  return defaultRoutes[role as AppRole] || '/settings';
};
