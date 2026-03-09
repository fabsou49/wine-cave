const BASE = "/api";

export interface Section {
  id: number;
  name: string;
  rows: number;
  cols: number;
  photo_path: string | null;
  created_at: string;
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
  wine_type: string | null;
  peak_year_start: number | null;
  peak_year_end: number | null;
  best_pairing: string | null;
  analysis_done: boolean;
  slot_id: number | null;
  created_at: string;
}

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// Sections
export const getSections = () => request<Section[]>(`${BASE}/sections`);
export const createSection = (data: { name: string; rows: number; cols: number }) =>
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
export const analyzeBottle = (id: number) =>
  request<Bottle>(`${BASE}/bottles/${id}/analyze`, { method: "POST" });
export const placeBottle = (bottleId: number, slotId: number) =>
  request<Bottle>(`${BASE}/bottles/${bottleId}/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slot_id: slotId }),
  });
export const removeBottleFromSlot = (bottleId: number) =>
  request<Bottle>(`${BASE}/bottles/${bottleId}/place`, { method: "DELETE" });

// Settings
export interface AppSettings {
  ollama_host: string;
  has_env_host: boolean;
}
export const getSettings = () => request<AppSettings>(`${BASE}/settings`);
export const saveSettings = (ollama_host: string) =>
  request<AppSettings>(`${BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ollama_host }),
  });
