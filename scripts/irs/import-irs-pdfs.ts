import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "../lib/load-env";
import { logSupabaseError } from "../lib/supabase-error";

type IrsReturnType = "990" | "990EZ" | "990PF" | "990N" | "unknown";
type PersonRole =
  | "officer"
  | "director"
  | "trustee"
  | "key_employee"
  | "highest_compensated"
  | "independent_contractor"
  | "other";
type NarrativeSection =
  | "part_iii"
  | "schedule_o"
  | "schedule_d"
  | "schedule_a"
  | "other";

type OcrResult = { text: string; pngPath: string };
type OcrRegion = { x: number; y: number; w: number; h: number };
type PageTargets = {
  header: number;
  balance: number;
  part7: number;
  narrative: number;
};
type PdfConfig = {
  file: string;
  pages?: Partial<PageTargets>;
  returnType?: IrsReturnType;
};
type SourceMapEntry = {
  pdf: string;
  page: number;
  png: string;
  derived_from?: string[];
};

type Args = {
  env?: string;
  file?: string;
};

const DEFAULT_PAGES: PageTargets = {
  header: 1,
  balance: 11,
  part7: 7,
  narrative: 13,
};
const EIN_REGION: OcrRegion = { x: 1200, y: 0, w: 800, h: 500 };
const PDF_DIR = path.resolve(process.cwd(), "scripts/irs/pdfs");
const PDF_OVERRIDES: Record<string, Omit<PdfConfig, "file">> = {};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--env") {
      args.env = argv[i + 1];
      i += 1;
    } else if (token === "--file") {
      args.file = argv[i + 1];
      i += 1;
    } else if (token.startsWith("--env=")) {
      args.env = token.slice("--env=".length);
    } else if (token.startsWith("--file=")) {
      args.file = token.slice("--file=".length);
    }
  }
  return args;
}

function envFilesFor(envName: string): string[] {
  const normalized = envName.trim().toLowerCase();
  if (normalized === "test") return [".env.test.local", ".env.test"];
  if (
    normalized === "local" || normalized === "dev" ||
    normalized === "development"
  ) {
    return [".env.local", ".env.development.local", ".env.development"];
  }
  if (normalized === "prod" || normalized === "production") {
    return [".env.production.local", ".env.production"];
  }
  return [`.env.${normalized}.local`, `.env.${normalized}`];
}

function loadEnvFromArgs(args: Args): void {
  if (!args.env) return;
  const loaded = loadEnvFiles(envFilesFor(args.env));
  if (loaded.length > 0) {
    console.log(`Loaded env: ${loaded.join(", ")}`);
  } else {
    console.warn(`No env files found for --env ${args.env}`);
  }
}

function loadPdfConfigs(dir: string, onlyFile?: string): PdfConfig[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing PDF directory: ${dir}`);
  }
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No PDF files found in ${dir}`);
  }

  if (onlyFile) {
    const trimmed = onlyFile.trim();
    if (!trimmed) {
      throw new Error("Expected --file <filename.pdf>");
    }
    const target = trimmed.toLowerCase().endsWith(".pdf")
      ? trimmed
      : `${trimmed}.pdf`;
    const matched = files.find((file) => file === target) ??
      files.find((file) => file.toLowerCase() === target.toLowerCase());
    if (!matched) {
      throw new Error(
        `PDF not found: ${target}. Available: ${files.join(", ")}`,
      );
    }
    return [
      {
        file: matched,
        ...(PDF_OVERRIDES[matched] ?? {}),
      },
    ];
  }

  return files.map((file) => ({
    file,
    ...(PDF_OVERRIDES[file] ?? {}),
  }));
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  }
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceKey };
}

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] })
    .toString(
      "utf8",
    );
}

function normalizeOcr(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderPdfPageToPng(
  pdfPath: string,
  page: number,
  dpi?: number,
): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "irs-ocr-"));
  const prefix = path.join(tmpDir, "page");
  const args = [];
  if (dpi && Number.isFinite(dpi)) {
    args.push("-r", String(dpi));
  }
  args.push("-f", String(page), "-l", String(page), "-png", pdfPath, prefix);
  sh("pdftoppm", args);

  const expected = `${prefix}-${page}.png`;
  if (fs.existsSync(expected)) {
    return expected;
  }

  const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".png"));
  if (files.length === 0) {
    throw new Error(`pdftoppm produced no PNG for page ${page}: ${pdfPath}`);
  }
  return path.join(tmpDir, files[0]);
}

