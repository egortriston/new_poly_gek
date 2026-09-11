export type SessionUser = { id: string; username: string; role: 'admin' | 'rop' };
export type Session = { user: SessionUser | null; csrfToken: string };
let csrfToken = '';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/v1' + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal: controller.signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && result?.error?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('session-expired'));
      throw new ApiError(response.status, result?.error?.code ?? 'SERVER_ERROR', result?.error?.message ?? 'Сервер временно недоступен. Повторите попытку.');
    }
    if (!result || !('data' in result)) throw new Error('Сервер вернул некорректный ответ.');
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Нет ответа от сервера. Проверьте соединение и повторите попытку.');
  } finally { clearTimeout(timer); }
}
export async function readSession(): Promise<Session> {
  const session = await api<Session>('/auth/session'); csrfToken = session.csrfToken; return session;
}
export async function signIn(username: string, password: string): Promise<Session> {
  await readSession();
  const session = await api<Session>('/auth/login', { username, password }); csrfToken = session.csrfToken; return session;
}
export async function signOut(): Promise<void> { await api('/auth/logout', {}); csrfToken = ''; }
export function canAccessPath(user: SessionUser | null, path: string): boolean {
  return user?.role === 'admin' || !/^\/oop\/data\/(directions|general)(\/|$)/.test(path);
}
