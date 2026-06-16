import type { Diary } from "./diary";
import type { Facets } from "./facets";
import type { Janitor } from "./janitor";
import type { Stats } from "./stats";
import type { Abrasive, Handle, Knife, Owner, SharpeningSession, Steel } from "./storage/types";

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
  editSession: (
    id: string,
    date: string,
    body: Partial<Omit<SharpeningSession, "date">>,
  ) =>
    request<{ knife: Knife }>(
      `/api/knives/${id}/sessions/${encodeURIComponent(date)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ).then((r) => r.knife),
  deleteSession: (id: string, date: string) =>
    request<{ knife: Knife }>(
      `/api/knives/${id}/sessions/${encodeURIComponent(date)}`,
      { method: "DELETE" },
    ).then((r) => r.knife),
  imageUrl: (knifeId: string, filename: string, size?: "thumb") =>
    `/api/knives/${encodeURIComponent(knifeId)}/images/${encodeURIComponent(filename)}${
      size === "thumb" ? "?size=thumb" : ""
    }`,
  deleteImage: (knifeId: string, filename: string) =>
    request<{ knife: Knife }>(
      `/api/knives/${knifeId}/images/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    ).then((r) => r.knife),
  // Multipart bypasses the JSON `request` helper — the browser sets
  // its own Content-Type boundary, so we don't.
  uploadKnifeImage: async (knifeId: string, file: File, caption?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (caption) fd.append("caption", caption);
    const res = await fetch(`/api/knives/${knifeId}/images`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
    }
    return (await res.json()).knife as Knife;
  },

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

  listHandles: () =>
    request<{ handles: Handle[] }>("/api/handles").then((r) => r.handles),
  getHandle: (id: string) =>
    request<{ handle: Handle }>(`/api/handles/${id}`).then((r) => r.handle),
  createHandle: (body: Partial<Handle>) =>
    request<{ handle: Handle }>("/api/handles", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.handle),
  updateHandle: (id: string, body: Partial<Handle>) =>
    request<{ handle: Handle }>(`/api/handles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.handle),
  deleteHandle: (id: string) => request<void>(`/api/handles/${id}`, { method: "DELETE" }),

  listAbrasives: () =>
    request<{ abrasives: Abrasive[] }>("/api/abrasives").then((r) => r.abrasives),
  getAbrasive: (id: string) =>
    request<{ abrasive: Abrasive }>(`/api/abrasives/${id}`).then((r) => r.abrasive),
  createAbrasive: (body: Partial<Abrasive>) =>
    request<{ abrasive: Abrasive }>("/api/abrasives", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.abrasive),
  updateAbrasive: (id: string, body: Partial<Abrasive>) =>
    request<{ abrasive: Abrasive }>(`/api/abrasives/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((r) => r.abrasive),
  deleteAbrasive: (id: string) =>
    request<void>(`/api/abrasives/${id}`, { method: "DELETE" }),
  abrasiveImageUrl: (abrasiveId: string, filename: string, size?: "thumb") =>
    `/api/abrasives/${encodeURIComponent(abrasiveId)}/images/${encodeURIComponent(filename)}${
      size === "thumb" ? "?size=thumb" : ""
    }`,
  deleteAbrasiveImage: (abrasiveId: string, filename: string) =>
    request<{ abrasive: Abrasive }>(
      `/api/abrasives/${abrasiveId}/images/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    ).then((r) => r.abrasive),
  uploadAbrasiveImage: async (
    abrasiveId: string,
    file: File,
    caption?: string,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (caption) fd.append("caption", caption);
    const res = await fetch(`/api/abrasives/${abrasiveId}/images`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
    }
    return (await res.json()).abrasive as Abrasive;
  },

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
