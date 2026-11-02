import * as XLSX from "xlsx";
import type { Attachment } from "./geminiClient";

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 60000;

async function imageToJpeg(file: File, max: number, quality: number): Promise<{ b64: string; dataUrl: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", quality);
  return { b64: dataUrl.split(",")[1], dataUrl };
}

const toB64 = (buf: ArrayBuffer) => {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function fileToAttachment(file: File): Promise<Attachment> {
  const name = file.name || "file";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (file.type.startsWith("image/")) {
    const full = await imageToJpeg(file, 1280, 0.8);
    const thumb = await imageToJpeg(file, 160, 0.6);
    return { name, kind: "image", mimeType: "image/jpeg", base64: full.b64, thumb: thumb.dataUrl };
  }
  if (file.type === "application/pdf" || ext === "pdf") {
    if (file.size > MAX_PDF_BYTES) throw new Error("PDF too large (max 15 MB)");
    return { name, kind: "pdf", mimeType: "application/pdf", base64: toB64(await file.arrayBuffer()) };
  }
  if (["xlsx", "xls", "xlsm"].includes(ext)) {
    const wb = XLSX.read(await file.arrayBuffer());
    const text = wb.SheetNames.map((n) => `## Sheet: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join("\n\n");
    return { name, kind: "sheet", text: text.slice(0, MAX_TEXT_CHARS) };
  }
  if (file.type.startsWith("text/") || ["txt", "csv", "tsv", "json", "md", "log"].includes(ext)) {
    return { name, kind: "text", text: (await file.text()).slice(0, MAX_TEXT_CHARS) };
  }
  throw new Error(`Unsupported file type: ${ext || file.type}`);
}
