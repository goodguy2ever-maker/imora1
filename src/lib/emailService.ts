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

// Client-side draft only. Never include passwords or provider secrets in URLs.
function draft(to: string, subject: string, text: string): EmailSendResult {
  return { success: false, mode: 'fallback_mailto', previewText: text,
    mailtoUrl: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` };
}
export async function sendDirectorAccessEmail(p: AccessEmailPayload): Promise<EmailSendResult> {
  return draft(p.to, `Доступ к IMORA — ${p.companyName}`,
    `Здравствуйте, ${p.directorName}!\nДоступ для компании «${p.companyName}» открыт.\nВход: ${p.loginUrl}\nEmail: ${p.to}\nПароль получите у администратора по согласованному защищённому каналу. После входа смените пароль.`);
}
export async function sendTeamMemberInviteEmail(p: TeamInvitePayload): Promise<EmailSendResult> {
  return draft(p.to, `Приглашение в ${p.companyName} — IMORA`,
    `Здравствуйте, ${p.memberName}!\n${p.inviterName} пригласил вас в «${p.companyName}».\nРоль: ${p.roleTitle}\nВход: ${p.loginUrl}\nEmail: ${p.to}\nПароль получите у администратора по согласованному защищённому каналу.`);
}
