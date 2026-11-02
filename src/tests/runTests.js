import { runAllLogicTests } from "../lib/novaself/tests.js";

console.log("=== NOVASELF BUSINESS LOGIC & FORMULA TEST SUITE ===");
const results = runAllLogicTests();
let passedCount = 0;

results.forEach((r, i) => {
  if (r.passed) {
    passedCount++;
    console.log(`[PASS] ${i + 1}. ${r.name} - ${r.message || ""}`);
  } else {
    console.log(`[FAIL] ${i + 1}. ${r.name} - ${r.message || ""}`);
  }
});

console.log(`====================================================`);
console.log(`TEST SUMMARY: ${passedCount}/${results.length} PASSED`);
if (passedCount === results.length) {
  console.log("SUCCESS: ALL SYSTEM BUSINESS LOGIC TESTS PASSED!");
  process.exit(0);
} else {
  console.error("FAILURE: SOME TESTS FAILED.");
  process.exit(1);
}
