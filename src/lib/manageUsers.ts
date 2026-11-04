import { supabase } from '@/lib/supabase';

export async function callManageUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    let message = 'Не удалось выполнить действие. Проверьте соединение и попробуйте снова';
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') {
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch {
        // Keep the generic message when the response body is not JSON.
      }
    }
    throw new Error(message);
  }
  const payload = data as { error?: string } | null;
  if (!payload || payload.error) throw new Error(payload?.error ?? 'Неизвестная ошибка');
  return payload as T;
}
