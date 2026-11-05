import { useEffect } from 'react';
import { usePathname } from '@/lib/router';
const titles: Record<string, string> = {
  '/': 'Qurilish kompaniyalari uchun yagona ish maydoni',
  '/login': 'Вход', '/reset-password': 'Новый пароль', '/admin': 'Администрирование',
  '/platform-gate': 'Администрирование', '/app': 'Обзор проектов',
  '/app/projects': 'Проекты', '/app/tasks': 'Задачи', '/app/materials': 'Заявки на материалы',
  '/app/expenses': 'Расходы', '/app/reports': 'Журнал объекта', '/app/team': 'Команда',
  '/app/settings': 'Настройки', '/app/billing': 'Тариф и оплата', '/sales': 'Обзор продаж',
  '/sales/chessboard': 'Шахматка квартир', '/sales/leads': 'Воронка лидов', '/sales/analytics': 'Аналитика продаж',
};
export default function PageMetadata() {
  const path = usePathname();
  useEffect(() => {
    const title = titles[path] ?? (path.startsWith('/app/projects/') ? 'Проект' : path.startsWith('/app/drawings/') ? 'Чертёж' : path.startsWith('/sales/leads/') ? 'Карточка лида' : 'Страница не найдена');
    document.title = `${title} | IMORA`;
    document.documentElement.lang = path === '/' ? 'uz' : 'ru';
    document.querySelector('meta[name="robots"]')?.setAttribute('content', path === '/' ? 'index,follow' : 'noindex,nofollow');
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://imora1.vercel.app${path}`);
  }, [path]);
  return null;
}
