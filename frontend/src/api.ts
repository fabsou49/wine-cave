const BASE = "/api";

export const getToken = () => localStorage.getItem("token");
export const setToken = (t: string) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Non autorisé");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export interface Section {
  id: number;
  name: string;
  rows: number;
  cols: number;
  photo_path: string | null;
  created_at: string;
  column_rows: string | null;  // legacy
  row_cols: string | null;     // JSON array e.g. "[6,5,4,6]" — slots per row
}

export interface Slot {
  id: number;
  section_id: number;
  row: number;
  col: number;
  custom_label: string | null;
}

export interface Bottle {
  id: number;
  photo_path: string | null;
  domaine: string | null;
  cepage: string | null;
  appellation: string | null;
  millesime: number | null;
  taille: string | null;
  label_verified: boolean;
  slot_id: number | null;
  created_at: string;
  obtention_detail: string | null;
  statut: "à ranger" | "en cave" | "consommé/offerte";
  commentaire_consommation: string | null;
}

// Auth
export const login = (username: string, password: string) =>
  fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then(async (res) => {
    if (!res.ok) throw new Error("Identifiants incorrects");
    return res.json() as Promise<{ access_token: string }>;
  });

// Sections
export const getSections = () => request<Section[]>(`${BASE}/sections`);
export const createSection = (data: { name: string; rows: number; cols: number; row_cols?: number[] }) =>
  request<Section>(`${BASE}/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const updateSection = (id: number, data: Partial<Section>) =>
  request<Section>(`${BASE}/sections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const deleteSection = (id: number) =>
  request<{ ok: boolean }>(`${BASE}/sections/${id}`, { method: "DELETE" });
export const uploadSectionPhoto = (id: number, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return request<Section>(`${BASE}/sections/${id}/photo`, { method: "POST", body: fd });
};
export const getSectionSlots = (id: number) =>
  request<Slot[]>(`${BASE}/sections/${id}/slots`);

// Bottles
export const getBottles = () => request<Bottle[]>(`${BASE}/bottles`);
export const getBottlesHistory = () => request<Bottle[]>(`${BASE}/bottles/history`);
export const uploadBottle = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return request<Bottle>(`${BASE}/bottles/upload`, { method: "POST", body: fd });
};
export const updateBottle = (id: number, data: Partial<Bottle>) =>
  request<Bottle>(`${BASE}/bottles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const deleteBottle = (id: number) =>
  request<{ ok: boolean }>(`${BASE}/bottles/${id}`, { method: "DELETE" });
export const placeBottle = (bottleId: number, slotId: number) =>
  request<Bottle>(`${BASE}/bottles/${bottleId}/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slot_id: slotId }),
  });
export const removeBottleFromSlot = (bottleId: number) =>
  request<Bottle>(`${BASE}/bottles/${bottleId}/place`, { method: "DELETE" });
