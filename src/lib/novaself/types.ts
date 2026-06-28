export type OptionalNutrient =
  | "carbs" | "fat" | "satFat" | "sugar" | "sodium" | "potassium"
  | "calcium" | "iron" | "vitD" | "vitB12" | "zinc" | "magnesium"
  | "cholesterol" | "omega3";

export const OPTIONAL_NUTRIENTS: { key: OptionalNutrient; label: string; unit: string }[] = [
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "satFat", label: "Saturated Fat", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "potassium", label: "Potassium", unit: "mg" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "iron", label: "Iron", unit: "mg" },
  { key: "vitD", label: "Vitamin D", unit: "µg" },
  { key: "vitB12", label: "Vitamin B12", unit: "µg" },
  { key: "zinc", label: "Zinc", unit: "mg" },
  { key: "magnesium", label: "Magnesium", unit: "mg" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "omega3", label: "Omega-3", unit: "g" },
];

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs?: number; fat?: number; satFat?: number; sugar?: number;
  sodium?: number; potassium?: number; calcium?: number; iron?: number;
  vitD?: number; vitB12?: number; zinc?: number; magnesium?: number;
  cholesterol?: number; omega3?: number;
}

export interface WaterEntry { id: string; ml: number }

export interface WorkoutEntry {
  id: string;
  type: string;
  customMet?: number;
  durationMin: number;
  caloriesBurned: number;
  notes?: string;
}

export interface DayLog {
  date: string; // ISO yyyy-mm-dd
  foods: FoodEntry[];
  water: WaterEntry[];
  workouts: WorkoutEntry[];
  weightKg?: number;
}

export interface DietItem { id: string; meal: string; food: string; calories: number; protein: number; fiber: number }

export interface DietPhase { id: string; name: string; items: DietItem[] }

export interface MessItem { id: string; day: string; meal: string; item: string }

export interface Exercise { id: string; name: string; sets?: number; reps?: number; durationMin?: number; notes?: string }
export interface WorkoutDay { id: string; name: string; exercises: Exercise[] }
export interface WorkoutPhase { id: string; name: string; days: WorkoutDay[] }

export interface SkinLog {
  date: string;
  faceWash: boolean; moisturizer: boolean; sunscreen: boolean;
  hairOil: boolean; scalpMassage: boolean;
  oiliness: number; hairFall: number;
  pimples: number; darkPatchChange: boolean;
  notes?: string;
}

export interface Supplement { id: string; name: string; unit: string; stock: number; defaultDose: number }
export interface SupplementIntake { id: string; supplementId: string; date: string; amount: number }

export interface Book { id: string; title: string; author: string; totalPages: number; pagesRead: number; completed: boolean }
export interface ReadingSession { id: string; bookId: string; date: string; pages: number; minutes: number; notes?: string }

export interface ChatMessage { id: string; role: "user" | "assistant"; content: string; ts: number }

export interface AppSettings {
  theme: "dark" | "light";
  enabledNutrients: Record<OptionalNutrient, boolean>;
  // googleClientId removed — it's now GOOGLE_CLIENT_ID constant in googleAuth.ts
  ollamaUrl: string;
}