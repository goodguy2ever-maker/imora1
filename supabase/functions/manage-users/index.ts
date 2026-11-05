import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COMPANY_STATUSES = ["trial", "active", "suspended", "expired"];
const MEMBER_ROLES = [
  "COMPANY_ADMIN",
  "ENGINEER",
  "FOREMAN",
  "SUPPLY_MANAGER",
  "SALES_MANAGER",
  "SALES_LEAD",
  "MEMBER",
];
const MEMBER_STATUSES = ["active", "blocked"];

class ActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown, field: string, min: number, max: number): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min || s.length > max) {
    throw new ActionError(`Проверьте поле «${field}»`);
  }
  return s;
}

function optionalText(value: unknown, max: number): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > max) throw new ActionError("Слишком длинное значение");
  return s || null;
}

function email(value: unknown): string {
  const s = text(value, "Email", 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ActionError("Укажите корректный email");
  return s;
}

function password(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 72) {
    throw new ActionError("Пароль должен содержать от 8 до 72 символов");
  }
  return value;
}

function isoDate(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ActionError("Укажите дату окончания доступа");
  }
  return new Date(value).toISOString();
}

function userLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 500) {
    throw new ActionError("Лимит пользователей должен быть от 1 до 500");
  }
  return n;
}

async function writeAudit(
  service: SupabaseClient,
  actorId: string,
  companyId: string | null,
  action: string,
  targetId: string,
  details: Record<string, unknown>,
) {
  const { error } = await service.from("audit_logs").insert({
    actor_id: actorId,
    company_id: companyId,
    action,
    target_type: "user",
    target_id: targetId,
    details,
  });
  if (error) throw new Error(`audit: ${error.message}`);
}

async function assertCompanyOpen(service: SupabaseClient, companyId: string) {
  const { data, error } = await service
    .from("companies")
    .select("id, status, access_until, user_limit")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError("Компания не найдена", 404);
  const expired = new Date(data.access_until).getTime() <= Date.now();
  if (!["trial", "active"].includes(data.status) || expired) {
    throw new ActionError("Доступ компании приостановлен или истёк. Изменения недоступны");
  }
  return data;
}

async function countActiveUsers(service: SupabaseClient, companyId: string): Promise<number> {
  const { count, error } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

function mapAuthError(message: string): string {
  if (/already|registered|exists/i.test(message)) {
    return "Пользователь с таким email уже существует";
  }
  return "Не удалось создать учётную запись. Проверьте данные и попробуйте снова";
}

async function createCompany(service: SupabaseClient, callerId: string, body: Record<string, unknown>) {
  const requestId = body.demo_request_id == null ? null : text(body.demo_request_id, "Заявка", 36, 36);
  if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new ActionError("Некорректный идентификатор заявки");
  }
  const name = text(body.name, "Название компании", 2, 160);
  const status = String(body.status ?? "");
  if (!COMPANY_STATUSES.includes(status)) throw new ActionError("Неизвестный статус компании");
  const adminEmail = email(body.admin_email);
  const adminPassword = password(body.admin_password);
  const adminName = text(body.admin_name, "Имя администратора", 2, 120);
  const adminPosition = optionalText(body.admin_position, 120);
  const city = optionalText(body.city, 120);
  const contactEmail = optionalText(body.contact_email, 254);
  const contactPhone = optionalText(body.contact_phone, 40);
  const accessUntil = isoDate(body.access_until);
  const limit = userLimit(body.user_limit);

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new ActionError(mapAuthError(createErr?.message ?? ""));
  }
  const newUserId = created.user.id;

  const { data: companyId, error: rpcErr } = await service.rpc(requestId ? "create_company_from_demo_request" : "create_company_with_admin", {
    ...(requestId ? { p_request_id: requestId } : {}),
    p_actor: callerId,
    p_name: name,
    p_city: city,
    p_contact_email: contactEmail,
    p_contact_phone: contactPhone,
    p_status: status,
    p_access_until: accessUntil,
    p_user_limit: limit,
    p_admin_id: newUserId,
    p_admin_email: adminEmail,
    p_admin_name: adminName,
    p_admin_position: adminPosition,
  });
  if (rpcErr) {
    await service.auth.admin.deleteUser(newUserId);
    throw new ActionError(rpcErr.message.includes("Недостаточно") ? rpcErr.message : "Не удалось создать компанию", 400);
  }
  return { company_id: companyId };
}

