// ============================================================================
// Google Sheets / Drive — per-user data store.
// ============================================================================
//
// ARCHITECTURE:
//   - Each signed-in user gets ONE "NovaSelf Data" spreadsheet in their own
//     Drive. drive.file scope means we can only see files this app created.
//   - All fetch() calls go directly from the browser to Google APIs.
//     Authorization: Bearer {accessToken} — no backend proxy.
//
// MULTI-DEVICE SYNC — conflict-aware saves:
//   saveStateToSheet() no longer blindly overwrites. Before each write it
//   reads the Config tab's `lastModified` row (a single small range) and
//   compares it to _lastKnownSheetTimestamp — the timestamp this device last
//   wrote or read. If the sheet is newer, another device has saved since this
//   device last synced. In that case the full remote state is loaded and
//   merged with local changes before writing.
//
//   pullRemoteChanges() performs the SAME cheap check on a timer / on tab
//   focus (see store.tsx), so a device that isn't making local edits still
//   picks up changes from other devices without needing a reload.
//
//   _lastKnownSheetTimestamp starts at 0 on every page load (conservative —
//   means the first auto-save after load always does a conflict check).
//   loadStateFromSheet() updates it so that immediately after sign-in the
//   baseline is correct and the first auto-save doesn't spuriously merge.
//
// MERGE STRATEGY (per data type):
//
//   Append-only (intakes, readingSessions, chat):
//     Union by id — entries from BOTH devices are kept. An id that exists on
//     both is assumed to be the same entry (same id = same event); local wins
//     on content, which is a safe no-op for truly identical entries.
//
//   Per-date — DayLog (days):
//     All dates from both devices are kept. For a date present on both,
//     foods / water / workouts are each unioned by id. These sub-arrays are
//     append-only in the current UI (no delete-entry flow exists). weightKg
//     prefers local if set, falls back to remote.
//     CAVEAT: if a delete-entry UI is ever added, add a per-date `deletedIds`
//     set to prevent deleted entries from being resurrected on merge.
//
//   Per-date — SkinLog (skinLogs) / SleepLog (sleepLogs):
//     All dates from both devices are kept. For a date on both, local wins.
//     Both are single structured per-day entries with no sub-entry ids and
//     no updatedAt — local is the best available proxy for "most recent".
//
//   Books:
//     Union by id. For a book on both devices: local wins for all metadata
//     (title, author, totalPages); pagesRead = max(local, remote) since
//     reading progress only ever moves forward.
//
//   Supplements (definitions):
//     Union by id — a supplement added on EITHER device is kept (this used
//     to be local-wins-entirely, which silently dropped a supplement added
//     on one device the next time the other device saved). On the same id,
//     local wins for name/unit/defaultDose; stock = min(local, remote) since
//     stock only ever decreases via logIntake in the current UI (no restock
//     control yet) — whichever device logged more intakes has the more
//     truthful number. NOTE: if a restock/edit-stock feature is ever added,
//     this min() rule breaks — switch to signed stock-delta events, same
//     pattern as intakes.
//
//   Whole-list configs (dietPhases, workoutPhases, mess):
//     Local wins entirely. TRADEOFF: an item added to one of these lists on
//     a remote device can be lost if the local device saves before the remote
//     syncs. Accepted because these lists are edited rarely and true per-item
//     merging would require change-tracking not present in the current schema.
//
//   Scalars (profile, settings):
//     Whichever side has the newer profileUpdatedAt / settingsUpdatedAt wins
//     (see AppState). Old sheets without these rows parse to 0, so they never
//     beat a real timestamp.
//
// TAB LAYOUT:
//   Daily_Log   — one row per DayLog (date, weightKg, foods, water, workouts)
//   Profile     — key/value: profile JSON, settings JSON, profileUpdatedAt,
//                            settingsUpdatedAt
//   Supplements — one row per Supplement; intakes JSON in last column
//   Config      — key/value: lastModified, dietPhases, mess, workoutPhases,
//                            skinLogs, sleepLogs, books, readingSessions, chat
// ============================================================================

