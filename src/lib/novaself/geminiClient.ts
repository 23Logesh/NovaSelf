const BASE = "https://generativelanguage.googleapis.com/v1beta";
let workingModel: string | null = null;
let cachedModels: string[] | null = null;
// flash first: flash-lite is faster but picks tools/args worse. Swap the order if it feels slow.
const PRIMARY = ["gemini-flash-latest", "gemini-flash-lite-latest"];

export interface Attachment {
  name: string;
  kind: "image" | "pdf" | "text" | "sheet";
  mimeType?: string;
  base64?: string; // images and pdf
  text?: string;   // text/csv/json/xlsx converted to text
  thumb?: string;  // small data URL for the chat bubble only
}
export interface Turn { role: "user" | "model"; parts: any[] }

export interface RunOpts {
  apiKey: string;
  systemText: string;
  history: Turn[];
  userText: string;
  attachments?: Attachment[];
  tools?: any[]; // functionDeclarations
  executeTool?: (name: string, args: Record<string, any>) => Record<string, unknown>;
  onAction?: (name: string, args: Record<string, any>, result: Record<string, unknown>) => void;
  preferredModel?: string;
  maxSteps?: number;
}

const versionKey = (name: string) =>
  (name.match(/gemini-(\d+(?:\.\d+)*)-flash/)?.[1] ?? "0").split(".").map(Number);
const cmp = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
};

async function http(apiKey: string, url: string, body?: unknown): Promise<[number, string]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { "x-goog-api-key": apiKey.trim(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    return [res.status, await res.text()];
  } catch (e) {
    return [0, String(e)];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchModels(apiKey: string): Promise<string[]> {
  if (cachedModels) return cachedModels;
  const [code, body] = await http(apiKey, `${BASE}/models?pageSize=100`);
  if (code !== 200) return [];
  const arr: any[] = JSON.parse(body).models ?? [];
  cachedModels = arr
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => String(m.name).replace("models/", ""))
    .filter((nm) => /^gemini-\d+(\.\d+)*-flash$/.test(nm))
    .sort((a, b) => cmp(versionKey(b), versionKey(a)))
    .slice(0, 3);
  return cachedModels;
}

async function callOnce(apiKey: string, model: string, payload: any): Promise<[number, string]> {
  const url = `${BASE}/models/${model}:generateContent`;
  let res = await http(apiKey, url, { ...payload, generationConfig: { thinkingConfig: { thinkingLevel: "low" } } });
  if (res[0] === 400) res = await http(apiKey, url, payload); // some models reject thinkingConfig
  return res;
}

async function callWithFallback(apiKey: string, payload: any, preferred?: string): Promise<any> {
  const first = [workingModel, preferred && !preferred.includes("1.5") ? preferred : null, ...PRIMARY]
    .filter(Boolean) as string[];
  let lastError = "no models available";
  let tried = new Set<string>();

  const attemptList = async (list: string[]) => {
    for (const model of list) {
      if (tried.has(model)) continue;
      tried.add(model);
      for (let attempt = 0; attempt < 3; attempt++) {
        const [code, body] = await callOnce(apiKey, model, payload);
        if (code === 200) { workingModel = model; return JSON.parse(body); }
        lastError = `${model}: ${code} ${body.slice(0, 300)}`;
        if (code === 503 || code === 429 || code === 0) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue; // retry same model
        }
        break; // 400/403/404 etc: next model
      }
    }
    return null;
  };

  const r1 = await attemptList(first);
  if (r1) return r1;
  const r2 = await attemptList(await fetchModels(apiKey));
  if (r2) return r2;
  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

function userParts(text: string, atts: Attachment[]): any[] {
  const parts: any[] = [];
  for (const a of atts) {
    if (a.base64 && a.mimeType) parts.push({ inlineData: { mimeType: a.mimeType, data: a.base64 } });
    else if (a.text) parts.push({ text: `[Attached file: ${a.name}]\n${a.text}` });
  }
  parts.push({ text: text || "(see attachment)" });
  return parts;
}

export async function runGemini(o: RunOpts): Promise<string> {
  const contents: Turn[] = [...o.history, { role: "user", parts: userParts(o.userText, o.attachments ?? []) }];
  const maxSteps = o.maxSteps ?? 6;

  for (let step = 0; step < maxSteps; step++) {
    const payload: any = {
      systemInstruction: { parts: [{ text: o.systemText }] },
      contents,
      ...(o.tools?.length ? { tools: [{ functionDeclarations: o.tools }] } : {}),
    };
    const data = await callWithFallback(o.apiKey, payload, o.preferredModel);
    const cand = data.candidates?.[0];
    const parts: any[] = cand?.content?.parts ?? [];

    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length || !o.executeTool) {
      const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim();
      if (text) return text;
      if (data.promptFeedback?.blockReason) return `Blocked by Gemini safety filter (${data.promptFeedback.blockReason}).`;
      return cand?.finishReason && cand.finishReason !== "STOP" ? `No reply (${cand.finishReason}).` : "No reply, try again.";
    }

    // keep the model turn EXACTLY as received (thought signatures must survive)
    contents.push({ role: "model", parts });
    const responses = calls.map((p) => {
      const { name, args, id } = p.functionCall;
      const result = o.executeTool!(name, args ?? {});
      o.onAction?.(name, args ?? {}, result);
      return { functionResponse: { name, ...(id ? { id } : {}), response: result } };
    });
    contents.push({ role: "user", parts: responses });
  }
  return "I ran several actions but stopped before finishing. Check the app data and ask me to continue.";
}

export function toHistory(chat: { role: "user" | "assistant"; content: string }[]): Turn[] {
  const out: Turn[] = [];
  for (const m of chat.slice(-20)) {
    if (m.content.startsWith("❌")) continue;
    const role: "user" | "model" = m.role === "user" ? "user" : "model";
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n" + m.content;
    else out.push({ role, parts: [{ text: m.content }] });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (out.length && out[out.length - 1].role === "user") out.pop();
  return out;
}
