// ─── ROLES ───────────────────────────────────────────────────────────────────
// SUPER_ADMIN     — владелец платформы (входит через /platform-gate)
// COMPANY_ADMIN   — администратор компании-клиента: управляет командой, проектами,
//                   сметами, закупками, видит финансы и маржу
// ENGINEER        — инженер ПТО / сметчик: чертежи, сметы, объёмы, закупки.
//                   НЕ видит: CRM клиентов, выручку от продаж, маржу компании
// FOREMAN         — прораб на стройке: только свои проекты, заявки на материалы
//                   и ежедневные отчёты. Никаких финансов и CRM
// SUPPLY_MANAGER  — снабженец: реестр согласованных заявок по всем объектам,
//                   проставление цен поставщиков и статусов доставки
// SALES_MANAGER   — менеджер отдела продаж: ТОЛЬКО шахматка, воронка сделок,
//                   карточки клиентов и КП. Строительные сметы и закупки СКРЫТЫ
// SALES_LEAD      — руководитель отдела продаж: то же, что SALES_MANAGER +
//                   аналитика продаж команды, план/факт выручки от реализации
export type Role =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'ENGINEER'
  | 'FOREMAN'
  | 'SUPPLY_MANAGER'
  | 'SALES_MANAGER'
  | 'SALES_LEAD'
  | 'MEMBER'; // legacy / generic employee
export type CompanyStatus = 'trial' | 'active' | 'suspended' | 'expired';

// ─── ROLE HELPERS ────────────────────────────────────────────────────────────
// Returns true if this role belongs to the Sales department
export function isSalesRole(role: Role): boolean {
  return role === 'SALES_MANAGER' || role === 'SALES_LEAD';
}
// Returns true if this role has access to construction workspace (non-sales)
export function isConstructionRole(role: Role): boolean {
  return ['COMPANY_ADMIN', 'ENGINEER', 'FOREMAN', 'SUPPLY_MANAGER', 'MEMBER'].includes(role);
}
// Returns true if role can approve financial operations (budgets, expenses)
export function canApproveFinance(role: Role): boolean {
  return role === 'COMPANY_ADMIN';
}
// Returns true if role can see internal construction costs & margins
export function canSeeConstructionFinance(role: Role): boolean {
  return role === 'COMPANY_ADMIN' || role === 'ENGINEER';
}
// Returns true if role can create/edit estimates
export function canEditEstimates(role: Role): boolean {
  return role === 'COMPANY_ADMIN' || role === 'ENGINEER';
}
// Returns true if role can submit material requests
export function canSubmitMaterialRequests(role: Role): boolean {
  return ['COMPANY_ADMIN', 'ENGINEER', 'FOREMAN', 'SUPPLY_MANAGER', 'MEMBER'].includes(role);
}
// Returns true if role can manage procurement (set supplier prices, mark delivered)
export function canManageProcurement(role: Role): boolean {
  return role === 'COMPANY_ADMIN' || role === 'SUPPLY_MANAGER';
}
// Returns true if role can submit daily field reports
export function canSubmitDailyReports(role: Role): boolean {
  return ['COMPANY_ADMIN', 'ENGINEER', 'FOREMAN', 'MEMBER'].includes(role);
}
// Returns true if role can access CRM sales module
export function canAccessSalesCRM(role: Role): boolean {
  return ['COMPANY_ADMIN', 'SALES_MANAGER', 'SALES_LEAD'].includes(role);
}
// Returns true if role can see sales revenue dashboard
export function canSeeSalesRevenue(role: Role): boolean {
  return role === 'COMPANY_ADMIN' || role === 'SALES_LEAD';
}
// Returns true if role can manage team members
export function canManageTeam(role: Role): boolean {
  return role === 'COMPANY_ADMIN';
}

export type Access = {
  role: Role;
  profile_status: 'active' | 'blocked';
  full_name: string;
  company_id: string | null;
  company_name: string | null;
  company_status: CompanyStatus | null;
  access_until: string | null;
  user_limit: number | null;
};

export type Company = {
  id: string;
  name: string;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: CompanyStatus;
  effective_status: CompanyStatus;
  access_until: string;
  user_limit: number;
  active_users: number;
  projects_count: number;
  created_at: string;
};

