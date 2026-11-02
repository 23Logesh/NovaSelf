import {
  bmi, bmiCategory, bmr, tdee, calorieTarget, proteinTargetG, fiberTargetG,
  waterTargetMl, bodyFatPctUSNavy, idealWeightDevine, leanBodyMassBoer,
  whtr, whr, ffmi, oneRepMax, caloriesBurned, goalProgressPct, isoDate, streakDays
} from "./calculations";
import { buildDailyTimeline } from "./timeline";
import type { Profile, DayLog } from "./types";

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export function runAllLogicTests(): TestResult[] {
  const results: TestResult[] = [];

  const testProfile: Profile = {
    name: "Test User",
    age: 25,
    sex: "male",
    heightCm: 180,
    weightKg: 80,
    goalWeightKg: 72,
    startingWeightKg: 88,
    activity: "moderate",
    neckCm: 39,
    waistCm: 85,
    hipCm: 95,
  };

  // 1. BMI Test
  try {
    const bmiVal = bmi(80, 180);
    const cat = bmiCategory(bmiVal);
    const passed = Math.abs(bmiVal - 24.69) < 0.1 && cat === "Normal";
    results.push({ name: "BMI Calculation & Category", passed, message: `BMI: ${bmiVal.toFixed(2)} (${cat})` });
  } catch (e) {
    results.push({ name: "BMI Calculation & Category", passed: false, message: String(e) });
  }

  // 2. BMR & TDEE Test
  try {
    const bmrVal = bmr(testProfile); // male: 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
    const tdeeVal = tdee(testProfile); // 1805 * 1.55 = 2797.75
    const passed = Math.abs(bmrVal - 1805) < 1 && Math.abs(tdeeVal - 2797.75) < 5;
    results.push({ name: "BMR & TDEE Calculations", passed, message: `BMR: ${bmrVal}, TDEE: ${tdeeVal.toFixed(1)}` });
  } catch (e) {
    results.push({ name: "BMR & TDEE Calculations", passed: false, message: String(e) });
  }

  // 3. Calorie & Macro Target Test
  try {
    const targetCals = calorieTarget(testProfile); // 2797.75 - 500 = 2297.75
    const protG = proteinTargetG(testProfile); // 1.8 * 80 = 144
    const waterMl = waterTargetMl(testProfile); // 35 * 80 = 2800
    const passed = Math.abs(targetCals - 2297.75) < 5 && protG === 144 && waterMl === 2800;
    results.push({ name: "Calorie & Macro Targets", passed, message: `Cal: ${targetCals.toFixed(0)}, Prot: ${protG}g, Water: ${waterMl}ml` });
  } catch (e) {
    results.push({ name: "Calorie & Macro Targets", passed: false, message: String(e) });
  }

  // 4. US Navy Body Fat % Test
  try {
    const bf = bodyFatPctUSNavy(testProfile);
    const passed = bf !== null && bf > 5 && bf < 35;
    results.push({ name: "US Navy Body Fat % Formula", passed, message: `BF%: ${bf ? bf.toFixed(1) : "null"}%` });
  } catch (e) {
    results.push({ name: "US Navy Body Fat % Formula", passed: false, message: String(e) });
  }

  // 5. Advanced Body Metrics (WHtR, WHR, FFMI)
  try {
    const whtrRes = whtr(85, 180);
    const whrRes = whr(85, 95, "male");
    const ffmiRes = ffmi(testProfile);
    const passed = whtrRes !== null && whrRes !== null && ffmiRes !== null && whtrRes.ratio === 0.47;
    results.push({ name: "Advanced Metrics (WHtR, WHR, FFMI)", passed, message: `WHtR: ${whtrRes?.ratio}, WHR: ${whrRes?.ratio}, FFMI: ${ffmiRes?.ffmi}` });
  } catch (e) {
    results.push({ name: "Advanced Metrics (WHtR, WHR, FFMI)", passed: false, message: String(e) });
  }

  // 6. Epley 1-Rep Max Test
  try {
    const rm = oneRepMax(100, 10); // 100 * (1 + 10/30) = 133.33 -> 133
    const passed = rm === 133;
    results.push({ name: "Epley 1-Rep Max Strength Estimator", passed, message: `100kg x 10 reps = ${rm}kg 1RM` });
  } catch (e) {
    results.push({ name: "Epley 1-Rep Max Strength Estimator", passed: false, message: String(e) });
  }

  // 7. Goal Progress Percentage
  try {
    const prog = goalProgressPct(testProfile); // (88 - 80) / (88 - 72) = 8 / 16 = 50%
    const passed = Math.abs(prog - 50) < 0.1;
    results.push({ name: "Goal Progress Calculation", passed, message: `Progress: ${prog.toFixed(1)}%` });
  } catch (e) {
    results.push({ name: "Goal Progress Calculation", passed: false, message: String(e) });
  }

  // 8. Timeline Builder Test
  try {
    const todayStr = isoDate();
    const mockState = {
      days: [{
        date: todayStr,
        foods: [{ id: "f1", name: "Oats", calories: 300, protein: 10, fiber: 5 }],
        water: [{ id: "w1", ml: 500 }],
        workouts: [{ id: "wk1", type: "gym", durationMin: 45, caloriesBurned: 300 }],
      }],
      skinLogs: [{
        date: todayStr, faceWash: true, moisturizer: true, sunscreen: true,
        hairOil: false, scalpMassage: false, oiliness: 3, hairFall: 2, pimples: 0, darkPatchChange: false,
      }],
      sleepLogs: [{ date: todayStr, bedTime: "23:00", wakeTime: "07:00", durationHours: 8, quality: 4 }],
      intakes: [],
      supplements: [],
      readingSessions: [],
      books: [],
    };
    const timeline = buildDailyTimeline(todayStr, mockState as any);
    const passed = timeline.length >= 4; // workout, food, water, skin, sleep
    results.push({ name: "Daily Timeline Builder Merging", passed, message: `Merged ${timeline.length} category entries` });
  } catch (e) {
    results.push({ name: "Daily Timeline Builder Merging", passed: false, message: String(e) });
  }

  return results;
}
