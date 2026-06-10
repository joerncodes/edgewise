import type { Diary } from "./diary";
import type { Facets } from "./facets";
import type { Janitor } from "./janitor";
import type { Stats } from "./stats";
import type { Knife, Owner, SharpeningSession, Steel, Stone } from "./storage/types";

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
  imageUrl: (knifeId: string, filename: string, size?: "thumb") =>
    `/api/knives/${encodeURIComponent(knifeId)}/images/${encodeURIComponent(filename)}${
      size === "thumb" ? "?size=thumb" : ""
    }`,
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

  listSteels: () => request<{ steels: Steel[] }>("/api/steels").then((r) => r.steels),
  getSteel: (id: string) => request<{ steel: Steel }>(`/api/steels/${id}`).then((r) => r.steel),
  createSteel: (body: Partial<Steel>) =>
    request<{ steel: Steel }>("/api/steels", { method: "POST", body: JSON.stringify(body) }).then(
      (r) => r.steel,
    ),
  updateSteel: (id: string, body: Partial<Steel>) =>
    request<{ steel: Steel }>(`/api/steels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.steel),
  deleteSteel: (id: string) => request<void>(`/api/steels/${id}`, { method: "DELETE" }),

  listStones: () => request<{ stones: Stone[] }>("/api/stones").then((r) => r.stones),
  getStone: (id: string) => request<{ stone: Stone }>(`/api/stones/${id}`).then((r) => r.stone),
  createStone: (body: Partial<Stone>) =>
    request<{ stone: Stone }>("/api/stones", { method: "POST", body: JSON.stringify(body) }).then(
      (r) => r.stone,
    ),
  updateStone: (id: string, body: Partial<Stone>) =>
    request<{ stone: Stone }>(`/api/stones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.stone),
  deleteStone: (id: string) => request<void>(`/api/stones/${id}`, { method: "DELETE" }),
  stoneImageUrl: (stoneId: string, filename: string, size?: "thumb") =>
    `/api/stones/${encodeURIComponent(stoneId)}/images/${encodeURIComponent(filename)}${
      size === "thumb" ? "?size=thumb" : ""
    }`,
  deleteStoneImage: (stoneId: string, filename: string) =>
    request<{ stone: Stone }>(
      `/api/stones/${stoneId}/images/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    ).then((r) => r.stone),

  getStats: () => request<Stats>("/api/stats"),
  getDiary: () => request<Diary>("/api/diary"),
  getJanitor: () => request<Janitor>("/api/janitor"),
  getFacets: () => request<Facets>("/api/facets"),

  reorderBacklog: (ids: string[]) =>
    request<{ updated: number }>("/api/backlog/reorder", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};