export type Profile = {
  id: string;
  company_id: string | null;
  role: Role;
  full_name: string;
  position: string | null;
  email: string;
  status: 'active' | 'blocked';
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  client_name: string | null;
  currency: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type EstimateVersion = {
  id: string;
  project_id: string;
  version_number: number;
  title: string;
  status: 'draft' | 'approved' | 'archived';
  approved_at: string | null;
};

export type EstimateLine = {
  id: string;
  version_id: string;
  position: number;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
};

export type MaterialRequest = {
  id: string;
  project_id: string;
  title: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number | null;
  currency: string;
  supplier: string | null;
  needed_by: string | null;
  notes: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'cancelled';
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
};

export type Expense = {
  id: string;
  project_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  created_by: string;
};

export type DailyReport = {
  id: string;
  project_id: string;
  report_date: string;
  work_done: string;
  issues: string | null;
  next_steps: string | null;
  created_by: string;
};

export type Wall = { x1: number; y1: number; x2: number; y2: number };

export type DrawingLabel = { x: number; y: number; text: string };

// ─── ИНТЕРАКТИВНЫЙ МАРКЕР СМЕТЫ НА ЧЕРТЕЖЕ ─────────────────────────────────
export type EstimateMarker = {
  id: string;
  x: number;
  y: number;
  title: string;           // Название работы/материала ("Штукатурка стен", "Стяжка пола")
  quantity: number;        // Объем работ/материала
  unit: string;            // м², пог. м, шт, комплект
  unit_price: number;      // Цена за единицу
  total_price: number;     // Итого = quantity * unit_price
  category?: 'materials' | 'labor' | 'equipment' | 'other';
  room_name?: string;      // Помещение ("Спальня", "Кухня-гостиная", "Санузел")
  status?: 'planned' | 'in_progress' | 'completed';
};

export type DrawingData = {
  walls: Wall[];
  labels: DrawingLabel[];
  markers?: EstimateMarker[];
};

export type DrawingSummary = {
  id: string;
  name: string;
  updated_at: string;
};

export type Drawing = DrawingSummary & {
  project_id: string;
  data: unknown;
};

export type DashboardData = {
  active_projects: number;
  open_tasks: number;
  pending_requests: number;
  by_currency: {
    currency: string;
    approved_budget: number;
    actual_expenses: number;
    remaining: number;
    used_percent: number | null;
  }[];
  recent_expenses: {
    id: string;
    expense_date: string;
    description: string;
    amount: number;
    currency: string;
    project_name: string;
    category: string;
  }[];
  recent_reports: {
    id: string;
    report_date: string;
    work_done: string;
    project_name: string;
    author_name: string | null;
  }[];
};

// ═══════════════════════════════════════════════════════════════════════════
// SALES CRM MODULE TYPES
// ═══════════════════════════════════════════════════════════════════════════

// ─── РЕАЛИЗУЕМЫЕ ОБЪЕКТЫ / ШАХМАТКА ────────────────────────────────────────
// Тип объекта: квартира в МКД, коттедж, коммерческое помещение, участок
export type RealEstateUnitType = 'apartment' | 'commercial' | 'cottage' | 'parking' | 'storage';

// Статус квартиры/помещения в шахматке
// free      — в открытой продаже
// reserved  — забронирована (временная бронь, есть дедлайн брони)
// sold       — продана, договор подписан
// not_for_sale — не продаётся (например, технические помещения, УК)
export type UnitSaleStatus = 'free' | 'reserved' | 'sold' | 'not_for_sale';

export type RealEstateUnit = {
  id: string;
  project_id: string;
  company_id: string;

  // Идентификация
  section: string;          // Секция / блок (например «Секция 1», «Блок А»)
  floor: number;            // Этаж
  unit_number: string;      // Номер помещения (квартиры): «14», «47Б»
  unit_type: RealEstateUnitType;

  // Геометрия (заполняется из чертежа или вручную)
  total_area_m2: number;    // Общая площадь, м²
  living_area_m2: number | null;  // Жилая площадь (для квартир)
  rooms: number | null;     // Кол-во комнат (1, 2, 3, студия = 0)
  floor_count: number | null; // Для коттеджей — кол-во этажей

  // Ценообразование
  price_per_m2: number;     // Цена за м² (база). Формулы можно корректировать
  total_price: number;      // Полная стоимость = total_area_m2 × price_per_m2
                            // TODO: будет пересчитываться с учётом этажа, видовых характеристик, акций
  currency: string;         // 'RUB' | 'USD' | 'EUR'

  // Статус продажи
  status: UnitSaleStatus;
  reserved_until: string | null;  // Дедлайн брони (ISO дата)
  reserved_by_lead_id: string | null; // ID лида из воронки

  // Характеристики для КП
  features: string[];       // ['Угловая', 'Панорамный вид', 'Юг', 'Мастер-спальня']
  description: string | null;

  // Связь с чертежом
  drawing_id: string | null;      // Если есть чертёж планировки этой квартиры

  created_at: string;
  updated_at: string;
};

// ─── ВОРОНКА ПРОДАЖ / ЛИДЫ ──────────────────────────────────────────────────
// Стадии воронки продаж (можно настраивать в будущем)
// Логика: перемещение по стадиям — только вперёд (или в архив)
export type DealStage =
  | 'new'           // Новый входящий лид (звонок, заявка, реклама)
  | 'qualification' // Квалификация: выясняем бюджет, потребность, срок
  | 'showing'       // Показ объекта / презентация онлайн
  | 'negotiation'   // Обсуждение условий, скидки, ипотека/рассрочка
  | 'reservation'   // Бронь оформлена (деньги или без, по договору)
  | 'contract'      // Подписан ДДУ / ДКП / предварительный договор
  | 'payment'       // Полная оплата получена, объект передан
  | 'lost';         // Сделка проиграна (отказ, конкурент, нет бюджета)

// Способ покупки
export type PurchaseMethod =
  | 'full_payment'      // 100% оплата
  | 'mortgage'          // Ипотека (банк)
  | 'installment'       // Рассрочка от застройщика
  | 'trade_in'          // Трейд-ин (зачёт старого жилья)
  | 'maternity_capital' // Материнский капитал
  | 'subsidy';          // Субсидия / льготная программа

export type Lead = {
  id: string;
  company_id: string;
  project_id: string;       // К какому проекту/объекту привязан лид

  // Контактные данные клиента
  full_name: string;
  phone: string;
  email: string | null;
  source: string | null;    // Откуда пришёл: 'avito', 'cian', 'instagram', 'referral', 'walk_in'

  // Воронка
  stage: DealStage;
  assigned_to: string | null;     // ID менеджера (profile.id)
  interested_unit_id: string | null; // ID квартиры из шахматки

  // Финансовые параметры сделки
  budget_min: number | null;      // Минимальный бюджет клиента
  budget_max: number | null;      // Максимальный бюджет клиента
  purchase_method: PurchaseMethod | null;
  agreed_price: number | null;    // Согласованная итоговая цена сделки

  // История и заметки
  notes: string | null;           // Последняя заметка менеджера
  next_action: string | null;     // Запланированное следующее действие
  next_action_date: string | null; // Дата следующего касания

  created_at: string;
  updated_at: string;
};

// ─── ИСТОРИЯ АКТИВНОСТЕЙ (лог звонков, встреч, сообщений) ───────────────────
export type ActivityType = 'call' | 'meeting' | 'message' | 'email' | 'note' | 'stage_change';

export type LeadActivity = {
  id: string;
  lead_id: string;
  company_id: string;
  type: ActivityType;
  description: string;          // Что произошло: «Позвонил, обсудили ипотеку ВТБ»
  outcome: string | null;       // Результат: «Клиент думает, перезвонит в среду»
  created_by: string;           // ID менеджера
  created_at: string;
};

// ─── ГРАФИК ПЛАТЕЖЕЙ (рассрочка от застройщика) ─────────────────────────────
export type PaymentScheduleStatus = 'pending' | 'paid' | 'overdue';

export type PaymentScheduleItem = {
  id: string;
  lead_id: string;
  company_id: string;
  payment_number: number;       // Номер транша (1, 2, 3...)
  due_date: string;             // Плановая дата платежа
  amount: number;               // Сумма транша
  currency: string;
  description: string;          // «Первоначальный взнос 30%», «Второй транш»
  status: PaymentScheduleStatus;
  paid_at: string | null;       // Фактическая дата оплаты
  paid_amount: number | null;   // Фактически уплаченная сумма (может отличаться)
};

// ─── КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ ───────────────────────────────────────────────
export type CommercialProposal = {
  id: string;
  lead_id: string;
  unit_id: string;
  company_id: string;
  created_by: string;
  // Snapshot данных на момент создания КП (цены могут меняться)
  unit_number: string;
  section: string;
  floor: number;
  total_area_m2: number;
  rooms: number | null;
  price_per_m2: number;
  total_price: number;
  currency: string;
  features: string[];
  // КП-специфичное
  valid_until: string;          // Срок действия КП (обычно 3–7 дней)
  discount_amount: number | null;
  final_price: number;
  notes: string | null;         // Комментарий менеджера в КП
  created_at: string;
};

// ─── СВОДНАЯ АНАЛИТИКА ПРОДАЖ (для дашборда директора и SALES_LEAD) ─────────
export type SalesDashboardData = {
  project_id: string;
  project_name: string;
  total_units: number;
  free_units: number;
  reserved_units: number;
  sold_units: number;
  // Финансовые итоги
  total_revenue_plan: number;   // Плановая выручка (все юниты × цены)
  total_revenue_fact: number;   // Фактическая выручка (только sold × agreed_price)
  avg_price_per_m2: number;     // Средняя цена м² по проданным
  // Воронка лидов
  total_leads: number;
  leads_by_stage: Record<DealStage, number>;
  conversion_rate: number;      // % лидов, дошедших до оплаты — TODO: уточнить формулу
  // Менеджеры
  top_managers: {
    manager_id: string;
    manager_name: string;
    deals_won: number;
    revenue: number;
  }[];
};

// ─── НАСТРОЙКИ ШАХМАТКИ (конфигурация объекта под продажи) ──────────────────
export type ChessboardConfig = {
  project_id: string;
  sections: string[];           // ['Секция 1', 'Секция 2', 'Блок А']
  floors_count: number;         // Кол-во этажей в здании
  base_price_per_m2: number;    // Базовая цена м² для авторасчёта
  currency: string;
  // Коэффициенты этажности (TODO: корректировать формулы)
  // Правило: цена м² = base_price × floor_coefficient[floor]
  // Временные дефолтные значения (пока плоские)
  floor_coefficients: Record<number, number>; // { 1: 0.95, 2: 1.0, 3: 1.02, ... }
};
