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

/** A user-defined nutrient (name + unit). Stored in AppSettings, not hardcoded. */
export interface CustomNutrient {
  /** Stable ID — used as the key in enabledCustomNutrients and FoodEntry.customFields. */
  id: string;
  name: string;
  unit: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  mealType?: MealType;
  // Built-in optional nutrients
  carbs?: number; fat?: number; satFat?: number; sugar?: number;
  sodium?: number; potassium?: number; calcium?: number; iron?: number;
  vitD?: number; vitB12?: number; zinc?: number; magnesium?: number;
  cholesterol?: number; omega3?: number;
  // User-defined custom nutrients — keyed by CustomNutrient.id
  customFields?: Record<string, number>;
}

export interface FoodPreset {
  name: string;
  category: "Protein" | "Carbs" | "Dairy/Eggs" | "Fruits & Veggies" | "Meals";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const COMMON_FOOD_PRESETS: FoodPreset[] = [
  { name: "1 Scoop Whey Protein", category: "Protein", calories: 120, protein: 24, carbs: 2, fat: 1.5, fiber: 0 },
  { name: "2 Whole Boiled Eggs", category: "Dairy/Eggs", calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0 },
  { name: "Chicken Breast (150g cooked)", category: "Protein", calories: 240, protein: 46, carbs: 0, fat: 5, fiber: 0 },
  { name: "Oatmeal Bowl (50g oats)", category: "Carbs", calories: 190, protein: 7, carbs: 34, fat: 3.5, fiber: 5 },
  { name: "Paneer / Cottage Cheese (100g)", category: "Protein", calories: 265, protein: 18, carbs: 3, fat: 20, fiber: 0 },
  { name: "Cooked White Rice (1 cup/150g)", category: "Carbs", calories: 195, protein: 4, carbs: 44, fat: 0.4, fiber: 1 },
  { name: "Chapati / Whole Wheat Roti (1 pc)", category: "Carbs", calories: 85, protein: 3, carbs: 15, fat: 1.5, fiber: 2 },
  { name: "Cooked Dal / Lentils (1 bowl/200g)", category: "Meals", calories: 180, protein: 9, carbs: 28, fat: 3, fiber: 6 },
  { name: "Banana (1 medium)", category: "Fruits & Veggies", calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3 },
  { name: "Apple (1 medium)", category: "Fruits & Veggies", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { name: "Greek Yogurt (150g)", category: "Dairy/Eggs", calories: 110, protein: 15, carbs: 6, fat: 2.5, fiber: 0 },
  { name: "Almonds (15 pcs / 20g)", category: "Protein", calories: 120, protein: 4.2, carbs: 4, fat: 10, fiber: 2.5 },
  { name: "Peanut Butter (1 tbsp / 16g)", category: "Protein", calories: 95, protein: 4, carbs: 3, fat: 8, fiber: 1 },
  { name: "Whole Milk (1 glass / 250ml)", category: "Dairy/Eggs", calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0 },
  { name: "Green Salad Bowl", category: "Fruits & Veggies", calories: 35, protein: 1.5, carbs: 7, fat: 0.2, fiber: 3 },
];

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

/** NEW — Sleep tracking. One entry per night, keyed by the date you woke up. */
export interface SleepLog {
  date: string;          // ISO yyyy-mm-dd — the day you woke up
  bedTime?: string;      // "23:30" (24h, local time)
  wakeTime?: string;     // "07:00"
  durationHours?: number; // auto-computed from bedTime/wakeTime when both are set
  quality: number;       // 1 (terrible) – 5 (great)
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
  /** User-defined custom nutrients (the definitions list). */
  customNutrients: CustomNutrient[];
  /** Per-custom-nutrient enable/disable toggle — keyed by CustomNutrient.id. */
  enabledCustomNutrients: Record<string, boolean>;
  ollamaUrl: string;
}