import type { AppState } from "./store";
import type { DayLog, SkinLog, SleepLog, Book } from "./types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SheetHandle {
  spreadsheetId: string;
  webViewLink: string;
}

/**
 * Returned by ensureUserSheet.
 * isNewlyCreated is true ONLY when the sheet was created in this call —
 * never inferred from whether a subsequent load returned data.
 */
export interface EnsureSheetResult {
  handle: SheetHandle;
  isNewlyCreated: boolean;
}

// ---------------------------------------------------------------------------
// Module-level sync state
// ---------------------------------------------------------------------------

/**
 * The `lastModified` timestamp this device last wrote to (or read from) the
 * Sheet. Compared against the Sheet's stored timestamp before every save (and
 * every background pull) to detect writes from other devices.
 *
 * Starts at 0 on every page load. loadStateFromSheet() sets it to the
 * Sheet's current timestamp so the first auto-save after sign-in doesn't
 * spuriously trigger a merge.
 */
let _lastKnownSheetTimestamp = 0;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHEET_NAME = "NovaSelf Data";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

const TABS = ["Daily_Log", "Weekly_Summary", "Profile", "Supplements", "Config"] as const;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gDriveGet(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error("[googleSheets] 401 Unauthorized — token expired. Reconnect required.");
  }
  if (!res.ok) {
    throw new Error(`[googleSheets] GET ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gPost(url: string, body: unknown, token: string): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("[googleSheets] 401 Unauthorized — token expired. Reconnect required.");
  }
  if (!res.ok) {
    throw new Error(`[googleSheets] POST ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// ensureUserSheet
// ---------------------------------------------------------------------------

/**
 * Finds or creates the user's "NovaSelf Data" spreadsheet.
 * isNewlyCreated is the ONLY reliable signal for "brand-new user" —
 * callers must not re-derive it from whether loadStateFromSheet returned data.
 */
export async function ensureUserSheet(accessToken: string): Promise<EnsureSheetResult> {
  const query = encodeURIComponent(
    `name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  );
  const listData = await gDriveGet(
    `${DRIVE_FILES_URL}?q=${query}&fields=files(id,webViewLink)&spaces=drive`,
    accessToken,
  );

  if (listData.files && listData.files.length > 0) {
    const existing = listData.files[0] as { id: string; webViewLink: string };
    return {
      handle: { spreadsheetId: existing.id, webViewLink: existing.webViewLink },
      isNewlyCreated: false,
    };
  }

  // Sheet not found — create it with all tabs, then seed header rows.
  const created = await gPost(
    SHEETS_BASE_URL,
    {
      properties: { title: SHEET_NAME },
      sheets: TABS.map((title) => ({ properties: { title } })),
    },
    accessToken,
  );

  await _seedHeaders(created.spreadsheetId, accessToken);

  return {
    handle: {
      spreadsheetId: created.spreadsheetId,
      webViewLink:
        created.spreadsheetUrl ??
        `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}`,
    },
    isNewlyCreated: true,
  };
}

async function _seedHeaders(spreadsheetId: string, accessToken: string): Promise<void> {
  await gPost(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`,
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

/**
 * Loads the full state from the user's Sheet.
 * As a side effect, updates _lastKnownSheetTimestamp to the Sheet's current
 * lastModified value so the first auto-save after sign-in has a correct
 * baseline and doesn't spuriously trigger a conflict merge.
 */
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

  const data = await gDriveGet(
    `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values:batchGet?ranges=${ranges}`,
    accessToken,
  );

  const byRange: Record<string, string[][]> = {};
  for (const vr of (data.valueRanges ?? []) as { range: string; values?: string[][] }[]) {
    const key = vr.range.split("!")[0].replace(/'/g, "");
    byRange[key] = vr.values ?? [];
  }

  // Update _lastKnownSheetTimestamp so the first auto-save after sign-in
  // doesn't see "sheet timestamp > 0 > known = 0" and spuriously merge.
  const configMap = kvToMap(byRange["Config"] ?? []);
  const sheetTs = parseInt(configMap.get("lastModified") ?? "0", 10) || 0;
  if (sheetTs > 0) {
    _lastKnownSheetTimestamp = sheetTs;
  }

  return {
    days: _parseDailyLog(byRange["Daily_Log"] ?? []),
    ...(_parseProfile(byRange["Profile"] ?? [])),
    ...(_parseConfig(configMap)),
    ...(_parseSupplements(byRange["Supplements"] ?? [])),
  };
}

// ---------------------------------------------------------------------------
// saveStateToSheet — conflict-aware, public entry point
// ---------------------------------------------------------------------------

/**
 * Saves local state to the Sheet, merging with remote changes first if
 * another device has written since this device last synced.
 *
 * Callers (store.tsx auto-save, manual save, syncToSheet) do not need to
 * change — the conflict detection is entirely internal.
 */
export async function saveStateToSheet(
  handle: SheetHandle,
  accessToken: string,
  state: Partial<AppState>,
): Promise<void> {
  const nowMs = Date.now();
  let stateToWrite: Partial<AppState> = state;

  // ── Conflict detection ────────────────────────────────────────────────────
  // Read only the Config tab (small — a handful of key-value rows, fast)
  // to check whether another device has written since this one last synced.
  // If so, load the full remote state and merge before writing.
  //
  // On failure (network error, 401), fall through to a direct write —
  // a non-merged save is always better than no save.
  try {
    const configData = await gDriveGet(
      `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values/${encodeURIComponent("Config!A:B")}`,
      accessToken,
    );

    const sheetTimestamp =
      parseInt(kvToMap((configData.values as string[][] | undefined) ?? []).get("lastModified") ?? "0", 10) || 0;

    if (sheetTimestamp > _lastKnownSheetTimestamp) {
      console.log(
        `[googleSheets] Conflict detected — sheet=${sheetTimestamp}, ` +
          `known=${_lastKnownSheetTimestamp}. Loading remote state for merge.`,
      );
      const remoteState = await _readFullState(handle, accessToken);
      if (remoteState) {
        stateToWrite = _mergeStates(state, remoteState);
        console.log("[googleSheets] Merge complete — writing reconciled state.");
      } else {
        console.warn(
          "[googleSheets] Remote read for merge failed; proceeding with local state only.",
        );
      }
    }
  } catch (err) {
    console.warn(
      "[googleSheets] Pre-save conflict check failed; proceeding with direct write:",
      err,
    );
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  await _writeStateToSheet(handle, accessToken, stateToWrite, nowMs);

  // Only update after a successful write — if _writeStateToSheet throws,
  // _lastKnownSheetTimestamp stays at the pre-write value so the next attempt
  // still sees any remote changes that arrived in the meantime.
  _lastKnownSheetTimestamp = nowMs;
}

// ---------------------------------------------------------------------------
// syncToSheet — manual full sync (inherits conflict-merge via saveStateToSheet)
// ---------------------------------------------------------------------------

export async function syncToSheet(
  handle: SheetHandle,
  accessToken: string,
  state: AppState,
): Promise<void> {
  await saveStateToSheet(handle, accessToken, state);
}

// ---------------------------------------------------------------------------
// NEW — pullRemoteChanges: read-only check for changes from OTHER devices.
//
// Used by store.tsx's background-pull effect so a device that ISN'T making
// local edits (e.g. a laptop tab just sitting open) still picks up data
// logged elsewhere (e.g. mobile), instead of waiting for its own next local
// edit to trigger the save-time conflict check.
//
// Returns null when the Sheet hasn't changed since we last knew about it
// (the common case — cheap, only reads the small Config tab).
// Returns a merged Partial<AppState> (ready to apply via setState) when the
// Sheet IS newer — same merge rules as a save-time conflict, just without
// writing anything back (the caller's own state-change will trigger that
// via the normal auto-save effect, refreshing the Sheet's lastModified).
// ---------------------------------------------------------------------------
export async function pullRemoteChanges(
  handle: SheetHandle,
  accessToken: string,
  localState: Partial<AppState>,
): Promise<Partial<AppState> | null> {
  const configData = await gDriveGet(
    `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values/${encodeURIComponent("Config!A:B")}`,
    accessToken,
  );

  const sheetTimestamp =
    parseInt(kvToMap((configData.values as string[][] | undefined) ?? []).get("lastModified") ?? "0", 10) || 0;

  if (sheetTimestamp <= _lastKnownSheetTimestamp) {
    return null; // nothing new
  }

  console.log(
    `[googleSheets] pullRemoteChanges: sheet=${sheetTimestamp}, ` +
      `known=${_lastKnownSheetTimestamp}. Loading + merging remote state.`,
  );

  const remoteState = await _readFullState(handle, accessToken);
  if (!remoteState) return null;

  // Mark this timestamp as known BEFORE returning, so the next auto-save's
  // own conflict check doesn't redundantly re-merge the same remote write.
  _lastKnownSheetTimestamp = sheetTimestamp;

  return _mergeStates(localState, remoteState);
}

// ---------------------------------------------------------------------------
// _readFullState — private; used by conflict-merge and pull paths
// ---------------------------------------------------------------------------
//
// Does NOT update _lastKnownSheetTimestamp itself — callers decide when
// (saveStateToSheet updates it post-write; pullRemoteChanges updates it
// right after this read since there's no write to wait for).

async function _readFullState(
  handle: SheetHandle,
  accessToken: string,
): Promise<Partial<AppState> | null> {
  try {
    const ranges = [
      "Daily_Log!A1:E1000",
      "Profile!A1:B1000",
      "Supplements!A1:F1000",
      "Config!A1:B1000",
    ]
      .map(encodeURIComponent)
      .join("&ranges=");

    const data = await gDriveGet(
      `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values:batchGet?ranges=${ranges}`,
      accessToken,
    );

    const byRange: Record<string, string[][]> = {};
    for (const vr of (data.valueRanges ?? []) as { range: string; values?: string[][] }[]) {
      const key = vr.range.split("!")[0].replace(/'/g, "");
      byRange[key] = vr.values ?? [];
    }

    const configMap = kvToMap(byRange["Config"] ?? []);

    return {
      days: _parseDailyLog(byRange["Daily_Log"] ?? []),
      ...(_parseProfile(byRange["Profile"] ?? [])),
      ...(_parseConfig(configMap)),
      ...(_parseSupplements(byRange["Supplements"] ?? [])),
    };
  } catch (err) {
    console.error("[googleSheets] _readFullState failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// _writeStateToSheet — private; performs the actual batchUpdate
// ---------------------------------------------------------------------------

async function _writeStateToSheet(
  handle: SheetHandle,
  accessToken: string,
  state: Partial<AppState>,
  nowMs: number,
): Promise<void> {
  const data: { range: string; values: unknown[][] }[] = [];

  // Daily_Log
  if (state.days !== undefined) {
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

  // Profile — now also writes profileUpdatedAt / settingsUpdatedAt so the
  // next merge (on any device) can tell which side's profile/settings is
  // actually newer instead of guessing.
  if (state.profile !== undefined || state.settings !== undefined) {
    const rows: unknown[][] = [["key", "value"]];
    if (state.profile !== undefined) {
      rows.push(["profile", JSON.stringify(state.profile)]);
      rows.push(["profileUpdatedAt", String(state.profileUpdatedAt ?? Date.now())]);
    }
    if (state.settings !== undefined) {
      rows.push(["settings", JSON.stringify(state.settings)]);
      rows.push(["settingsUpdatedAt", String(state.settingsUpdatedAt ?? Date.now())]);
    }
    data.push({ range: "Profile!A1", values: rows });
  }

  // Config — lastModified is always written first so its row position is
  // stable (B2) and the pre-save conflict check can read it cheaply.
  {
    const rows: unknown[][] = [
      ["key", "value"],
      ["lastModified", String(nowMs)],
    ];
    const configKeys: (keyof AppState)[] = [
      "dietPhases",
      "mess",
      "workoutPhases",
      "skinLogs",
      "sleepLogs",
      "books",
      "readingSessions",
      "chat",
    ];
    for (const k of configKeys) {
      if (k in (state as object)) {
        rows.push([k, JSON.stringify((state as Record<string, unknown>)[k])]);
      }
    }
    data.push({ range: "Config!A1", values: rows });
  }

  // Supplements
  if (state.supplements !== undefined) {
    const rows: unknown[][] = [["id", "name", "unit", "stock", "defaultDose", "intakes"]];
    for (const sup of state.supplements) {
      const myIntakes = (state.intakes ?? []).filter((i) => i.supplementId === sup.id);
      rows.push([
        sup.id,
        sup.name,
        sup.unit,
        sup.stock,
        sup.defaultDose,
        JSON.stringify(myIntakes),
      ]);
    }
    data.push({ range: "Supplements!A1", values: rows });
  }

  if (data.length === 0) return;

  await gPost(
    `${SHEETS_BASE_URL}/${handle.spreadsheetId}/values:batchUpdate`,
    { valueInputOption: "RAW", data },
    accessToken,
  );
}

// ---------------------------------------------------------------------------
// Merge functions
// ---------------------------------------------------------------------------

/**
 * Reconciles local state (this device) with remote state (the Sheet, written
 * by another device). Returns a merged Partial<AppState> that preserves data
 * from both according to the per-type strategy documented at the top of the file.
 */
function _mergeStates(
  local: Partial<AppState>,
  remote: Partial<AppState>,
): Partial<AppState> {
  // Start with local as the base. This preserves:
  //   - Fields not stored in the Sheet (signedIn, onboarded)
  //   - Local-wins fields with no explicit merge rule below:
  //     dietPhases, workoutPhases, mess (rarely edited from 2 devices at once)
  const merged: Partial<AppState> = { ...local };

  // Append-only collections: union by id, never drop entries from either device.
  merged.intakes = _unionById(local.intakes ?? [], remote.intakes ?? []);

  merged.readingSessions = _unionById(
    local.readingSessions ?? [],
    remote.readingSessions ?? [],
  ).sort((a, b) => a.date.localeCompare(b.date));

  merged.chat = _unionById(local.chat ?? [], remote.chat ?? [])
    .sort((a, b) => a.ts - b.ts);

  // Per-date data: union across dates, per-type strategy within same date.
  merged.days = _mergeDays(local.days ?? [], remote.days ?? []);
  merged.skinLogs = _mergeSkinLogs(local.skinLogs ?? [], remote.skinLogs ?? []);
  merged.sleepLogs = _mergeSleepLogs(local.sleepLogs ?? [], remote.sleepLogs ?? []);

  // Books: union by id, max pagesRead, local wins for metadata.
  merged.books = _mergeBooks(local.books ?? [], remote.books ?? []);

  // Supplements: union by id (so a supplement added on ONE device is never
  // dropped when the OTHER device saves), min(stock) on conflict — see the
  // top-of-file doc comment for why min() is the right call today.
  merged.supplements = _mergeSupplements(local.supplements ?? [], remote.supplements ?? []);

  // Scalars — pick whichever side actually saved more recently instead of
  // blindly trusting local. Falls back to local-wins only if neither side
  // has a timestamp yet (very old data, pre-this-fix). Carrying forward the
  // WINNING timestamp (not Date.now()) keeps the next comparison accurate.
  const localProfileTs  = local.profileUpdatedAt  ?? 0;
  const remoteProfileTs = remote.profileUpdatedAt ?? 0;
  if (remoteProfileTs > localProfileTs && remote.profile !== undefined) {
    merged.profile = remote.profile;
    merged.profileUpdatedAt = remoteProfileTs;
  }

  const localSettingsTs  = local.settingsUpdatedAt  ?? 0;
  const remoteSettingsTs = remote.settingsUpdatedAt ?? 0;
  if (remoteSettingsTs > localSettingsTs && remote.settings !== undefined) {
    merged.settings = remote.settings;
    merged.settingsUpdatedAt = remoteSettingsTs;
  }

  return merged;
}

/**
 * Union two arrays by id. Local wins on id collision.
 * For genuinely append-only data, a collision means the same event exists on
 * both devices with identical content — local-wins is a safe no-op.
 */
function _unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const seen = new Map<string, T>();
  // Insert remote first so local can overwrite on same id.
  for (const item of remote) seen.set(item.id, item);
  for (const item of local) seen.set(item.id, item);
  return [...seen.values()];
}

/**
 * Merge DayLog arrays.
 *   Different dates → keep both.
 *   Same date on both → union foods/water/workouts by id within the day;
 *                        weightKg prefers local if set, falls back to remote.
 */
function _mergeDays(local: DayLog[], remote: DayLog[]): DayLog[] {
  const byDate = new Map<string, DayLog>();

  // Seed with remote entries.
  for (const day of remote) {
    byDate.set(day.date, day);
  }

  // Apply local entries, merging same-date sub-arrays.
  for (const localDay of local) {
    const remoteDay = byDate.get(localDay.date);
    if (remoteDay === undefined) {
      // Date only on this device — keep as-is.
      byDate.set(localDay.date, localDay);
    } else {
      // Date on both devices — union sub-arrays by id.
      byDate.set(localDay.date, {
        date: localDay.date,
        weightKg: localDay.weightKg ?? remoteDay.weightKg,
        foods:    _unionById(localDay.foods,    remoteDay.foods),
        water:    _unionById(localDay.water,    remoteDay.water),
        workouts: _unionById(localDay.workouts, remoteDay.workouts),
      });
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merge SkinLog arrays.
 *   Different dates → keep both.
 *   Same date on both → local wins (no sub-entry ids, no updatedAt field;
 *   local is the best proxy for "most recently edited").
 */
function _mergeSkinLogs(local: SkinLog[], remote: SkinLog[]): SkinLog[] {
  const byDate = new Map<string, SkinLog>();

  // Seed with remote; local overwrites on same date.
  for (const log of remote) byDate.set(log.date, log);
  for (const log of local)  byDate.set(log.date, log);

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merge SleepLog arrays. Same strategy as SkinLog — local wins on same date
 * (no sub-entry ids / updatedAt on this struct yet).
 */
function _mergeSleepLogs(local: SleepLog[], remote: SleepLog[]): SleepLog[] {
  const byDate = new Map<string, SleepLog>();

  for (const log of remote) byDate.set(log.date, log);
  for (const log of local)  byDate.set(log.date, log);

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merge Book arrays.
 *   Book only on one device → keep it.
 *   Same id on both → local wins for all metadata; pagesRead = max of both
 *   (reading progress is monotonically increasing — whichever device read
 *   further wins); completed is recomputed from merged pagesRead.
 */
function _mergeBooks(local: Book[], remote: Book[]): Book[] {
  const byId = new Map<string, Book>();

  // Seed with remote entries.
  for (const book of remote) byId.set(book.id, book);

  // Apply local entries, blending pagesRead on conflict.
  for (const localBook of local) {
    const remoteBook = byId.get(localBook.id);
    if (remoteBook === undefined) {
      byId.set(localBook.id, localBook);
    } else {
      const pagesRead = Math.max(localBook.pagesRead, remoteBook.pagesRead);
      byId.set(localBook.id, {
        ...localBook,                          // local wins for metadata
        pagesRead,
        completed: pagesRead >= localBook.totalPages,
      });
    }
  }

  return [...byId.values()];
}

/**
 * Merge Supplement (definition) arrays.
 *   Supplement only on one device → keep it (fixes a supplement silently
 *   disappearing from the Sheet the next time the OTHER device saves).
 *   Same id on both → local wins for name/unit/defaultDose; stock = min of
 *   both, since stock is monotonically non-increasing in the current UI
 *   (see top-of-file doc comment).
 */
function _mergeSupplements(
  local: AppState["supplements"],
  remote: AppState["supplements"],
): AppState["supplements"] {
  const byId = new Map<string, AppState["supplements"][number]>();

  for (const sup of remote) byId.set(sup.id, sup);

  for (const localSup of local) {
    const remoteSup = byId.get(localSup.id);
    byId.set(
      localSup.id,
      remoteSup
        ? { ...localSup, stock: Math.min(localSup.stock, remoteSup.stock) }
        : localSup,
    );
  }

  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// Parse helpers (Sheet rows → AppState slices)
// ---------------------------------------------------------------------------

function _parseDailyLog(rows: string[][]): AppState["days"] {
  if (rows.length < 2) return [];
  return rows.slice(1).flatMap((row) => {
    try {
      return [{
        date:      row[0] ?? "",
        weightKg:  row[1] ? parseFloat(row[1]) : undefined,
        foods:     safeJson(row[2], []),
        water:     safeJson(row[3], []),
        workouts:  safeJson(row[4], []),
      }];
    } catch {
      return [];
    }
  });
}

function _parseProfile(rows: string[][]): Partial<AppState> {
  const map = kvToMap(rows);
  if (!map.size) return {};
  const out: Partial<AppState> = {};
  const profile  = safeJson(map.get("profile"),  null);
  const settings = safeJson(map.get("settings"), null);
  if (profile  !== null) out.profile  = profile;
  if (settings !== null) out.settings = settings;
  // Per-field timestamps — used by _mergeStates to pick the genuinely newer
  // side instead of always favoring local. Old sheets won't have these rows
  // yet; default to 0 so an old remote never wins against a real local edit.
  out.profileUpdatedAt  = parseInt(map.get("profileUpdatedAt")  ?? "0", 10) || 0;
  out.settingsUpdatedAt = parseInt(map.get("settingsUpdatedAt") ?? "0", 10) || 0;
  return out;
}

/**
 * Parses Config key-value data. Accepts a pre-built Map so callers can
 * extract `lastModified` from the same map without re-parsing.
 * `lastModified` is not an AppState key and is silently ignored here.
 */
function _parseConfig(configMap: Map<string, string>): Partial<AppState> {
  if (!configMap.size) return {};
  const out: Partial<AppState> = {};
  const keys: (keyof AppState)[] = [
    "dietPhases",
    "mess",
    "workoutPhases",
    "skinLogs",
    "sleepLogs",
    "books",
    "readingSessions",
    "chat",
  ];
  for (const k of keys) {
    const v = safeJson(configMap.get(k), null);
    if (v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function _parseSupplements(rows: string[][]): Partial<AppState> {
  if (rows.length < 2) return {};
  const supplements: AppState["supplements"] = [];
  const intakes:     AppState["intakes"]     = [];
  for (const row of rows.slice(1)) {
    if (!row[0]) continue;
    supplements.push({
      id:          row[0],
      name:        row[1] ?? "",
      unit:        row[2] ?? "",
      stock:       parseFloat(row[3] ?? "0") || 0,
      defaultDose: parseFloat(row[4] ?? "0") || 0,
    });
    intakes.push(...safeJson<AppState["intakes"]>(row[5], []));
  }
  return { supplements, intakes };
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

/**
 * Converts a two-column key/value Sheet range (with a header row) into a Map.
 * Row 1 (the header) is skipped. Empty key cells are skipped.
 */
function kvToMap(rows: string[][]): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of rows.slice(1)) {
    if (row[0]) m.set(row[0], row[1] ?? "");
  }
  return m;
}