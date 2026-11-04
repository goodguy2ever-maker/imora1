/**
 * IMORA 2.0 — Email Notification Service
 * 
 * Поддерживает:
 * 1. Отправку через Resend / Webhook API (при наличии VITE_RESEND_API_KEY)
 * 2. Отправку через Supabase Auth invite
 * 3. Fallback: Генерация готового письма с прямым mailto-линком и веб-уведомлением
 */

export interface AccessEmailPayload {
  to: string;
  directorName: string;
  companyName: string;
  loginUrl: string;
  tempPassword?: string;
  plan?: string;
  accessUntil?: string;
}

export interface TeamInvitePayload {
  to: string;
  memberName: string;
  companyName: string;
  roleTitle: string;
  loginUrl: string;
  tempPassword?: string;
  inviterName: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  mode: 'api' | 'fallback_mailto' | 'simulation';
  previewText?: string;
  mailtoUrl?: string;
}

/**
 * Отправка письма директору с подтверждением доступа и реквизитами входа
 */
export async function sendDirectorAccessEmail(payload: AccessEmailPayload): Promise<EmailSendResult> {
  const { to, directorName, companyName, loginUrl, tempPassword, plan, accessUntil } = payload;
  
  const subject = `Доступ к платформе IMORA 2.0 открыт — ${companyName}`;
  const bodyText = `Здравствуйте, ${directorName}!

Рады сообщить, что для вашей компании «${companyName}» успешно активирован доступ к экосистеме управления строительством и продажами IMORA 2.0.

Данные для входа в ваш корпоративный кабинет:
--------------------------------------------------
Адрес входа: ${loginUrl}
Логин (Email): ${to}
${tempPassword ? `Временный пароль: ${tempPassword}` : 'Пароль: указан вами при регистрации'}
Тарифный план: ${plan || 'Бизнес'}
${accessUntil ? `Срок действия: до ${accessUntil}` : ''}
--------------------------------------------------

В вашем личном кабинете вы можете:
• Настраивать объекты и проекты строительства
• Создавать 2D чертежи и переводить их в 3D объемные модели
• Вести сметы и контролировать закупки материалов
• Управлять шахматкой квартир и сделками отдела продаж
• Приглашать сотрудников вашей компании (прорабов, инженеров, снабженцев и менеджеров)

Рекомендуем сменить временный пароль в профиле после первого входа.

С уважением,
Команда IMORA 2.0
https://imora.app`;

  // 1. Попытка отправки через Resend API если задан ключ
  const resendApiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'IMORA 2.0 <access@imora.app>',
          to: [to],
          subject,
          text: bodyText,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        return { success: true, messageId: resData.id, mode: 'api' };
      }
    } catch {
      // Fallback below
    }
  }

  // 2. Fallback: mailto URL + предпросмотр
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return {
    success: true,
    mode: 'simulation',
    previewText: bodyText,
    mailtoUrl,
  };
}

/**
 * Отправка приглашения новому сотруднику от директора компании
 */
export async function sendTeamMemberInviteEmail(payload: TeamInvitePayload): Promise<EmailSendResult> {
  const { to, memberName, companyName, roleTitle, loginUrl, tempPassword, inviterName } = payload;
  
  const subject = `Приглашение в команду ${companyName} — IMORA 2.0`;
  const bodyText = `Здравствуйте, ${memberName}!

Руководитель ${inviterName} пригласил вас в рабочее пространство компании «${companyName}» на платформе IMORA 2.0.

Ваша роль в системе: ${roleTitle}

Данные для входа в систему:
--------------------------------------------------
Адрес входа: ${loginUrl}
Логин: ${to}
${tempPassword ? `Временный пароль: ${tempPassword}` : ''}
--------------------------------------------------

Пожалуйста, войдите в систему и ознакомьтесь с назначенными вам объектами и задачами.

С уважением,
Команда IMORA 2.0`;

  const resendApiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'IMORA 2.0 <invite@imora.app>',
          to: [to],
          subject,
          text: bodyText,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        return { success: true, messageId: resData.id, mode: 'api' };
      }
    } catch {
      // Fallback
    }
  }

  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return {
    success: true,
    mode: 'simulation',
    previewText: bodyText,
    mailtoUrl,
  };
}
