export interface PourStep {
  id: number;
  recipe_id: number;
  step_order: number;
  target_time_sec: number;
  cumulative_water_ml: number;
  notes: string | null;
}

export interface PourStepCreate {
  step_order?: number | null;
  target_time_sec: number;
  cumulative_water_ml: number;
  notes?: string | null;
}

export interface PourStepUpdate {
  step_order?: number;
  target_time_sec?: number;
  cumulative_water_ml?: number;
  notes?: string | null;
}

export interface Recipe {
  id: number;
  name: string;
  bean_origin: string | null;
  dose_g: number;
  water_ml: number;
  water_temp_c: number;
  grind_size: string | null;
  total_time_sec: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeDetail extends Recipe {
  pour_steps: PourStep[];
}

export interface RecipeInput {
  name: string;
  bean_origin?: string | null;
  dose_g: number;
  water_ml: number;
  water_temp_c: number;
  grind_size?: string | null;
  total_time_sec?: number | null;
  notes?: string | null;
}

export interface BrewLog {
  id: number;
  recipe_id: number;
  brewed_at: string;
  rating: number;
  notes: string | null;
  created_at: string;
}

export interface BrewLogWithRecipeName extends BrewLog {
  recipe_name: string;
}

export interface BrewLogInput {
  recipe_id: number;
  brewed_at: string;
  rating: number;
  notes?: string | null;
}
