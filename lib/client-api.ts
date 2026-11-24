export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === "string" ? data.error : `Erreur ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function post<T>(url: string, body?: unknown): Promise<T> {
  return api<T>(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function patch<T>(url: string, body: unknown): Promise<T> {
  return api<T>(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function del<T>(url: string): Promise<T> {
  return api<T>(url, { method: "DELETE" });
}
