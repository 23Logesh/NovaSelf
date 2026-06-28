import type {
  AppSettings, Book, DayLog, DietPhase, MessItem, ReadingSession,
  SkinLog, Supplement, SupplementIntake, WorkoutPhase,
} from "./types";
import type { Profile } from "./calculations";
import { caloriesBurned, isoDate, WORKOUT_METS } from "./calculations";

const uid = () => Math.random().toString(36).slice(2, 10);
const daysAgo = (n: number) => isoDate(new Date(Date.now() - n * 86400000));

export const defaultProfile: Profile = {
  name: "Logesh",
  age: 24,
  sex: "male",
  heightCm: 175,
  weightKg: 78.4,
  goalWeightKg: 70,
  startingWeightKg: 84.2,
  activity: "moderate",
  neckCm: 38,
  waistCm: 88,
  hipCm: 96,
};

export const defaultSettings: AppSettings = {
  theme: "dark",
  enabledNutrients: {
    carbs: true, fat: true, satFat: false, sugar: false, sodium: false,
    potassium: false, calcium: false, iron: false, vitD: false, vitB12: false,
    zinc: false, magnesium: false, cholesterol: false, omega3: true,
  },
  ollamaUrl: "",
};

function makeDay(date: string, weight?: number): DayLog {
  const w = 75;
  return {
    date,
    weightKg: weight,
    foods: [
      { id: uid(), name: "Oats + banana + peanut butter", calories: 420, protein: 16, fiber: 8, carbs: 58, fat: 14, omega3: 0.3 },
      { id: uid(), name: "Grilled chicken rice bowl", calories: 640, protein: 52, fiber: 6, carbs: 70, fat: 18, omega3: 0.2 },
      { id: uid(), name: "Greek yogurt + almonds", calories: 280, protein: 22, fiber: 4, carbs: 18, fat: 14, omega3: 0.5 },
      { id: uid(), name: "Dal + roti + sabzi", calories: 540, protein: 22, fiber: 12, carbs: 78, fat: 12, omega3: 0.1 },
    ],
    water: [
      { id: uid(), ml: 500 }, { id: uid(), ml: 500 },
      { id: uid(), ml: 750 }, { id: uid(), ml: 500 },
    ],
    workouts: date === daysAgo(0) || date === daysAgo(2) || date === daysAgo(4)
      ? [{ id: uid(), type: "gym", durationMin: 55, caloriesBurned: caloriesBurned(WORKOUT_METS.gym, w, 55), notes: "Push day" }]
      : date === daysAgo(1) || date === daysAgo(3)
      ? [{ id: uid(), type: "jogging", durationMin: 35, caloriesBurned: caloriesBurned(WORKOUT_METS.jogging, w, 35) }]
      : [],
  };
}

export const defaultDays: DayLog[] = Array.from({ length: 14 }, (_, i) =>
  makeDay(daysAgo(i), [78.4, 78.6, 78.9, 79.1, 79.4, 79.6, 79.9, 80.2, 80.6, 81.0, 81.4, 81.9, 82.5, 83.0][i]),
).reverse();

export const defaultDietPhases: DietPhase[] = [
  {
    id: uid(),
    name: "Phase 1 — Fat loss base",
    items: [
      { id: uid(), meal: "Breakfast", food: "Oats + banana + peanut butter + milk", calories: 450, protein: 18, fiber: 9 },
      { id: uid(), meal: "Mid-morning", food: "Whey shake + apple", calories: 240, protein: 28, fiber: 4 },
      { id: uid(), meal: "Lunch", food: "Rice + dal + sabzi + curd + salad", calories: 720, protein: 32, fiber: 14 },
      { id: uid(), meal: "Evening", food: "Greek yogurt + almonds + dates", calories: 320, protein: 22, fiber: 5 },
      { id: uid(), meal: "Dinner", food: "Roti + paneer/chicken curry + sabzi", calories: 620, protein: 38, fiber: 10 },
    ],
  },
  {
    id: uid(),
    name: "Phase 2 — Muscle gain push",
    items: [
      { id: uid(), meal: "Breakfast", food: "4 eggs + 2 toast + avocado", calories: 560, protein: 30, fiber: 6 },
      { id: uid(), meal: "Lunch", food: "Rice + chicken curry + dal + curd", calories: 820, protein: 48, fiber: 10 },
      { id: uid(), meal: "Post-workout", food: "Whey shake + banana", calories: 300, protein: 30, fiber: 3 },
      { id: uid(), meal: "Dinner", food: "Roti + paneer/chicken + sabzi + salad", calories: 680, protein: 42, fiber: 11 },
    ],
  },
];

