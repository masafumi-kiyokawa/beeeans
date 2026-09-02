import type { Bean, Recipe } from "../types";

export interface SpecItem {
  label: string;
  value: string;
}

export function recipeSpecItems(
  recipe: Pick<Recipe, "dose_g" | "water_ml" | "water_temp_c" | "grind_size" | "total_time_sec">,
  options: { includeTotalTime?: boolean } = {},
): SpecItem[] {
  const items: SpecItem[] = [
    { label: "豆の量", value: `${recipe.dose_g}g` },
    { label: "湯量", value: `${recipe.water_ml}ml` },
    { label: "湯温", value: `${recipe.water_temp_c}℃` },
  ];
  if (recipe.grind_size) {
    items.push({ label: "挽き目", value: recipe.grind_size });
  }
  if (options.includeTotalTime && recipe.total_time_sec) {
    items.push({ label: "総抽出時間", value: `${recipe.total_time_sec}秒` });
  }
  return items;
}

export function beanSpecItems(
  bean: Pick<Bean, "origin" | "roaster" | "roast_level" | "roast_date">,
): SpecItem[] {
  const items: SpecItem[] = [];
  if (bean.origin) items.push({ label: "産地", value: bean.origin });
  if (bean.roaster) items.push({ label: "焙煎者", value: bean.roaster });
  if (bean.roast_level) items.push({ label: "焙煎度", value: bean.roast_level });
  if (bean.roast_date) items.push({ label: "焙煎日", value: bean.roast_date.slice(0, 10) });
  return items;
}
