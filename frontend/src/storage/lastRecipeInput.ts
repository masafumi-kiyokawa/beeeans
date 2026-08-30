const STORAGE_KEY = "beans:last-recipe-input";

export interface LastRecipeInput {
  name: string;
  bean_id: string | null;
  dose_g: number;
  water_ml: number;
  water_temp_c: number;
  grind_size: string;
  total_time_sec: number | null;
  notes: string;
}

export function loadLastRecipeInput(): LastRecipeInput | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastRecipeInput;
  } catch {
    return null;
  }
}

export function saveLastRecipeInput(input: LastRecipeInput): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  } catch {
    // localStorage unavailable (private mode, quota exceeded, etc.) — best-effort only
  }
}
