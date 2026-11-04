import type { Access } from '@/lib/types';
import { formatDate } from '@/lib/format';

export function accessBlockMessage(access: Access): string | null {
  if (access.profile_status === 'blocked') {
    return 'Доступ для вашей учётной записи закрыт. Обратитесь к администратору компании.';
  }
  if (access.role === 'SUPER_ADMIN') return null;
  if (!access.company_id) {
    return 'Учётная запись не привязана к компании. Обратитесь к администратору IMORA.';
  }
  if (access.company_status === 'suspended') {
    return 'Доступ компании приостановлен. Все данные сохранены. Свяжитесь с IMORA, чтобы возобновить работу.';
  }
  if (access.company_status === 'expired') {
    return `Срок доступа компании истёк ${formatDate(access.access_until)}. Все данные сохранены. Свяжитесь с IMORA для продления.`;
  }
  return null;
}

// Navigation visibility helpers — drive menu rendering in App.tsx
export function canSeeConstructionNav(role: Access['role']): boolean {
  return ['COMPANY_ADMIN', 'ENGINEER', 'FOREMAN', 'SUPPLY_MANAGER', 'MEMBER'].includes(role);
}

export function canSeeSalesNav(role: Access['role']): boolean {
  return ['COMPANY_ADMIN', 'SALES_MANAGER', 'SALES_LEAD'].includes(role);
}

export function canSeeFinanceNav(role: Access['role']): boolean {
  return ['COMPANY_ADMIN', 'SALES_LEAD'].includes(role);
}

export function canSeeTeamNav(role: Access['role']): boolean {
  return role === 'COMPANY_ADMIN';
}

export function canSeeBillingNav(role: Access['role']): boolean {
  return role === 'COMPANY_ADMIN';
}

export function canSeeSettingsNav(role: Access['role']): boolean {
  return role === 'COMPANY_ADMIN';
}

