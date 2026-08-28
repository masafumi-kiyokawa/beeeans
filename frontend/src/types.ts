export interface PourStep {
  id: string;
  recipe_id: string;
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
  id: string;
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
  id: string;
  recipe_id: string;
  brewed_at: string;
  rating: number;
  notes: string | null;
  created_at: string;
}

export interface BrewLogWithRecipeName extends BrewLog {
  recipe_name: string;
}

export interface BrewLogInput {
  recipe_id: string;
  brewed_at: string;
  rating: number;
  notes?: string | null;
}

export interface UserOut {
  id: string;
  email: string;
  createdAt: Date;
}
