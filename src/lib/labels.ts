export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    'Платформенный администратор',
  COMPANY_ADMIN:  'Администратор компании',
  ENGINEER:       'Инженер ПТО / Сметчик',
  FOREMAN:        'Прораб',
  SUPPLY_MANAGER: 'Снабженец',
  SALES_MANAGER:  'Менеджер продаж',
  SALES_LEAD:     'Руководитель отдела продаж',
  MEMBER:         'Сотрудник',
};

// Описания для UI подсказок при создании пользователя
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  COMPANY_ADMIN:  'Полный доступ: команда, проекты, сметы, закупки, финансы, CRM',
  ENGINEER:       'Чертежи, версионные сметы, объёмы работ. Без CRM продаж и маржи',
  FOREMAN:        'Только свои проекты: заявки на материалы, ежедневные отчёты',
  SUPPLY_MANAGER: 'Реестр заявок по всем объектам: поставщики, цены, доставка',
  SALES_MANAGER:  'Только отдел продаж: шахматка, воронка, карточки клиентов, КП',
  SALES_LEAD:     'Продажи + аналитика команды: план/факт выручки, конверсия',
  MEMBER:         'Базовый доступ к проектам и задачам',
};

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  trial: 'Пробный период',
  active: 'Активна',
  suspended: 'Приостановлена',
  expired: 'Истекла',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: 'Планирование',
  active: 'В работе',
  on_hold: 'Пауза',
  completed: 'Завершён',
  archived: 'В архиве',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  blocked: 'Заблокирована',
  done: 'Готово',
  cancelled: 'Отменена',
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
  urgent: 'Срочный',
};

export const MATERIAL_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  submitted: 'На согласовании',
  approved: 'Согласована',
  rejected: 'Отклонена',
  ordered: 'Заказана',
  delivered: 'Доставлена',
  cancelled: 'Отменена',
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  materials: 'Материалы',
  labor: 'Работы и зарплата',
  equipment: 'Техника',
  subcontractors: 'Субподряд',
  transport: 'Доставка и транспорт',
  overhead: 'Накладные расходы',
  other: 'Прочее',
};

export const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT'];

export const UNITS = ['шт', 'м', 'м²', 'м³', 'кг', 't', 'компл', 'ч', 'смена', 'мешок'];

export const DEAL_STAGE_LABELS: Record<string, string> = {
  new:          'Новый лид',
  qualification:'Квалификация',
  showing:      'Показ объекта',
  negotiation:  'Переговоры',
  reservation:  'Бронь',
  contract:     'Договор',
  payment:      'Оплата получена',
  lost:         'Отказ',
};

export const DEAL_STAGE_COLORS: Record<string, string> = {
  new:          'sky',
  qualification:'blue',
  showing:      'violet',
  negotiation:  'amber',
  reservation:  'orange',
  contract:     'emerald',
  payment:      'green',
  lost:         'slate',
};

export const PURCHASE_METHOD_LABELS: Record<string, string> = {
  full_payment:      'Полная оплата (100%)',
  mortgage:          'Ипотека (банк)',
  installment:       'Рассрочка от застройщика',
  trade_in:          'Трейд-ин',
  maternity_capital: 'Материнский капитал',
  subsidy:           'Субсидия / Льготная программа',
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
  apartment:   'Квартира',
  commercial:  'Коммерческое помещение',
  cottage:     'Коттедж / Дом',
  parking:     'Машиноместо',
  storage:     'Кладовая',
};

export const UNIT_SALE_STATUS_LABELS: Record<string, string> = {
  free:         'Свободна',
  reserved:     'Бронь',
  sold:         'Продана',
  not_for_sale: 'Не продаётся',
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call:         'Звонок',
  meeting:      'Встреча',
  message:      'Сообщение',
  email:        'Email',
  note:         'Заметка',
  stage_change: 'Смена стадии',
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  avito:     'Авито Недвижимость',
  cian:      'ЦИАН',
  domclick:  'ДомКлик / Сбербанк',
  instagram: 'Instagram / Facebook',
  tiktok:    'TikTok',
  referral:  'Рекомендация',
  walk_in:   'Пришёл сам (офис продаж)',
  call_in:   'Входящий звонок',
  site:      'Сайт компании',
  other:     'Другой источник',
};

export const PAYMENT_SCHEDULE_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидается',
  paid:    'Оплачен',
  overdue: 'Просрочен',
};
