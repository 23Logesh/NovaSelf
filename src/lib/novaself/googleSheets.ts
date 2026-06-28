// ============================================================================
// Google Sheets / Drive — per-user data store, real implementation.
// ============================================================================
//
// ARCHITECTURE:
// - Each signed-in user gets ONE "NovaSelf Data" spreadsheet in THEIR OWN Drive.
// - We use drive.file scope, so we can only see files this app created — we can
//   never accidentally touch any other files in the user's Drive.
// - All fetch() calls go directly from the browser to Google APIs.
//   Authorization: Bearer {accessToken} — no backend proxy.
// - FR-43/44 multi-user isolation is structural: each user's accessToken can
//   only reach their own Drive. There is no shared backend table.
//
// Tab layout (FR-03):
//   Daily_Log        — one row per DayLog (date, weightKg, foods JSON, water JSON, workouts JSON)
//   Weekly_Summary   — computed summaries (reserved; written but not yet read back)
//   Profile          — single row of profile + settings fields
//   Supplements      — one row per Supplement + header; intakes as separate range
//   Config           — diet phases JSON, mess JSON, workout phases JSON, skin logs JSON, books JSON,
//                      reading sessions JSON, chat JSON
//
// Serialization: complex nested arrays are stored as single-cell JSON blobs.
// Simple flat values are stored in individual columns.

import type { AppState } from "./store";


export interface SheetHandle {
  spreadsheetId: string;
  webViewLink: string;
}

/**
 * Return value from ensureUserSheet.
 * `isNewlyCreated` is true ONLY when the sheet was actually created in this call.
 * It is false when an existing sheet was found — regardless of what loadStateFromSheet
 * later returns. This is the canonical signal for "brand-new user" vs "returning user".
 */