async function createTeamMember(service: SupabaseClient, caller: CallerProfile, body: Record<string, unknown>) {
  const company = await assertCompanyOpen(service, caller.company_id);
  const active = await countActiveUsers(service, caller.company_id);
  if (active >= company.user_limit) {
    throw new ActionError(
      `Достигнут лимит активных пользователей (${company.user_limit}). Обратитесь к платформенному администратору`,
    );
  }
  const memberEmail = email(body.email);
  const memberPassword = password(body.password);
  const fullName = text(body.full_name, "Имя", 2, 120);
  const role = String(body.role ?? "MEMBER");
  if (!MEMBER_ROLES.includes(role)) throw new ActionError("Неизвестная роль");

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: memberEmail,
    password: memberPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) throw new ActionError(mapAuthError(createErr?.message ?? ""));

  const { error: profileErr } = await service.from("profiles").insert({
    id: created.user.id,
    company_id: caller.company_id,
    role,
    full_name: fullName,
    position: optionalText(body.position, 120),
    email: memberEmail,
    status: "active",
  });
  if (profileErr) {
    await service.auth.admin.deleteUser(created.user.id);
    throw new ActionError("Не удалось добавить пользователя");
  }
  await writeAudit(service, caller.id, caller.company_id, "user.created", created.user.id, { role, email: memberEmail });
  return { user_id: created.user.id };
}

async function loadTeamMember(service: SupabaseClient, caller: CallerProfile, userId: string) {
  if (typeof userId !== "string" || !userId) throw new ActionError("Пользователь не найден", 404);
  if (userId === caller.id) throw new ActionError("Нельзя изменить собственную роль или статус");
  const { data, error } = await service
    .from("profiles")
    .select("id, company_id, role, status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.company_id !== caller.company_id || data.role === "SUPER_ADMIN") {
    throw new ActionError("Пользователь не найден", 404);
  }
  return data;
}

async function updateTeamMember(service: SupabaseClient, caller: CallerProfile, body: Record<string, unknown>) {
  const company = await assertCompanyOpen(service, caller.company_id);
  const target = await loadTeamMember(service, caller, String(body.user_id ?? ""));
  const patch: Record<string, string> = {};
  if (body.role !== undefined) {
    const role = String(body.role);
    if (!MEMBER_ROLES.includes(role)) throw new ActionError("Неизвестная роль");
    patch.role = role;
  }
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!MEMBER_STATUSES.includes(status)) throw new ActionError("Неизвестный статус");
    if (status === "active" && target.status !== "active") {
      const active = await countActiveUsers(service, caller.company_id);
      if (active >= company.user_limit) {
        throw new ActionError(`Достигнут лимит активных пользователей (${company.user_limit})`);
      }
    }
    patch.status = status;
  }
  if (Object.keys(patch).length === 0) throw new ActionError("Нет изменений");

  const { error } = await service.from("profiles").update(patch).eq("id", target.id);
  if (error) throw new ActionError("Не удалось сохранить изменения");
  await writeAudit(service, caller.id, caller.company_id, "user.updated", target.id, patch);
  return { ok: true };
}

async function resetTeamPassword(service: SupabaseClient, caller: CallerProfile, body: Record<string, unknown>) {
  await assertCompanyOpen(service, caller.company_id);
  const target = await loadTeamMember(service, caller, String(body.user_id ?? ""));
  const newPassword = password(body.password);
  const { error } = await service.auth.admin.updateUserById(target.id, { password: newPassword });
  if (error) throw new ActionError("Не удалось сменить пароль");
  await writeAudit(service, caller.id, caller.company_id, "user.password_reset", target.id, {});
  return { ok: true };
}

type CallerProfile = {
  id: string;
  role: string;
  status: string;
  company_id: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Требуется вход в систему" }, 401);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userErr } = await service.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Сессия недействительна. Войдите снова" }, 401);

    const { data: profile, error: profileErr } = await service
      .from("profiles")
      .select("id, role, status, company_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile || profile.status !== "active") return json({ error: "Доступ запрещён" }, 403);
    const caller = profile as CallerProfile;
    // Validate assurance through the authenticated Data API, never a client flag.
    if (caller.role === "SUPER_ADMIN") {
      const scoped = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: assurance, error: assuranceError } = await scoped.rpc("admin_mfa_verified");
      if (assuranceError || assurance !== true) {
        return json({ error: "Подтвердите вход вторым фактором" }, 403);
      }
    }


    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action;

    if (action === "create_company") {
      if (caller.role !== "SUPER_ADMIN") return json({ error: "Недостаточно прав" }, 403);
      return json(await createCompany(service, caller.id, body!));
    }

    if (caller.role !== "COMPANY_ADMIN" || !caller.company_id) {
      return json({ error: "Недостаточно прав" }, 403);
    }

    if (action === "create_team_member") {
      return json(await createTeamMember(service, caller, body!));
    }
    if (action === "update_team_member") {
      return json(await updateTeamMember(service, caller, body!));
    }
    if (action === "reset_team_password") {
      return json(await resetTeamPassword(service, caller, body!));
    }
    return json({ error: "Неизвестное действие" }, 400);
  } catch (err) {
    if (err instanceof ActionError) return json({ error: err.message }, err.status);
    console.error("manage-users failed", err);
    return json({ error: "Внутренняя ошибка сервера. Попробуйте позже" }, 500);
  }
});
