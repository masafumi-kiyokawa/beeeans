import type {
  BrewLog,
  BrewLogInput,
  BrewLogWithRecipeName,
  PourStep,
  PourStepCreate,
  PourStepUpdate,
  Recipe,
  RecipeDetail,
  RecipeInput,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${res.status} ${body}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

// Recipes
export const listRecipes = () => request<Recipe[]>('/recipes')
export const getRecipe = (id: number) => request<RecipeDetail>(`/recipes/${id}`)
export const createRecipe = (data: RecipeInput & { pour_steps?: PourStepCreate[] }) =>
  request<RecipeDetail>('/recipes', { method: 'POST', body: JSON.stringify(data) })
export const updateRecipe = (id: number, data: Partial<RecipeInput>) =>
  request<RecipeDetail>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteRecipe = (id: number) =>
  request<void>(`/recipes/${id}`, { method: 'DELETE' })

// Pour steps
export const listPourSteps = (recipeId: number) =>
  request<PourStep[]>(`/recipes/${recipeId}/pour-steps`)
export const createPourStep = (recipeId: number, data: PourStepCreate) =>
  request<PourStep>(`/recipes/${recipeId}/pour-steps`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
export const updatePourStep = (recipeId: number, stepId: number, data: PourStepUpdate) =>
  request<PourStep>(`/recipes/${recipeId}/pour-steps/${stepId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
export const deletePourStep = (recipeId: number, stepId: number) =>
  request<void>(`/recipes/${recipeId}/pour-steps/${stepId}`, { method: 'DELETE' })

// Brew logs
export const listBrewLogs = (recipeId?: number) =>
  request<BrewLogWithRecipeName[]>(
    `/brew-logs${recipeId !== undefined ? `?recipe_id=${recipeId}` : ''}`,
  )
export const getBrewLog = (id: number) => request<BrewLog>(`/brew-logs/${id}`)
export const createBrewLog = (data: BrewLogInput) =>
  request<BrewLog>('/brew-logs', { method: 'POST', body: JSON.stringify(data) })
export const updateBrewLog = (id: number, data: Partial<BrewLogInput>) =>
  request<BrewLog>(`/brew-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteBrewLog = (id: number) =>
  request<void>(`/brew-logs/${id}`, { method: 'DELETE' })