export const defaultMess: MessItem[] = [
  { id: uid(), day: "Mon", meal: "Breakfast", item: "Idli + sambar + chutney" },
  { id: uid(), day: "Mon", meal: "Lunch", item: "Rice + sambar + cabbage poriyal + curd" },
  { id: uid(), day: "Mon", meal: "Dinner", item: "Chapati + dal + mixed veg" },
  { id: uid(), day: "Tue", meal: "Breakfast", item: "Pongal + chutney" },
  { id: uid(), day: "Tue", meal: "Lunch", item: "Rice + rasam + beans + curd" },
  { id: uid(), day: "Tue", meal: "Dinner", item: "Chapati + paneer curry" },
  { id: uid(), day: "Wed", meal: "Breakfast", item: "Dosa + chutney + sambar" },
  { id: uid(), day: "Wed", meal: "Lunch", item: "Rice + kuzhambu + cabbage + curd" },
  { id: uid(), day: "Wed", meal: "Dinner", item: "Chapati + egg curry" },
];

export const defaultWorkoutPhases: WorkoutPhase[] = [
  {
    id: uid(), name: "Phase 1 — Jogging / Jump Rope",
    days: [
      { id: uid(), name: "Mon", exercises: [
        { id: uid(), name: "Jogging", durationMin: 30, notes: "Easy pace" },
        { id: uid(), name: "Jump Rope", durationMin: 10, sets: 5, reps: 60 },
      ]},
      { id: uid(), name: "Wed", exercises: [
        { id: uid(), name: "Jogging", durationMin: 40 },
      ]},
      { id: uid(), name: "Fri", exercises: [
        { id: uid(), name: "Jump Rope HIIT", durationMin: 20, sets: 8, reps: 60 },
      ]},
    ],
  },
  {
    id: uid(), name: "Phase 2 — Gym",
    days: [
      { id: uid(), name: "Push", exercises: [
        { id: uid(), name: "Bench Press", sets: 4, reps: 8 },
        { id: uid(), name: "Overhead Press", sets: 3, reps: 10 },
        { id: uid(), name: "Triceps Pushdown", sets: 3, reps: 12 },
      ]},
      { id: uid(), name: "Pull", exercises: [
        { id: uid(), name: "Pull-ups", sets: 4, reps: 8 },
        { id: uid(), name: "Barbell Row", sets: 4, reps: 10 },
        { id: uid(), name: "Biceps Curl", sets: 3, reps: 12 },
      ]},
      { id: uid(), name: "Legs", exercises: [
        { id: uid(), name: "Squat", sets: 4, reps: 8 },
        { id: uid(), name: "Romanian Deadlift", sets: 3, reps: 10 },
        { id: uid(), name: "Calf Raise", sets: 4, reps: 15 },
      ]},
    ],
  },
];

export const defaultSkinLogs: SkinLog[] = Array.from({ length: 7 }).map((_, i) => ({
  date: daysAgo(i),
  faceWash: true,
  moisturizer: i % 2 === 0,
  sunscreen: i < 5,
  hairOil: i % 3 === 0,
  scalpMassage: i % 3 === 0,
  oiliness: 3,
  hairFall: 2,
  pimples: i === 0 ? 1 : 0,
  darkPatchChange: false,
}));

export const defaultSupplements: Supplement[] = [];
export const defaultIntakes: SupplementIntake[] = [];

export const defaultBooks: Book[] = [
  { id: uid(), title: "Atomic Habits", author: "James Clear", totalPages: 320, pagesRead: 184, completed: false },
  { id: uid(), title: "Deep Work", author: "Cal Newport", totalPages: 296, pagesRead: 296, completed: true },
  { id: uid(), title: "The Almanack of Naval Ravikant", author: "Eric Jorgenson", totalPages: 244, pagesRead: 52, completed: false },
];

export const defaultReading: ReadingSession[] = Array.from({ length: 8 }).map((_, i) => ({
  id: uid(),
  bookId: defaultBooks[0].id,
  date: daysAgo(i),
  pages: 10 + Math.floor(Math.random() * 20),
  minutes: 20 + Math.floor(Math.random() * 30),
}));