function ocrPdfPage(pdfPath: string, page: number): OcrResult {
  const pngPath = renderPdfPageToPng(pdfPath, page);
  const text = sh("tesseract", [pngPath, "stdout", "-l", "eng"]);
  return { text: normalizeOcr(text), pngPath };
}

function ocrPdfPageDpi(pdfPath: string, page: number, dpi: number): string {
  const pngPath = renderPdfPageToPng(pdfPath, page, dpi);
  const text = sh("tesseract", [pngPath, "stdout", "-l", "eng"]);
  return normalizeOcr(text);
}

function ocrPdfPageDpiResult(
  pdfPath: string,
  page: number,
  dpi: number,
): OcrResult {
  const pngPath = renderPdfPageToPng(pdfPath, page, dpi);
  const text = sh("tesseract", [pngPath, "stdout", "-l", "eng"]);
  return { text: normalizeOcr(text), pngPath };
}

function pdfTextPage(pdfPath: string, page: number): string | null {
  try {
    const out = sh("pdftotext", [
      "-f",
      String(page),
      "-l",
      String(page),
      "-layout",
      pdfPath,
      "-",
    ]);
    const normalized = normalizeOcr(out);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

function getPdfPageCount(pdfPath: string): number {
  const out = sh("pdfinfo", [pdfPath]);
  const match = out.match(/Pages:\s+(\d+)/i);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

function findPageContaining(
  pdfPath: string,
  needle: RegExp,
  maxPages?: number,
): number | null {
  const pages = maxPages ?? getPdfPageCount(pdfPath);
  if (!pages) return null;
  for (let p = 1; p <= pages; p += 1) {
    const text = ocrPdfPageDpi(pdfPath, p, 150);
    if (needle.test(text)) return p;
  }
  return null;
}

function ocrPdfPageRegion(
  pdfPath: string,
  page: number,
  region: OcrRegion,
): OcrResult | null {
  const pngPath = renderPdfPageToPng(pdfPath, page);
  const cropped = path.join(path.dirname(pngPath), `page-${page}-crop.png`);
  try {
    sh("magick", [
      pngPath,
      "-crop",
      `${region.w}x${region.h}+${region.x}+${region.y}`,
      cropped,
    ]);
    const text = sh("tesseract", [cropped, "stdout", "-l", "eng"]);
    return { text: normalizeOcr(text), pngPath: cropped };
  } catch (error) {
    console.warn(
      `WARN: OCR crop failed for ${path.basename(pdfPath)} page ${page}: ${
        String(error)
      }`,
    );
    return null;
  }
}

function findEIN(text: string): string | null {
  const cleaned = text
    .replace(/[—–]/g, "-")
    .replace(/l/g, "1")
    .replace(/O/g, "0")
    .replace(/\s+/g, " ");

  let match = cleaned.match(/\bEIN[:\s]*([0-9]{2}\s*-?\s*[0-9]{7})\b/i) ||
    cleaned.match(/\bEIN[:\s]*([0-9]{9})\b/i);

  if (match) {
    const raw = match[1].replace(/\s+/g, "");
    return raw.includes("-") ? raw : `${raw.slice(0, 2)}-${raw.slice(2)}`;
  }

  const head = cleaned.slice(0, 2000);
  match = head.match(/\b([0-9]{2}\s*-?\s*[0-9]{7})\b/);
  if (match) {
    return match[1].replace(/\s+/g, "");
  }

  return null;
}

function findReturnType(text: string): IrsReturnType | null {
  if (/Form\s+990\s*EZ/i.test(text) || /Form\s+990EZ/i.test(text)) {
    return "990EZ";
  }
  if (/Form\s+990\s*PF/i.test(text) || /Form\s+990PF/i.test(text)) {
    return "990PF";
  }
  if (/Form\s+990\s*N/i.test(text) || /Form\s+990N/i.test(text)) return "990N";
  if (/Form\s+990\b/i.test(text)) return "990";
  return null;
}

function findTaxYear(text: string): number | null {
  const years = Array.from(text.matchAll(/\b(20[0-9]{2})\b/g)).map((m) =>
    Number(m[1])
  );
  if (years.length === 0) return null;
  const freq = new Map<number, number>();
  for (const y of years) freq.set(y, (freq.get(y) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function normalizeDate(d: string): string {
  const parts = d.replace(/-/g, "/").split("/");
  if (parts.length !== 3) return d;
  let [mm, dd, yy] = parts;
  if (yy.length === 2) yy = `20${yy}`;
  const m = String(mm).padStart(2, "0");
  const day = String(dd).padStart(2, "0");
  return `${yy}-${m}-${day}`;
}

function findTaxPeriod(text: string): { start?: string; end?: string } {
  const normalized = text.replace(/[—–]/g, "-").replace(/\s+/g, " ");
  const m = normalized.match(
    /tax year beginning\s+([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})\s*(?:,)?\s*and ending\s+([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/i,
  );
  if (!m) return {};
  return { start: normalizeDate(m[1]), end: normalizeDate(m[2]) };
}

function extractNameFromAdditionalData(text: string): string | null {
  const lines = text.split("\n").map((line) => line.trim());
  const idx = lines.findIndex((line) => /^Name:\s*/i.test(line));
  if (idx === -1) return null;

  const parts: string[] = [];
  const first = lines[idx].replace(/^Name:\s*/i, "").trim();
  if (first) parts.push(first);

  for (let i = idx + 1; i < Math.min(idx + 8, lines.length); i += 1) {
    const line = lines[i];
    if (!line) break;
    if (/^Form\s+990\b/i.test(line)) break;
    if (/^EIN[:\s]/i.test(line)) break;
    parts.push(line);
  }

  const joined = parts.join(" ").replace(/\s{2,}/g, " ").trim();
  return joined.length >= 3 ? joined : null;
}

function normalizeOrgDisplayName(name: string): string {
  return name.replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function looksJunkyName(name: string): boolean {
  const lowered = name.toLowerCase();
  return (
    lowered.includes("check if applicable") ||
    lowered.includes("software id") ||
    lowered.includes("form 990") ||
    lowered.startsWith("ein") ||
    lowered.length < 3
  );
}

function pickBestDisplayName(
  existing: string | null,
  candidate: string | null,
): string | null {
  const normalizedExisting = existing
    ? normalizeOrgDisplayName(existing)
    : null;
  const normalizedCandidate = candidate
    ? normalizeOrgDisplayName(candidate)
    : null;

  const candidates = [normalizedExisting, normalizedCandidate]
    .filter((value): value is string =>
      Boolean(value) && !looksJunkyName(value)
    )
    .sort((a, b) => a.length - b.length);

  return candidates[0] ?? null;
}

function findOrgName(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const idx = lines.findIndex((line) => /name of organization/i.test(line));
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(idx + 6, lines.length); i += 1) {
      const cand = lines[i];
      if (
        cand.length > 6 &&
        !/address|city|state|zip|employer identification/i.test(cand)
      ) {
        return cand
          .replace(/^B\s+Check\s+if\s+applicable:\s*/i, "")
          .replace(/^C\s+Name\s+of\s+organization\s*/i, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      }
    }
  }

  const header = lines.slice(0, 12).join(" ");
  const match = header.match(
    /Return of Organization Exempt.*?\s+([A-Z][A-Z0-9 &.'-]{8,})\s+/,
  );
  return match?.[1]?.trim() ?? null;
}

function findCityState(text: string): { city?: string; state?: string } {
  const m = text.match(/\b([A-Za-z][A-Za-z .'-]{2,}),\s*(MN|Minnesota)\b/);
  if (!m) return {};
  return { city: m[1].trim(), state: "MN" };
}

function moneyFromLine(text: string, labelRegex: RegExp): number | null {
  const lines = text.split("\n");
  for (const line of lines) {
    if (!labelRegex.test(line)) continue;
    const nums = line.match(/-?\$?\s*\(?[0-9][0-9,]*\)?\b/g);
    if (!nums || nums.length === 0) continue;
    const raw = nums[nums.length - 1];
    const isNegative = /\(.*\)/.test(raw);
    const cleaned = raw.replace(/[^0-9-]/g, "");
    if (!cleaned) continue;
    const value = Number(cleaned);
    if (Number.isNaN(value)) continue;
    return isNegative ? -Math.abs(value) : value;
  }
  return null;
}

type ExtractedPerson = {
  role: PersonRole;
  name: string;
  title?: string;
  hours?: number;
  reportable_comp?: number;
};

const BAD_NAME_PHRASES = [
  "any hours",
  "average hours",
  "name and title",
  "reportable compensation",
  "position",
  "officer",
  "director",
  "trustee",
  "board member",
  "section a",
  "section b",
  "independent contractors",
  "internal revenue",
  "service",
  "key employee",
  "highest compensated",
  "independent contractor",
  "form 990",
  "part vii",
];

function looksLikeHeader(value: string): boolean {
  const lowered = value.toLowerCase();
  return BAD_NAME_PHRASES.some((phrase) => lowered.includes(phrase));
}

function looksLikePersonName(name: string): boolean {
  const cleaned = name
    .replace(/[^A-Za-z .'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  const good = tokens.filter((token) => /^[A-Za-z][A-Za-z.'-]*$/.test(token));
  return good.length >= 2;
}

function extractTrailingHours(
  nameOrLine: string,
): { name: string; hours?: number } {
  const trimmed = nameOrLine.trim();
  // Accept `7`, `7.`, `7.0`, `7.00` etc. at the end of the string.
  const match = trimmed.match(
    /^(.*?)(?:\s+([0-9]{1,3}(?:\.[0-9]{0,2})?))\s*$/,
  );
  if (!match) return { name: trimmed };

  const rawHours = match[2].endsWith(".") ? `${match[2]}0` : match[2];
  const maybeHours = Number(rawHours);
  if (Number.isFinite(maybeHours) && maybeHours >= 0 && maybeHours <= 168) {
    return { name: match[1].trim(), hours: maybeHours };
  }
  return { name: trimmed };
}

function normalizePersonName(raw: string): string {
  let name = raw.replace(/\s+/g, " ").trim();
  name = name.replace(/^Here\s+/i, "");
  name = name
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z.'-]+$/g, "")
    .trim();
  return name;
}

function isLikelyTitle(value: string): boolean {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (looksLikeHeader(normalized)) return false;
  if (normalized.length > 80) return false;
  if (/(.)\1{4,}/.test(normalized)) return false;
  if (/e{3,}/i.test(normalized)) return false;
  const garbledChars = (normalized.match(/[|[\]{}<>]/g) ?? []).length;
  if (garbledChars >= 2) return false;

  const letters = (normalized.match(/[A-Za-z]/g) ?? []).length;
  const nonLetters = (normalized.match(/[^A-Za-z\s.'-]/g) ?? []).length;
  if (letters < 3) return false;
  if (nonLetters > letters) return false;

  return true;
}

const TITLE_SUFFIXES: Array<{ re: RegExp; title: string }> = [
  { re: /\bVICE\s+PRESIDENT$/i, title: "Vice President" },
  { re: /\bBOARD\s+MEMBER$/i, title: "Board Member" },
  { re: /\bPRESIDENT$/i, title: "President" },
  { re: /\bTREASURER$/i, title: "Treasurer" },
  { re: /\bSECRETARY$/i, title: "Secretary" },
  { re: /\bCHAIR$/i, title: "Chair" },
  { re: /\bDIRECTOR$/i, title: "Director" },
  { re: /\bTRUSTEE$/i, title: "Trustee" },
  { re: /\bMEMBER$/i, title: "Member" },
];

function splitNameTitle(cell: string): { name: string; title?: string } {
  const s = cell.replace(/\s+/g, " ").trim();
  for (const { re, title } of TITLE_SUFFIXES) {
    if (re.test(s)) {
      const name = s.replace(re, "").trim();
      if (name.length >= 3) return { name, title };
    }
  }
  return { name: s };
}

function extractBoardPeople(part7Text: string): ExtractedPerson[] {
  // Keep layout spacing (multiple spaces) because pdftotext -layout uses it to represent columns.
  const lines = part7Text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim().length > 0);

  const matchLine = (line: string, regex: RegExp) =>
    regex.test(line.replace(/\s+/g, " ").trim());
  const sectionStartRegex =
    /(A\)\s*Name\s+and\s+title|Section\s+A\.\s+Governing\s+Body|Part\s+IV\s*[—-]?\s*List\s+of\s+Officers|List\s+of\s+Officers,\s*Directors,\s*Trustees,\s*and\s*Key\s+Employees)/i;
  const sectionStopRegex =
    /(Section\s+B\.\s+Independent\s+Contractors|Part\s+VIII\b|Schedule\s+J\b|Paid\s+Preparer\b|Under\s+penalties\s+of\s+perjury\b)/i;
  let sectionStart = lines.findIndex((line) =>
    matchLine(line, sectionStartRegex)
  );
  if (sectionStart < 0) sectionStart = 0;
  let sectionEnd = lines.length;
  for (let i = sectionStart + 1; i < lines.length; i += 1) {
    if (matchLine(lines[i], sectionStopRegex)) {
      sectionEnd = i;
      break;
    }
  }
  const sectionLines = lines.slice(sectionStart, sectionEnd);

  const people: ExtractedPerson[] = [];

  const headerSkip = (line: string) =>
    /Part\s+(?:VII|IV)|Name\s+and\s+title|Average\s+hours|Reportable\s+compensation|Health\s+benefits|Estimated\s+amount\s+of\s+other\s+compensation|Position\s*\(/i
      .test(line);

  const titleClassRole = (title?: string): PersonRole => {
    if (!title) return "other";
    if (/director|trustee|board\s+member|member|chair/i.test(title)) {
      return "director";
    }
    if (/president|treasurer|secretary|officer|vice/i.test(title)) {
      return "officer";
    }
    return "other";
  };

  // First pass: handle the common format:
  //   (1) NAME<spaces>HOURS<spaces>...
  //   TITLE
  for (let i = 0; i < sectionLines.length; i += 1) {
    const line = sectionLines[i];
    if (headerSkip(line)) continue;

    const m = line.match(/^\s*\((\d+)\)\s+(.+)$/);
    if (!m) continue;

    // Prefer name from the first column in -layout output.
    const remainder = m[2].replace(/\s+$/g, "");
    const cols = remainder.split(/\s{2,}/).filter(Boolean);
    const nameCol = cols[0] ?? remainder;

    const trailing = extractTrailingHours(nameCol);
    const split = splitNameTitle(trailing.name);
    const name = normalizePersonName(split.name);
    let hours = trailing.hours;
    for (const col of cols.slice(1)) {
      const found = col.match(/\b([0-9]{1,3}(?:\.[0-9]{1,2})?)\b/);
      if (!found) continue;
      const candidate = Number(found[1]);
      if (Number.isFinite(candidate) && candidate >= 0 && candidate <= 168) {
        hours = candidate;
        break;
      }
    }
    if (hours == null) {
      const found = remainder.match(/\b([0-9]{1,3}(?:\.[0-9]{1,2})?)\b/);
      if (found) {
        const candidate = Number(found[1]);
        if (Number.isFinite(candidate) && candidate >= 0 && candidate <= 168) {
          hours = candidate;
        }
      }
    }

    if (!name || looksLikeHeader(name) || !looksLikePersonName(name)) continue;

    // Title is usually the next non-empty line (990) OR part of the same cell (990EZ).
    let titleLine: string | null = split.title ?? null;
    if (!titleLine) {
      for (let j = i + 1; j < Math.min(i + 5, sectionLines.length); j += 1) {
        const cand = sectionLines[j];
        if (!cand || cand.trim().length === 0) break;
        if (/^\s*\(\d+\)\s+/.test(cand)) break; // next row started
        if (headerSkip(cand)) continue;

        const left = cand.split(/\s{2,}/)[0]?.trim() ?? cand.trim();
        // Stop if the "title" line is actually checkbox/0 columns bleeding in.
        if (/^(?:x|0)+$/i.test(left)) continue;
        titleLine = left;
        break;
      }
    }

    const titleFromLine = titleLine && isLikelyTitle(titleLine)
      ? titleLine
      : undefined;
    const title = titleFromLine ??
      (split.title && isLikelyTitle(split.title) ? split.title : undefined);
    const role = titleClassRole(title);

    people.push({ role, name, title, hours });
  }

  // Second pass: salvage titles that appear on the same line (common in OCR) e.g. "NAME TITLE".
  // Only trust titles that look like real job titles and are not mostly noise.
  for (const line of sectionLines) {
    if (headerSkip(line) || /^\s*\(\d+\)\s+/.test(line)) continue;

    const compact = line.replace(/\s+/g, " ").trim();
    const split = splitNameTitle(compact);
    if (split.title) {
      const name = normalizePersonName(split.name);
      if (!looksLikePersonName(name)) continue;
      const title = isLikelyTitle(split.title) ? split.title : undefined;
      if (!title) continue;
      people.push({ role: titleClassRole(title), name, title });
      continue;
    }
    const m = compact.match(
      /^([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,4})\s+(.{3,40})$/,
    );
    if (!m) continue;

    const name = normalizePersonName(m[1]);
    const titleCand = m[2].trim();
    if (!looksLikePersonName(name)) continue;
    if (!isLikelyTitle(titleCand)) continue;

    people.push({ role: titleClassRole(titleCand), name, title: titleCand });
  }

  // De-dupe
  const seen = new Set<string>();
  return people
    .filter((person) => {
      const key = `${person.name}|${person.title ?? ""}|${person.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function reconcileNetAssets(
  totalAssetsEnd: number | null,
  totalLiabEnd: number | null,
  netAssetsEnd: number | null,
): { value: number | null; derived: boolean } {
  if (totalAssetsEnd != null && totalLiabEnd != null) {
    const derived = totalAssetsEnd - totalLiabEnd;
    if (netAssetsEnd == null || netAssetsEnd !== derived) {
      return { value: derived, derived: true };
    }
  }
  return { value: netAssetsEnd, derived: false };
}

function resolvePages(pages?: Partial<PageTargets>): PageTargets {
  return { ...DEFAULT_PAGES, ...(pages ?? {}) };
}

function isTransientNetworkError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  return (
    msg.includes("fetch failed") ||
    msg.includes("EPIPE") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("socket hang up") ||
    msg.includes("network")
  );
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isTransient = isTransientNetworkError(err);

      if (!isTransient || attempt === retries) {
        console.warn(
          `WARN: ${label} failed (attempt ${attempt + 1}/${retries + 1})`,
        );
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `WARN: ${label} transient error (attempt ${attempt + 1}/${
          retries + 1
        }); retrying in ${delay}ms: ${String((err as any)?.message ?? err)}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Should never get here.
  throw lastErr;
}

async function withRetrySupabase<T extends { error?: any }>(
  label: string,
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  return withRetry(label, async () => {
    const res = await fn();
    // Supabase often resolves with { error } rather than throwing.
    if (
      res && (res as any).error && isTransientNetworkError((res as any).error)
    ) {
      throw (res as any).error;
    }
    return res;
  }, opts);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFromArgs(args);

  const { url, serviceKey } = getSupabaseEnv();
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const irs = supabase.schema("irs");

  const pdfConfigs = loadPdfConfigs(PDF_DIR, args.file);
  for (const config of pdfConfigs) {
    const pdfPath = path.join(PDF_DIR, config.file);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Missing PDF: ${pdfPath}`);
    }
  }

  for (const config of pdfConfigs) {
    const pdfPath = path.join(PDF_DIR, config.file);
    const baseName = path.basename(pdfPath);
    const pages = resolvePages(config.pages);

    console.log(`\n--- Importing: ${baseName} ---`);

    const headerFull = ocrPdfPage(pdfPath, pages.header);
    const headerRegion = ocrPdfPageRegion(pdfPath, pages.header, EIN_REGION);
    const header: OcrResult = {
      text: [headerFull.text, headerRegion?.text].filter(Boolean).join("\n"),
      pngPath: headerFull.pngPath,
    };
    const balance = ocrPdfPage(pdfPath, pages.balance);
    const narrativePage = findPageContaining(
      pdfPath,
      /\bAdditional\s+Data\b/i,
    ) ??
      findPageContaining(
        pdfPath,
        /Part\s+III\b[\s\S]{0,200}Statement\s+of\s+Program\s+Service/i,
      ) ??
      pages.narrative;
    const narrative = ocrPdfPage(pdfPath, narrativePage);

    const peopleNeedle =
      /(Part\s+IV\b[\s\S]{0,200}List\s+of\s+Officers)|(List\s+of\s+Officers,\s*Directors,\s*Trustees,\s*and\s*Key\s+Employees)|(\(A\)\s*Name\s+and\s+title[\s\S]{0,200}\(B\)\s*Average\s+hours)/i;
    const part7Page = findPageContaining(pdfPath, peopleNeedle) ??
      findPageContaining(pdfPath, /\bPart\s+(?:IV|VII)\b/i);
    let part7Result: OcrResult | null = null;
    let part7Text = "";
    if (part7Page) {
      const pageText = pdfTextPage(pdfPath, part7Page);
      if (pageText && pageText.length > 200) {
        part7Text = pageText;
        part7Result = ocrPdfPageDpiResult(pdfPath, part7Page, 300);
      } else {
        part7Result = ocrPdfPageDpiResult(pdfPath, part7Page, 350);
        part7Text = part7Result.text;
      }

      const pagesInPdf = getPdfPageCount(pdfPath);
      for (
        let p = part7Page + 1;
        p <= Math.min(part7Page + 2, pagesInPdf);
        p += 1
      ) {
        const nextText = pdfTextPage(pdfPath, p) ??
          ocrPdfPageDpi(pdfPath, p, 200);
        if (!nextText) continue;

        const looksLikeContinuation =
          /\(A\)\s*Name\s+and\s+title/i.test(nextText) ||
          /^\(\d+\)\s+[A-Z]/m.test(nextText);
        if (looksLikeContinuation) {
          part7Text = `${part7Text}\n\n${nextText}`;
        }
      }
    } else {
      console.log(`WARN: Could not locate people page in ${baseName}`);
    }

    const ein = findEIN(header.text) ?? findEIN(balance.text) ??
      findEIN(part7Text);
    if (!ein) {
      console.error("OCR HEADER TEXT:\n", header.text.slice(0, 1500));
      throw new Error(`Could not find EIN in ${path.basename(pdfPath)}`);
    }

    let headerText = header.text;
    let period = findTaxPeriod(narrative.text);
    if (!period.start || !period.end) {
      period = findTaxPeriod(headerText);
    }
    if (!period.start || !period.end) {
      const hi = ocrPdfPageDpi(pdfPath, pages.header, 300);
      headerText = `${headerText}\n${hi}`;
      period = findTaxPeriod(headerText);
      if (!period.start || !period.end) {
        console.log(
          `WARN: Could not parse tax period for ${
            path.basename(pdfPath)
          }. Showing header snippet:`,
        );
        const idx = headerText.toLowerCase().indexOf("tax year");
        const start = idx >= 0 ? Math.max(0, idx - 200) : 0;
        const end = idx >= 0 ? idx + 400 : 600;
        console.log(headerText.slice(start, end));
      }
    }

    const taxYear = findTaxYear(header.text) ?? findTaxYear(balance.text);
    if (!taxYear) throw new Error(`Could not find tax year in ${pdfPath}`);

    const nameFromNarrative = extractNameFromAdditionalData(narrative.text);
    const orgName = nameFromNarrative ?? findOrgName(header.text) ??
      `EIN ${ein}`;
    const { city, state } = findCityState(header.text);

    const existingOrg = await withRetrySupabase(
      `Read irs.organizations ${ein}`,
      () =>
        irs
          .from("organizations")
          .select("ein, legal_name, city, state")
          .eq("ein", ein)
          .maybeSingle(),
    );
    if (existingOrg.error) {
      logSupabaseError("Read irs.organizations failed", existingOrg.error);
      throw existingOrg.error;
    }

    const displayName = pickBestDisplayName(
      existingOrg.data?.legal_name ?? null,
      nameFromNarrative ?? orgName,
    );
    const nextLegalName = displayName ?? existingOrg.data?.legal_name ??
      orgName;

    {
      const { error } = await withRetrySupabase(
        `Upsert irs.organizations ${ein}`,
        () =>
          irs.from("organizations").upsert(
            {
              ein,
              legal_name: nextLegalName,
              city: city ?? existingOrg.data?.city ?? null,
              state: state ?? existingOrg.data?.state ?? null,
              country: "US",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "ein" },
          ),
      );
      if (error) {
        logSupabaseError("Upsert irs.organizations failed", error);
        throw error;
      }
    }

    const detectedReturnType = findReturnType(header.text);
    const returnType = config.returnType ?? detectedReturnType ?? "990";

    const returnRow = await withRetrySupabase(
      `Upsert irs.returns ${ein} ${returnType} ${taxYear}`,
      () =>
        irs
          .from("returns")
          .upsert(
            {
              ein,
              return_type: returnType,
              tax_year: taxYear,
              tax_period_start: period.start ?? null,
              tax_period_end: period.end ?? null,
              return_name: nameFromNarrative ?? null,
              source_system: "pdf_ocr",
            },
            { onConflict: "ein,return_type,tax_year" },
          )
          .select("id,ein,return_type,tax_year")
          .single(),
    );

    if (returnRow.error) {
      logSupabaseError("Upsert irs.returns failed", returnRow.error);
      throw returnRow.error;
    }
    if (!returnRow.data) {
      throw new Error(`Upsert irs.returns returned no data for ${ein}`);
    }

    if (!returnRow.data.id) {
      throw new Error(`Upsert irs.returns returned no id for ${ein}`);
    }
    const returnId = String(returnRow.data.id);

    const totalAssetsEnd = moneyFromLine(balance.text, /\bTotal assets\b/i);
    const totalLiabEnd = moneyFromLine(balance.text, /\bTotal liabilities\b/i);
    const netAssetsOcr = moneyFromLine(
      balance.text,
      /\bNet assets\b|\bfund balances\b/i,
    );
    const netAssets = reconcileNetAssets(
      totalAssetsEnd,
      totalLiabEnd,
      netAssetsOcr,
    );

    const totalRevenue = moneyFromLine(header.text, /\bTotal revenue\b/i);
    const totalExpenses = moneyFromLine(header.text, /\bTotal expenses\b/i);

    const sourceMap: Record<string, SourceMapEntry> = {
      total_revenue: { pdf: baseName, page: pages.header, png: header.pngPath },
      total_expenses: {
        pdf: baseName,
        page: pages.header,
        png: header.pngPath,
      },
      total_assets_end: {
        pdf: baseName,
        page: pages.balance,
        png: balance.pngPath,
      },
      total_liabilities_end: {
        pdf: baseName,
        page: pages.balance,
        png: balance.pngPath,
      },
      net_assets_end: {
        pdf: baseName,
        page: pages.balance,
        png: balance.pngPath,
        ...(netAssets.derived
          ? { derived_from: ["total_assets_end", "total_liabilities_end"] }
          : {}),
      },
    };

    {
      const { error } = await irs.from("return_financials").upsert(
        {
          return_id: returnId,
          total_revenue: totalRevenue ?? null,
          total_expenses: totalExpenses ?? null,
          total_assets_end: totalAssetsEnd ?? null,
          total_liabilities_end: totalLiabEnd ?? null,
          net_assets_end: netAssets.value ?? null,
          source_map: sourceMap,
        },
        { onConflict: "return_id" },
      );
      if (error) {
        logSupabaseError("Upsert irs.return_financials failed", error);
        throw error;
      }
    }

    {
      const people = extractBoardPeople(part7Text);
      const { error: deleteError } = await irs
        .from("return_people")
        .delete()
        .eq("return_id", returnId);
      if (deleteError) {
        logSupabaseError("Delete irs.return_people failed", deleteError);
        throw deleteError;
      }

      const validPeople = people.filter((person) => {
        if (!person.name) return false;
        if (looksLikeHeader(person.name)) return false;
        if (!looksLikePersonName(person.name)) return false;
        if (person.title && !isLikelyTitle(person.title)) return false;
        return true;
      });
      const enoughRows = validPeople.length >= 2;
      const ratio = people.length > 0 ? validPeople.length / people.length : 0;

      // Titles are optional (many PDFs omit them cleanly in text extraction),
      // but we should avoid inserting obviously-garbled rows.
      const withTitles = validPeople.filter((p) => Boolean(p.title)).length;
      const titleRatio = validPeople.length
        ? withTitles / validPeople.length
        : 0;

      // Accept when we have enough rows and at least some reasonable yield.
      // (OCR/pdftotext can produce extra junk lines; a lower ratio is fine as long as names are valid.)
      const okRatio = ratio >= 0.25;

      // If we have zero titles, that's fine, but require a bit more volume to be confident.
      const okNoTitles = titleRatio === 0 ? validPeople.length >= 6 : true;

      if (enoughRows && okRatio && okNoTitles && part7Result && part7Page) {
        const rows = validPeople.map((person) => ({
          return_id: returnId,
          role: person.role,
          name: person.name,
          title: person.title ?? null,
          average_hours_per_week: person.hours ?? null,
          reportable_compensation: person.reportable_comp ?? null,
          source_map: {
            pdf: baseName,
            page: part7Page,
            png: part7Result.pngPath,
          },
        }));

        const { error } = await irs.from("return_people").insert(rows);
        if (error) {
          logSupabaseError("Insert irs.return_people failed", error);
          throw error;
        }
      } else {
        console.log(
          `WARN: Skipping people insert; low confidence (${validPeople.length}/${people.length} valid, ratio=${
            ratio.toFixed(2)
          }) for ${ein} ${taxYear}`,
        );
      }
    }

    {
      const { error: deleteError } = await irs
        .from("return_narratives")
        .delete()
        .eq("return_id", returnId);
      if (deleteError) {
        logSupabaseError("Delete irs.return_narratives failed", deleteError);
        throw deleteError;
      }

      const narrativeSection: NarrativeSection = "part_iii";
      const { error } = await irs.from("return_narratives").insert([
        {
          return_id: returnId,
          section: narrativeSection,
          label: "Additional Data (Part III Line 4 narrative)",
          raw_text: narrative.text,
          extracted: {},
          ai_summary: null,
          source_map: {
            pdf: baseName,
            page: narrativePage,
            png: narrative.pngPath,
          },
        },
      ]);
      if (error) {
        logSupabaseError("Insert irs.return_narratives failed", error);
        throw error;
      }
    }

    console.log(
      `OK: Imported EIN ${ein} tax_year ${taxYear} return_id ${returnId}`,
    );
  }

  console.log("\nDone.");
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(err.stack ?? err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
