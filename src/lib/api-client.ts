import type { Stats } from "./stats";
import type { Knife, Owner, SharpeningSession } from "./storage/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listKnives: () => request<{ knives: Knife[] }>("/api/knives").then((r) => r.knives),
  getKnife: (id: string) => request<{ knife: Knife }>(`/api/knives/${id}`).then((r) => r.knife),
  createKnife: (body: Partial<Knife>) =>
    request<{ knife: Knife }>("/api/knives", { method: "POST", body: JSON.stringify(body) }).then(
      (r) => r.knife,
    ),
  updateKnife: (id: string, body: Partial<Knife>) =>
    request<{ knife: Knife }>(`/api/knives/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.knife),
  deleteKnife: (id: string) => request<void>(`/api/knives/${id}`, { method: "DELETE" }),
  addSession: (id: string, body: SharpeningSession) =>
    request<{ knife: Knife }>(`/api/knives/${id}/sessions`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.knife),
  imageUrl: (knifeId: string, filename: string) =>
    `/api/knives/${encodeURIComponent(knifeId)}/images/${encodeURIComponent(filename)}`,
  deleteImage: (knifeId: string, filename: string) =>
    request<{ knife: Knife }>(
      `/api/knives/${knifeId}/images/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    ).then((r) => r.knife),

  listOwners: () => request<{ owners: Owner[] }>("/api/owners").then((r) => r.owners),
  getOwner: (id: string) => request<{ owner: Owner }>(`/api/owners/${id}`).then((r) => r.owner),
  createOwner: (body: Partial<Owner>) =>
    request<{ owner: Owner }>("/api/owners", { method: "POST", body: JSON.stringify(body) }).then(
      (r) => r.owner,
    ),
  updateOwner: (id: string, body: Partial<Owner>) =>
    request<{ owner: Owner }>(`/api/owners/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.owner),
  deleteOwner: (id: string) => request<void>(`/api/owners/${id}`, { method: "DELETE" }),

  getStats: () => request<Stats>("/api/stats"),
};