export interface EnsureSheetResult {
  handle: SheetHandle;
  isNewlyCreated: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SHEET_NAME = "NovaSelf Data";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

const TABS = ["Daily_Log", "Weekly_Summary", "Profile", "Supplements", "Config"] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function gDriveGet(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    throw new Error("[googleSheets] 401 Unauthorized — token expired. Reconnect required.");
  }
  if (!res.ok) throw new Error(`[googleSheets] Drive GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function gPost(url: string, body: unknown, token: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("[googleSheets] 401 Unauthorized — token expired. Reconnect required.");
  }
  if (!res.ok) throw new Error(`[googleSheets] POST ${res.status}: ${await res.text()}`);
  return res.json();
}

async function gPut(url: string, body: unknown, token: string) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("[googleSheets] 401 Unauthorized — token expired. Reconnect required.");
  }
  if (!res.ok) throw new Error(`[googleSheets] PUT ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// ensureUserSheet
// ---------------------------------------------------------------------------
/**
 * Finds or creates the user's "NovaSelf Data" spreadsheet.
 *
 * Returns { handle, isNewlyCreated } where isNewlyCreated is TRUE only when
 * the sheet was created in THIS call. It is FALSE when an existing sheet was
 * found — even if the sheet happens to be empty for any reason.
 *
 * Callers MUST use isNewlyCreated (not the emptiness of a subsequent load)
 * to decide whether to apply a blank-slate reset.
 */
export async function ensureUserSheet(accessToken: string): Promise<EnsureSheetResult> {
  // Search for an existing "NovaSelf Data" sheet this app created (drive.file scope
  // means we can only see files we created — perfect isolation).
  const query = encodeURIComponent(
    `name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  );
  const listUrl = `${DRIVE_FILES_URL}?q=${query}&fields=files(id,webViewLink)&spaces=drive`;
  const listData = await gDriveGet(listUrl, accessToken);

  if (listData.files && listData.files.length > 0) {
    // Found an existing sheet — isNewlyCreated is explicitly false.
    const existing = listData.files[0];
    return {
      handle: { spreadsheetId: existing.id, webViewLink: existing.webViewLink },
      isNewlyCreated: false,
    };
  }

  // Not found — create a new spreadsheet with all five tabs.
  const createBody = {
    properties: { title: SHEET_NAME },
    sheets: TABS.map((title) => ({ properties: { title } })),
  };
  const created = await gPost(SHEETS_BASE_URL, createBody, accessToken);

  // Seed header rows so batchGet reads don't choke on empty sheets.
  await _seedHeaders(created.spreadsheetId, accessToken);

  return {
    handle: {
      spreadsheetId: created.spreadsheetId,
      webViewLink: created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}`,
    },
    isNewlyCreated: true,
  };
}

async function _seedHeaders(spreadsheetId: string, accessToken: string) {
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`;
  await gPost(
    url,
    {
      valueInputOption: "RAW",
      data: [
        {
          range: "Daily_Log!A1:E1",
          values: [["date", "weightKg", "foods", "water", "workouts"]],
        },
        {
          range: "Profile!A1:B1",
          values: [["key", "value"]],
        },
        {
          range: "Supplements!A1:F1",
          values: [["id", "name", "unit", "stock", "defaultDose", "intakes"]],
        },
        {
          range: "Config!A1:B1",
          values: [["key", "value"]],
        },
      ],
    },
    accessToken,
  );
}

// ---------------------------------------------------------------------------
// loadStateFromSheet
// ---------------------------------------------------------------------------
export async function loadStateFromSheet(
  handle: SheetHandle,
  accessToken: string,
): Promise<Partial<AppState> | null> {
  const ranges = [
    "Daily_Log!A1:E1000",
    "Profile!A1:B1000",
    "Supplements!A1:F1000",
    "Config!A1:B1000",
  ]
    .map(encodeURIComponent)
    .join("&ranges=");

  const url = `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values:batchGet?ranges=${ranges}`;
  const data = await gDriveGet(url, accessToken);

  const byRange: Record<string, string[][]> = {};
  for (const vr of data.valueRanges ?? []) {
    const key = (vr.range as string).split("!")[0].replace(/'/g, "");
    byRange[key] = vr.values ?? [];
  }

  return {
    days: _parseDailyLog(byRange["Daily_Log"] ?? []),
    ...(_parseProfile(byRange["Profile"] ?? [])),
    ...(_parseConfig(byRange["Config"] ?? [])),
    ...(_parseSupplements(byRange["Supplements"] ?? [])),
  };
}

function _parseDailyLog(rows: string[][]): AppState["days"] {
  if (rows.length < 2) return [];
  return rows.slice(1).flatMap((row) => {
    try {
      return [{
        date: row[0] ?? "",
        weightKg: row[1] ? parseFloat(row[1]) : undefined,
        foods: safeJson(row[2], []),
        water: safeJson(row[3], []),
        workouts: safeJson(row[4], []),
      }];
    } catch {
      return [];
    }
  });
}

function _parseProfile(rows: string[][]): Partial<AppState> {
  const map = kvToMap(rows);
  if (!map.size) return {};
  const profile = safeJson(map.get("profile"), null);
  const settings = safeJson(map.get("settings"), null);
  const out: Partial<AppState> = {};
  if (profile) out.profile = profile;
  if (settings) out.settings = settings;
  return out;
}

function _parseConfig(rows: string[][]): Partial<AppState> {
  const map = kvToMap(rows);
  if (!map.size) return {};
  const out: Partial<AppState> = {};
  const keys: (keyof AppState)[] = [
    "dietPhases", "mess", "workoutPhases", "skinLogs",
    "books", "readingSessions", "chat",
  ];
  for (const k of keys) {
    const v = safeJson(map.get(k), null);
    if (v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function _parseSupplements(rows: string[][]): Partial<AppState> {
  if (rows.length < 2) return {};
  const supplements: AppState["supplements"] = [];
  const intakes: AppState["intakes"] = [];
  for (const row of rows.slice(1)) {
    if (!row[0]) continue;
    supplements.push({
      id: row[0],
      name: row[1] ?? "",
      unit: row[2] ?? "",
      stock: parseFloat(row[3] ?? "0") || 0,
      defaultDose: parseFloat(row[4] ?? "0") || 0,
    });
    const rowIntakes = safeJson(row[5], []);
    intakes.push(...rowIntakes);
  }
  return { supplements, intakes };
}

// ---------------------------------------------------------------------------
// saveStateToSheet
// ---------------------------------------------------------------------------
export async function saveStateToSheet(
  handle: SheetHandle,
  accessToken: string,
  state: Partial<AppState>,
): Promise<void> {
  const data: { range: string; values: unknown[][] }[] = [];

  if (state.days) {
    const rows: unknown[][] = [["date", "weightKg", "foods", "water", "workouts"]];
    for (const d of state.days) {
      rows.push([
        d.date,
        d.weightKg ?? "",
        JSON.stringify(d.foods),
        JSON.stringify(d.water),
        JSON.stringify(d.workouts),
      ]);
    }
    data.push({ range: "Daily_Log!A1", values: rows });
  }

  // Profile + settings
  if (state.profile || state.settings) {
    const rows: unknown[][] = [["key", "value"]];
    if (state.profile) rows.push(["profile", JSON.stringify(state.profile)]);
    if (state.settings) rows.push(["settings", JSON.stringify(state.settings)]);
    data.push({ range: "Profile!A1", values: rows });
  }

  // Config blob keys
  const configKeys: (keyof AppState)[] = [
    "dietPhases", "mess", "workoutPhases", "skinLogs",
    "books", "readingSessions", "chat",
  ];
  const configRows: unknown[][] = [["key", "value"]];
  let hasConfig = false;
  for (const k of configKeys) {
    if (k in (state as object)) {
      configRows.push([k, JSON.stringify((state as Record<string, unknown>)[k])]);
      hasConfig = true;
    }
  }
  if (hasConfig) data.push({ range: "Config!A1", values: configRows });

  // Supplements + intakes
  if (state.supplements) {
    const rows: unknown[][] = [["id", "name", "unit", "stock", "defaultDose", "intakes"]];
    for (const sup of state.supplements) {
      const myIntakes = (state.intakes ?? []).filter((i) => i.supplementId === sup.id);
      rows.push([sup.id, sup.name, sup.unit, sup.stock, sup.defaultDose, JSON.stringify(myIntakes)]);
    }
    data.push({ range: "Supplements!A1", values: rows });
  }

  if (data.length === 0) return;

  const url = `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values:batchUpdate`;
  await gPost(url, { valueInputOption: "RAW", data }, accessToken);
}

// ---------------------------------------------------------------------------
// syncToSheet — full bidirectional reconcile (single-user: just overwrite)
// ---------------------------------------------------------------------------
export async function syncToSheet(
  handle: SheetHandle,
  accessToken: string,
  state: AppState,
): Promise<void> {
  // For a single-user personal sheet, "sync" is just a full save.
  // The only meaningful conflict scenario is a user who edits the Sheet
  // directly — if that matters later, read first and merge.
  await saveStateToSheet(handle, accessToken, state);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function safeJson<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function kvToMap(rows: string[][]): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of rows.slice(1)) {
    if (row[0]) m.set(row[0], row[1] ?? "");
  }
  return m;
}