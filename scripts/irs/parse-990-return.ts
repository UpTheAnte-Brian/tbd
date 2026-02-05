/*
  Phase 2 — Deterministic XML -> normalized tables
  Minimal v1: Parse a single 990 XML into irs.return_financials

  Inputs
    --district <uuid>     Process all scoped EINs for a district (preferred)
    --returnId <uuid>     Read xml_path from irs.returns
    --xml <path>          Local path to *_public.xml
    --limit <n>           Optional cap on processed returns (district mode)
    --statuses <list>     Comma list; defaults to candidate,active (district mode)
    --dryRun              Skip writes; still parses XML

  Behavior
    - No network calls to fetch XML (reads from disk only)
    - Idempotent: upsert irs.return_financials by return_id

  Examples
    pnpm tsx scripts/irs/parse-990-return.ts --xml /path/to/123_public.xml --returnId <RETURN_UUID>
    pnpm tsx scripts/irs/parse-990-return.ts --returnId <RETURN_UUID>
    pnpm tsx scripts/irs/parse-990-return.ts --xml /path/to/123_public.xml   # will try to resolve return_id by xml_path
    pnpm tsx scripts/irs/parse-990-return.ts --district <DISTRICT_UUID>
    pnpm tsx scripts/irs/parse-990-return.ts --district <DISTRICT_UUID> --statuses active --limit 500 --dryRun
*/

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { formatEinDashed, normalizeEinInput } from "./lib/ein";

import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

let dotenvLoaded = false;
function tryLoadDotenvOnce() {
    if (dotenvLoaded) return;
    dotenvLoaded = true;
    try {
        const dotenv = require("dotenv");
        const cwd = process.cwd();
        dotenv.config({ path: path.join(cwd, ".env.local") });
        dotenv.config({ path: path.join(cwd, ".env") });
    } catch {
        // optional
    }
}

function mustGetEnv(name: string): string {
    tryLoadDotenvOnce();
    const direct = process.env[name];
    if (direct) return direct;

    const fallbacks: Record<string, string[]> = {
        NEXT_PUBLIC_SUPABASE_URL: ["SUPABASE_URL", "SUPABASE_PROJECT_URL"],
        SUPABASE_SERVICE_ROLE_KEY: [
            "SUPABASE_SERVICE_KEY",
            "SUPABASE_SERVICE_KEY_ROLE",
        ],
    };

    for (const k of fallbacks[name] || []) {
        const v = process.env[k];
        if (v) return v;
    }

    throw new Error(`Missing env var: ${name}`);
}

function createSupabaseAdmin() {
    const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
    return createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });
}

function parseCommaList(input: string | null | undefined): string[] {
    if (!input) return [];
    return String(input)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function looksLikeUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        .test(
            s,
        );
}

// Helper to resolve XML path on disk with env-based root fallback.
function resolveXmlPathOnDisk(
    xmlPathFromDb: string,
): { path: string | null; tried: string[] } {
    const tried: string[] = [];
    const direct = path.resolve(String(xmlPathFromDb || ""));
    tried.push(direct);
    if (direct && fs.existsSync(direct)) {
        return { path: direct, tried };
    }

    const root = process.env.IRS_TEOS_XML_ROOT ||
        process.env.IRS_XML_ROOT ||
        path.join(process.cwd(), "data", "irs-teos");
    if (!root) return { path: null, tried };

    const rootAbs = path.resolve(root);

    const base = path.basename(direct);
    const shardMatch = direct.match(
        /(?:^|[\\/])(\d{4}_TEOS_XML_[0-9A-Z]+)(?:[\\/]|$)/i,
    );
    if (base && shardMatch) {
        const shard = shardMatch[1];
        const year = shard.slice(0, 4);
        const candidate = path.join(rootAbs, "xml", year, shard, base);
        tried.push(candidate);
        if (fs.existsSync(candidate)) return { path: candidate, tried };
    }

    // If the stored path contains `/xml/`, preserve the relative structure after that.
    const marker = `${path.sep}xml${path.sep}`;
    const idx = direct.indexOf(marker);
    if (idx !== -1) {
        const rel = direct.slice(idx + marker.length);
        const candidate = path.join(rootAbs, rel);
        tried.push(candidate);
        if (fs.existsSync(candidate)) return { path: candidate, tried };
    }

    // Try last two segments (dir + filename)
    const parts = direct.split(path.sep).filter(Boolean);
    if (parts.length >= 2) {
        const candidate = path.join(
            rootAbs,
            parts[parts.length - 2],
            parts[parts.length - 1],
        );
        tried.push(candidate);
        if (fs.existsSync(candidate)) return { path: candidate, tried };
    }

    // Try basename only
    if (base) {
        const candidate = path.join(rootAbs, base);
        tried.push(candidate);
        if (fs.existsSync(candidate)) return { path: candidate, tried };
    }

    return { path: null, tried };
}

function parseArgs(argv: string[]) {
    const args: Record<string, string | boolean> = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith("--")) continue;
        const key = a.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            args[key] = true;
        } else {
            args[key] = next;
            i++;
        }
    }
    return args;
}

type ParsedFinancials = {
    total_revenue: number | null;
    total_expenses: number | null;
    contributions: number | null;
    net_assets_begin: number | null;
    net_assets_end: number | null;
    source_map: Record<string, { path: string; raw?: unknown } | null>;
};

type ParsedNarrative = {
    section: string;
    label: string | null;
    raw_text: string;
    extracted: Record<string, any>;
    source_map: Record<string, any>;
};

type ParsedPerson = {
    role: string;
    name: string;
    title: string | null;
    average_hours_per_week: number | null;
    reportable_compensation: number | null;
    other_compensation: number | null;
    is_current: boolean | null;
    source_map: Record<string, any>;
};

type ParsedRestriction = {
    restriction_type: string; // should match irs.irs_restriction_type enum
    summary: string;
    details: Record<string, any>;
    confidence: number | null;
    source_narrative_id: string | null;
};

type LoadedXml = {
    xml: string;
    doc: any | null;
    usedParser: boolean;
};

function safeTrimText(input: unknown): string {
    if (input == null) return "";
    const s = String(input).replace(/\s+/g, " ").trim();
    return s;
}

function coerceBoolOrNull(v: unknown): boolean | null {
    if (v == null) return null;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if (["1", "true", "t", "yes", "y"].includes(s)) return true;
    if (["0", "false", "f", "no", "n"].includes(s)) return false;
    return null;
}

function loadXmlDoc(xml: string): LoadedXml {
    // We try fast-xml-parser first for structured access, otherwise regex.
    let doc: any = null;
    let usedParser = false;

    try {
        const { XMLParser } = require("fast-xml-parser");
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            removeNSPrefix: true,
        });
        doc = parser.parse(xml);
        usedParser = true;
    } catch {
        usedParser = false;
    }

    return { xml, doc, usedParser };
}

function getArrayByPath(obj: any, p: string): any[] {
    const parts = p.split(".").filter(Boolean);
    let cur: any = obj;
    for (const part of parts) {
        if (cur == null) return [];
        cur = cur[part];
    }
    if (cur == null) return [];
    return Array.isArray(cur) ? cur : [cur];
}

function findFirstTextFromDoc(
    doc: any,
    paths: string[],
): { value: string; picked: string | null; raw?: unknown } {
    for (const p of paths) {
        const raw = getByPath(doc, p);
        const v = safeTrimText(raw);
        if (v) return { value: v, picked: p, raw };
    }
    return { value: "", picked: null };
}

function findAllTextCandidatesFromDoc(
    doc: any,
    paths: string[],
): Array<{ path: string; value: string; raw?: unknown }> {
    const out: Array<{ path: string; value: string; raw?: unknown }> = [];
    for (const p of paths) {
        const raw = getByPath(doc, p);
        const v = safeTrimText(raw);
        if (v) out.push({ path: p, value: v, raw });
    }
    return out;
}

function parseMissionAndProgramsFromLoaded(
    loaded: LoadedXml,
): ParsedNarrative[] {
    const { xml, doc, usedParser } = loaded;
    const narratives: ParsedNarrative[] = [];

    // Mission (common tags across 990 variants)
    const missionPaths = [
        "Return.ReturnData.IRS990.MissionDesc",
        "Return.ReturnData.IRS990.MissionDescTxt",
        "Return.ReturnData.IRS990.MissionDescriptionTxt",
        "Return.ReturnData.IRS990EZ.PrimaryExemptPurposeTxt",
        "Return.ReturnHeader.PreparerFirmGrp.PreparerFirmName.BusinessNameLine1Txt", // unlikely, but keeps us resilient
    ];

    let missionText = "";
    let missionPicked: string | null = null;
    if (usedParser && doc) {
        const m = findFirstTextFromDoc(doc, missionPaths);
        missionText = m.value;
        missionPicked = m.picked;
    } else {
        // Regex fallback for MissionDesc-ish tags
        const m = xml.match(
            /<\s*(MissionDesc|MissionDescTxt|MissionDescriptionTxt|PrimaryExemptPurposeTxt)\s*>\s*([\s\S]*?)\s*<\s*\/(MissionDesc|MissionDescTxt|MissionDescriptionTxt|PrimaryExemptPurposeTxt)\s*>/i,
        );
        if (m && m[2]) {
            missionText = safeTrimText(m[2]);
            missionPicked = m[1] || null;
        }
    }

    if (missionText) {
        narratives.push({
            section: "mission",
            label: "Mission",
            raw_text: missionText,
            extracted: { mission: missionText },
            source_map: {
                parser: usedParser ? "fast-xml-parser" : "regex",
                picked: missionPicked,
            },
        });
    }

    // Program accomplishments (IRS990 only, but we keep multiple candidates)
    if (usedParser && doc) {
        const grpPaths = [
            "Return.ReturnData.IRS990.ProgramSrvcAccomplishmentGrp",
            "Return.ReturnData.IRS990.ProgramServiceAccomplishmentGrp",
        ];

        let groups: any[] = [];
        for (const p of grpPaths) {
            const arr = getArrayByPath(doc, p);
            if (arr.length) {
                groups = arr;
                break;
            }
        }

        const programs = groups
            .map((g) => {
                const desc = safeTrimText(
                    g?.DescriptionProgramSrvcAccomplishmentTxt ??
                        g?.DescProgramSrvcAccomplishmentTxt ??
                        g?.DescriptionProgramServiceAccomplishmentTxt,
                );
                const exp = asNumberOrNull(
                    g?.ExpenseAmt ?? g?.ProgramServiceExpenseAmt ??
                        g?.ExpnssAmt,
                );
                const grant = asNumberOrNull(g?.GrantAmt ?? g?.GrantsAmt);
                const revenue = asNumberOrNull(
                    g?.RevenueAmt ?? g?.ProgramServiceRevenueAmt,
                );
                const code = safeTrimText(
                    g?.ProgramServiceAccomplishmentDesc ??
                        g?.ProgramServiceCodeTxt ?? g?.ProgramServiceCode,
                );
                if (!desc) return null;
                return {
                    description: desc,
                    expense: exp,
                    grants: grant,
                    revenue,
                    code: code || null,
                };
            })
            .filter(Boolean) as Array<Record<string, any>>;

        if (programs.length) {
            const raw = programs.map((p, idx) =>
                `(${idx + 1}) ${p.description}`
            ).join("\n\n");
            narratives.push({
                section: "program_accomplishments",
                label: "Program accomplishments",
                raw_text: raw,
                extracted: { programs },
                source_map: {
                    parser: "fast-xml-parser",
                    picked:
                        "Return.ReturnData.IRS990.ProgramSrvcAccomplishmentGrp",
                },
            });
        }
    } else {
        // Regex fallback: capture repeated DescriptionProgramSrvcAccomplishmentTxt
        const re =
            /<\s*(DescriptionProgramSrvcAccomplishmentTxt|DescProgramSrvcAccomplishmentTxt|DescriptionProgramServiceAccomplishmentTxt)\s*>\s*([\s\S]*?)\s*<\s*\/(DescriptionProgramSrvcAccomplishmentTxt|DescProgramSrvcAccomplishmentTxt|DescriptionProgramServiceAccomplishmentTxt)\s*>/gi;
        const programs: Array<{ description: string }> = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(xml))) {
            const desc = safeTrimText(m[2]);
            if (desc) programs.push({ description: desc });
            if (programs.length >= 50) break;
        }
        if (programs.length) {
            const raw = programs.map((p, idx) =>
                `(${idx + 1}) ${p.description}`
            ).join("\n\n");
            narratives.push({
                section: "program_accomplishments",
                label: "Program accomplishments",
                raw_text: raw,
                extracted: { programs },
                source_map: {
                    parser: "regex",
                    picked: "DescriptionProgramSrvcAccomplishmentTxt",
                },
            });
        }
    }

    return narratives;
}

function getTextByPath(obj: any, p: string): string {
    const v = getByPath(obj, p);
    return safeTrimText(v);
}

function getAllSupplementalExplanations(loaded: LoadedXml): Array<{
    schedule: "schedule_d" | "schedule_i" | "other";
    reference: string | null;
    explanation: string;
    source: Record<string, any>;
}> {
    const { xml, doc, usedParser } = loaded;
    const out: Array<{
        schedule: "schedule_d" | "schedule_i" | "other";
        reference: string | null;
        explanation: string;
        source: Record<string, any>;
    }> = [];

    // Parser path: IRS990ScheduleD / IRS990ScheduleI often have SupplementalInformationDetail
    if (usedParser && doc) {
        const candidates = [
            {
                schedule: "schedule_d" as const,
                path:
                    "Return.ReturnData.IRS990ScheduleD.SupplementalInformationDetail",
            },
            {
                schedule: "schedule_d" as const,
                path:
                    "Return.ReturnData.IRS990ScheduleD.SupplementalInformationDetailGrp",
            },
            {
                schedule: "schedule_i" as const,
                path:
                    "Return.ReturnData.IRS990ScheduleI.SupplementalInformationDetail",
            },
            {
                schedule: "schedule_i" as const,
                path:
                    "Return.ReturnData.IRS990ScheduleI.SupplementalInformationDetailGrp",
            },
            // some variants tuck it under IRS990
            {
                schedule: "schedule_d" as const,
                path:
                    "Return.ReturnData.IRS990.IRS990ScheduleD.SupplementalInformationDetail",
            },
            {
                schedule: "schedule_i" as const,
                path:
                    "Return.ReturnData.IRS990.IRS990ScheduleI.SupplementalInformationDetail",
            },
        ];

        for (const c of candidates) {
            const rows = getArrayByPath(doc, c.path);
            for (const r of rows) {
                const reference = safeTrimText(r?.FormAndLineReferenceDesc) ||
                    safeTrimText(r?.FormLineReferenceDesc) ||
                    safeTrimText(r?.ReferenceDesc) ||
                    null;

                const explanation = safeTrimText(r?.ExplanationTxt) ||
                    safeTrimText(r?.ExplanationText) ||
                    safeTrimText(r?.DescriptionTxt);

                if (!explanation) continue;

                out.push({
                    schedule: c.schedule,
                    reference,
                    explanation,
                    source: { parser: "fast-xml-parser", picked: c.path },
                });
            }
        }

        return out;
    }

    // Regex fallback (best-effort): capture FormAndLineReferenceDesc + ExplanationTxt pairs
    const blockRe =
        /<\s*SupplementalInformationDetail\s*>[\s\S]*?<\/\s*SupplementalInformationDetail\s*>/gi;
    const refRe =
        /<\s*FormAndLineReferenceDesc\s*>\s*([\s\S]*?)\s*<\s*\/\s*FormAndLineReferenceDesc\s*>/i;
    const expRe =
        /<\s*ExplanationTxt\s*>\s*([\s\S]*?)\s*<\s*\/\s*ExplanationTxt\s*>/i;

    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = blockRe.exec(xml))) {
        const block = m[0] || "";
        const ref = block.match(refRe);
        const exp = block.match(expRe);
        const reference = ref?.[1] ? safeTrimText(ref[1]) : null;
        const explanation = exp?.[1] ? safeTrimText(exp[1]) : "";
        if (!explanation) continue;

        const schedGuess =
            (reference || "").toLowerCase().includes("schedule d")
                ? ("schedule_d" as const)
                : (reference || "").toLowerCase().includes("schedule i")
                ? ("schedule_i" as const)
                : ("other" as const);

        out.push({
            schedule: schedGuess,
            reference,
            explanation,
            source: {
                parser: "regex",
                picked: "SupplementalInformationDetail",
            },
        });

        if (++count >= 200) break;
    }

    return out;
}

function inferRestrictionsFromNarratives(
    loaded: LoadedXml,
    narratives: ParsedNarrative[],
): ParsedRestriction[] {
    const out: ParsedRestriction[] = [];

    // 1) Pull supplemental explanations (Schedule D/I etc)
    const supplemental = getAllSupplementalExplanations(loaded);

    // 2) Pull a few “signal” tags directly from Schedule D when present (your screenshot shows these)
    const { doc, usedParser, xml } = loaded;

    const pctSignals = (() => {
        const read = (tag: string): number | null => {
            if (usedParser && doc) {
                // common places
                const candidates = [
                    `Return.ReturnData.IRS990ScheduleD.${tag}`,
                    `Return.ReturnData.IRS990ScheduleD.EndowmentHeldGrp.${tag}`,
                    `Return.ReturnData.IRS990ScheduleD.EndowmentFundsGrp.${tag}`,
                ];
                for (const p of candidates) {
                    const raw = getByPath(doc, p);
                    const n = asNumberOrNull(raw);
                    if (n != null) return n;
                }
                return null;
            }
            const m = xml.match(
                new RegExp(
                    `<\\s*${tag}\\s*>\\s*([^<]+)\\s*<\\s*\\/\\s*${tag}\\s*>`,
                    "i",
                ),
            );
            return m?.[1] ? asNumberOrNull(m[1]) : null;
        };

        return {
            board_designated_pct: read("BoardDesignatedBalanceEOYPct"),
            permanent_endowment_pct: read("PrmntEndowmentBalanceEOYPct"),
            term_endowment_pct: read("TermEndowmentBalanceEOYPct"),
        };
    })();

    // 3) Keyword-based inference (deterministic + conservative)
    const classify = (text: string) => {
        const t = (text || "").toLowerCase();

        const hits = {
            endowment: /\bendowment\b/.test(t) ||
                /\bpermanent endowment\b/.test(t) ||
                /\bterm endowment\b/.test(t),
            scholarship: /\bscholarship\b/.test(t) || /\btuition\b/.test(t) ||
                /\bstudent\b/.test(t),
            program: /\bprogram\b/.test(t) || /\bclassroom grant\b/.test(t) ||
                /\bgrants?\b/.test(t),
            donor: /\bdonor restriction\b/.test(t) ||
                /\bwith donor restrictions\b/.test(t) ||
                /\brestricted net assets\b/.test(t),
            geographic: /\bwithin\b.*\bcounty\b/.test(t) ||
                /\bwithin\b.*\bstate\b/.test(t) || /\bminnesota\b/.test(t) ||
                /\b(mound|westonka|carver|henn(e|a)pin)\b/.test(t),
            boardDesignated: /\bboard[- ]designated\b/.test(t) ||
                /\bquasi[- ]endowment\b/.test(t),
        };

        return hits;
    };

    // Use supplemental explanations as primary evidence
    for (const s of supplemental) {
        const hits = classify(s.explanation);
        const ref = s.reference ? ` (${s.reference})` : "";

        if (hits.endowment) {
            out.push({
                restriction_type: "endowment",
                summary: `Endowment referenced in supplemental info${ref}`,
                details: {
                    schedule: s.schedule,
                    reference: s.reference,
                    explanation: s.explanation,
                    pct_signals: pctSignals,
                    source: s.source,
                },
                confidence: 0.8,
                source_narrative_id: null,
            });
        }

        if (hits.boardDesignated) {
            out.push({
                restriction_type: "board_designated",
                summary:
                    `Board-designated restriction referenced in supplemental info${ref}`,
                details: {
                    schedule: s.schedule,
                    reference: s.reference,
                    explanation: s.explanation,
                    pct_signals: pctSignals,
                    source: s.source,
                },
                confidence: 0.75,
                source_narrative_id: null,
            });
        }

        if (hits.scholarship) {
            out.push({
                restriction_type: "scholarship_restriction",
                summary:
                    `Scholarship restriction referenced in supplemental info${ref}`,
                details: {
                    schedule: s.schedule,
                    reference: s.reference,
                    explanation: s.explanation,
                    source: s.source,
                },
                confidence: 0.75,
                source_narrative_id: null,
            });
        }

        if (hits.program) {
            out.push({
                restriction_type: "program_restriction",
                summary:
                    `Program restriction referenced in supplemental info${ref}`,
                details: {
                    schedule: s.schedule,
                    reference: s.reference,
                    explanation: s.explanation,
                    source: s.source,
                },
                confidence: 0.65,
                source_narrative_id: null,
            });
        }

        if (hits.geographic) {
            out.push({
                restriction_type: "geographic_restriction",
                summary:
                    `Geographic restriction signal in supplemental info${ref}`,
                details: {
                    schedule: s.schedule,
                    reference: s.reference,
                    explanation: s.explanation,
                    source: s.source,
                },
                confidence: 0.55,
                source_narrative_id: null,
            });
        }

        if (hits.donor) {
            out.push({
                restriction_type: "donor_restricted",
                summary:
                    `Donor-restriction language found in supplemental info${ref}`,
                details: {
                    schedule: s.schedule,
                    reference: s.reference,
                    explanation: s.explanation,
                    source: s.source,
                },
                confidence: 0.6,
                source_narrative_id: null,
            });
        }
    }

    // 4) Secondary evidence: existing narratives (mission, program accomplishments)
    // This is weaker, but can still tag program restrictions when mission/program text says “restricted to…”
    for (const n of narratives) {
        const hits = classify(n.raw_text);
        if (hits.program) {
            out.push({
                restriction_type: "program_restriction",
                summary:
                    `Program restriction signal from narrative section=${n.section}`,
                details: {
                    section: n.section,
                    label: n.label,
                    raw_text: n.raw_text,
                    source: n.source_map,
                },
                confidence: 0.45,
                source_narrative_id: null,
            });
        }
        if (hits.scholarship) {
            out.push({
                restriction_type: "scholarship_restriction",
                summary:
                    `Scholarship restriction signal from narrative section=${n.section}`,
                details: {
                    section: n.section,
                    label: n.label,
                    raw_text: n.raw_text,
                    source: n.source_map,
                },
                confidence: 0.45,
                source_narrative_id: null,
            });
        }
    }

    // 5) Dedupe by (type + normalized summary)
    const seen = new Set<string>();
    const deduped: ParsedRestriction[] = [];
    for (const r of out) {
        const key = `${r.restriction_type}::${(r.summary || "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push({
            ...r,
            restriction_type: clampEnumRestrictionType(r.restriction_type),
        });
    }

    return deduped;
}

function parsePartVIIAPeopleFromLoaded(loaded: LoadedXml): ParsedPerson[] {
    const { xml, doc, usedParser } = loaded;

    const people: ParsedPerson[] = [];

    if (usedParser && doc) {
        const groupPaths = [
            "Return.ReturnData.IRS990.Form990PartVIISectionAGrp",
            "Return.ReturnData.IRS990.IRS990PartVIISectionAGrp",
            "Return.ReturnData.IRS990.PartVIISectionAGrp",
            "Return.ReturnData.IRS990EZ.Form990PartVIISectionAGrp",
        ];

        let groups: any[] = [];
        for (const p of groupPaths) {
            const arr = getArrayByPath(doc, p);
            if (arr.length) {
                groups = arr;
                break;
            }
        }

        for (const g of groups) {
            const name = safeTrimText(
                g?.PersonNm ?? g?.PersonName ?? g?.PersonNameTxt,
            );
            if (!name) continue;
            const title = safeTrimText(g?.TitleTxt ?? g?.Title);

            // If enums differ, we still try a conservative set.
            const roleGuess = (() => {
                const t = (title || "").toLowerCase();
                if (t.includes("director") || t.includes("trustee")) {
                    return "director";
                }
                if (
                    t.includes("officer") || t.includes("president") ||
                    t.includes("treasurer") || t.includes("secretary")
                ) return "officer";
                return "unknown";
            })();

            const avg = asNumberOrNull(
                g?.AverageHoursPerWeekRt ?? g?.AverageHoursPerWeek,
            );
            const reportable = asNumberOrNull(
                g?.ReportableCompFromOrgAmt ?? g?.ReportableCompFromOrg,
            );
            const other = asNumberOrNull(
                g?.OtherCompensationAmt ?? g?.OtherCompensation,
            );
            const isCurrent = coerceBoolOrNull(
                g?.PersonCurrentInd ?? g?.IsCurrentInd ?? g?.IsCurrent,
            );

            people.push({
                role: roleGuess,
                name,
                title: title || null,
                average_hours_per_week: avg,
                reportable_compensation: reportable,
                other_compensation: other,
                is_current: isCurrent,
                source_map: {
                    parser: "fast-xml-parser",
                },
            });
        }
    } else {
        // Regex fallback: very best-effort for PersonNm/TitleTxt
        const personRe =
            /<\s*(PersonNm|PersonName|PersonNameTxt)\s*>\s*([\s\S]*?)\s*<\s*\/(PersonNm|PersonName|PersonNameTxt)\s*>/gi;
        const titleRe =
            /<\s*(TitleTxt|Title)\s*>\s*([\s\S]*?)\s*<\s*\/(TitleTxt|Title)\s*>/gi;

        const names: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = personRe.exec(xml))) {
            const name = safeTrimText(m[2]);
            if (name) names.push(name);
            if (names.length >= 200) break;
        }

        const titles: string[] = [];
        while ((m = titleRe.exec(xml))) {
            const t = safeTrimText(m[2]);
            if (t) titles.push(t);
            if (titles.length >= 200) break;
        }

        const count = Math.max(names.length, titles.length);
        for (let i = 0; i < count; i++) {
            const name = names[i] || "";
            const title = titles[i] || "";
            if (!name) continue;
            const roleGuess = (() => {
                const t = (title || "").toLowerCase();
                if (t.includes("director") || t.includes("trustee")) {
                    return "director";
                }
                if (
                    t.includes("officer") || t.includes("president") ||
                    t.includes("treasurer") || t.includes("secretary")
                ) return "officer";
                return "unknown";
            })();
            people.push({
                role: roleGuess,
                name,
                title: title || null,
                average_hours_per_week: null,
                reportable_compensation: null,
                other_compensation: null,
                is_current: null,
                source_map: {
                    parser: "regex",
                },
            });
        }
    }

    return people;
}

function clampEnumRestrictionType(input: string): string {
    // Must match your enum values:
    // endowment, donor_restricted, temporarily_restricted, permanently_restricted,
    // board_designated, scholarship_restriction, program_restriction, geographic_restriction, other
    const s = String(input || "").trim().toLowerCase();
    const allowed = new Set([
        "endowment",
        "donor_restricted",
        "temporarily_restricted",
        "permanently_restricted",
        "board_designated",
        "scholarship_restriction",
        "program_restriction",
        "geographic_restriction",
        "other",
    ]);
    return allowed.has(s) ? s : "other";
}

function parseRestrictionsFromLoaded(loaded: LoadedXml): ParsedRestriction[] {
    const { xml, doc, usedParser } = loaded;
    const out: ParsedRestriction[] = [];

    // ---------- A) Net assets w/ donor restrictions (newer forms) ----------
    // Post-2018-ish: "without donor restrictions" / "with donor restrictions"
    const donorNewPaths = {
        withBoy: [
            "Return.ReturnData.IRS990.NetAssetsWithDonorRestrictionsBOYAmt",
            "Return.ReturnData.IRS990.NetAssetsWithDonorRestrctnsBOYAmt",
        ],
        withEoy: [
            "Return.ReturnData.IRS990.NetAssetsWithDonorRestrictionsEOYAmt",
            "Return.ReturnData.IRS990.NetAssetsWithDonorRestrctnsEOYAmt",
        ],
        withoutBoy: [
            "Return.ReturnData.IRS990.NetAssetsWithoutDonorRestrictionsBOYAmt",
            "Return.ReturnData.IRS990.NetAssetsWithoutDonorRestrctnsBOYAmt",
        ],
        withoutEoy: [
            "Return.ReturnData.IRS990.NetAssetsWithoutDonorRestrictionsEOYAmt",
            "Return.ReturnData.IRS990.NetAssetsWithoutDonorRestrctnsEOYAmt",
        ],
    };

    let withBoy: number | null = null;
    let withEoy: number | null = null;
    let withoutBoy: number | null = null;
    let withoutEoy: number | null = null;

    if (usedParser && doc) {
        const wboy = findFirstNumberFromDoc(
            doc,
            donorNewPaths.withBoy.map((p) => ({ path: p })),
        );
        const weoy = findFirstNumberFromDoc(
            doc,
            donorNewPaths.withEoy.map((p) => ({ path: p })),
        );
        const nb = findFirstNumberFromDoc(
            doc,
            donorNewPaths.withoutBoy.map((p) => ({ path: p })),
        );
        const ne = findFirstNumberFromDoc(
            doc,
            donorNewPaths.withoutEoy.map((p) => ({ path: p })),
        );

        withBoy = wboy.value;
        withEoy = weoy.value;
        withoutBoy = nb.value;
        withoutEoy = ne.value;
    } else {
        const wboy = findFirstNumberFromXmlRegex(xml, [
            "NetAssetsWithDonorRestrictionsBOYAmt",
            "NetAssetsWithDonorRestrctnsBOYAmt",
        ]);
        const weoy = findFirstNumberFromXmlRegex(xml, [
            "NetAssetsWithDonorRestrictionsEOYAmt",
            "NetAssetsWithDonorRestrctnsEOYAmt",
        ]);
        const nb = findFirstNumberFromXmlRegex(xml, [
            "NetAssetsWithoutDonorRestrictionsBOYAmt",
            "NetAssetsWithoutDonorRestrctnsBOYAmt",
        ]);
        const ne = findFirstNumberFromXmlRegex(xml, [
            "NetAssetsWithoutDonorRestrictionsEOYAmt",
            "NetAssetsWithoutDonorRestrctnsEOYAmt",
        ]);

        withBoy = wboy.value;
        withEoy = weoy.value;
        withoutBoy = nb.value;
        withoutEoy = ne.value;
    }

    const hasDonorNew = withBoy != null || withEoy != null ||
        withoutBoy != null || withoutEoy != null;

    if (hasDonorNew) {
        if ((withBoy ?? 0) !== 0 || (withEoy ?? 0) !== 0) {
            out.push({
                restriction_type: "donor_restricted",
                summary: `Net assets with donor restrictions (BOY=${
                    withBoy ?? "?"
                }, EOY=${withEoy ?? "?"})`,
                details: {
                    net_assets_with_donor_restrictions: {
                        boy: withBoy,
                        eoy: withEoy,
                    },
                    net_assets_without_donor_restrictions: {
                        boy: withoutBoy,
                        eoy: withoutEoy,
                    },
                },
                confidence: 0.9,
                source_narrative_id: null,
            });
        } else if ((withoutBoy ?? 0) !== 0 || (withoutEoy ?? 0) !== 0) {
            // Still useful signal (org reported the split)
            out.push({
                restriction_type: "other",
                summary:
                    `Reported donor restriction split (with donor restrictions appears zero; without donor restrictions present)`,
                details: {
                    net_assets_with_donor_restrictions: {
                        boy: withBoy,
                        eoy: withEoy,
                    },
                    net_assets_without_donor_restrictions: {
                        boy: withoutBoy,
                        eoy: withoutEoy,
                    },
                },
                confidence: 0.7,
                source_narrative_id: null,
            });
        }
    }

    // ---------- B) Legacy unrestricted / temp restricted / perm restricted ----------
    // Older forms: unrestricted / temporarily restricted / permanently restricted
    const legacyPaths = {
        tempBoy: [
            "Return.ReturnData.IRS990.TemporarilyRestrictedNetAssetsBOYAmt",
            "Return.ReturnData.IRS990.TempRestrictedNetAssetsBOYAmt",
        ],
        tempEoy: [
            "Return.ReturnData.IRS990.TemporarilyRestrictedNetAssetsEOYAmt",
            "Return.ReturnData.IRS990.TempRestrictedNetAssetsEOYAmt",
        ],
        permBoy: [
            "Return.ReturnData.IRS990.PermanentlyRestrictedNetAssetsBOYAmt",
            "Return.ReturnData.IRS990.PermRestrictedNetAssetsBOYAmt",
        ],
        permEoy: [
            "Return.ReturnData.IRS990.PermanentlyRestrictedNetAssetsEOYAmt",
            "Return.ReturnData.IRS990.PermRestrictedNetAssetsEOYAmt",
        ],
        unresBoy: [
            "Return.ReturnData.IRS990.UnrestrictedNetAssetsBOYAmt",
            "Return.ReturnData.IRS990.UnrestrictedNetAssetsOrFundBalancesBOYAmt",
        ],
        unresEoy: [
            "Return.ReturnData.IRS990.UnrestrictedNetAssetsEOYAmt",
            "Return.ReturnData.IRS990.UnrestrictedNetAssetsOrFundBalancesEOYAmt",
        ],
    };

    let tempBoy: number | null = null;
    let tempEoy: number | null = null;
    let permBoy: number | null = null;
    let permEoy: number | null = null;
    let unresBoy: number | null = null;
    let unresEoy: number | null = null;

    if (usedParser && doc) {
        tempBoy = findFirstNumberFromDoc(
            doc,
            legacyPaths.tempBoy.map((p) => ({ path: p })),
        ).value;
        tempEoy = findFirstNumberFromDoc(
            doc,
            legacyPaths.tempEoy.map((p) => ({ path: p })),
        ).value;
        permBoy = findFirstNumberFromDoc(
            doc,
            legacyPaths.permBoy.map((p) => ({ path: p })),
        ).value;
        permEoy = findFirstNumberFromDoc(
            doc,
            legacyPaths.permEoy.map((p) => ({ path: p })),
        ).value;
        unresBoy = findFirstNumberFromDoc(
            doc,
            legacyPaths.unresBoy.map((p) => ({ path: p })),
        ).value;
        unresEoy = findFirstNumberFromDoc(
            doc,
            legacyPaths.unresEoy.map((p) => ({ path: p })),
        ).value;
    } else {
        tempBoy = findFirstNumberFromXmlRegex(xml, [
            "TemporarilyRestrictedNetAssetsBOYAmt",
            "TempRestrictedNetAssetsBOYAmt",
        ]).value;
        tempEoy = findFirstNumberFromXmlRegex(xml, [
            "TemporarilyRestrictedNetAssetsEOYAmt",
            "TempRestrictedNetAssetsEOYAmt",
        ]).value;
        permBoy = findFirstNumberFromXmlRegex(xml, [
            "PermanentlyRestrictedNetAssetsBOYAmt",
            "PermRestrictedNetAssetsBOYAmt",
        ]).value;
        permEoy = findFirstNumberFromXmlRegex(xml, [
            "PermanentlyRestrictedNetAssetsEOYAmt",
            "PermRestrictedNetAssetsEOYAmt",
        ]).value;
        unresBoy = findFirstNumberFromXmlRegex(xml, [
            "UnrestrictedNetAssetsBOYAmt",
            "UnrestrictedNetAssetsOrFundBalancesBOYAmt",
        ]).value;
        unresEoy = findFirstNumberFromXmlRegex(xml, [
            "UnrestrictedNetAssetsEOYAmt",
            "UnrestrictedNetAssetsOrFundBalancesEOYAmt",
        ]).value;
    }

    const hasLegacy = tempBoy != null || tempEoy != null || permBoy != null ||
        permEoy != null || unresBoy != null || unresEoy != null;

    if (hasLegacy) {
        if ((tempBoy ?? 0) !== 0 || (tempEoy ?? 0) !== 0) {
            out.push({
                restriction_type: "temporarily_restricted",
                summary: `Temporarily restricted net assets (BOY=${
                    tempBoy ?? "?"
                }, EOY=${tempEoy ?? "?"})`,
                details: {
                    boy: tempBoy,
                    eoy: tempEoy,
                    unrestricted: { boy: unresBoy, eoy: unresEoy },
                },
                confidence: 0.85,
                source_narrative_id: null,
            });
        }
        if ((permBoy ?? 0) !== 0 || (permEoy ?? 0) !== 0) {
            out.push({
                restriction_type: "permanently_restricted",
                summary: `Permanently restricted net assets (BOY=${
                    permBoy ?? "?"
                }, EOY=${permEoy ?? "?"})`,
                details: {
                    boy: permBoy,
                    eoy: permEoy,
                    unrestricted: { boy: unresBoy, eoy: unresEoy },
                },
                confidence: 0.85,
                source_narrative_id: null,
            });
        }
    }

    // ---------- C) Endowment (Schedule D) ----------
    // Best-effort parse. IRS schemas vary; we try common paths and sum ending balances if present.
    if (usedParser && doc) {
        const endowmentGroupPaths = [
            "Return.ReturnData.IRS990ScheduleD.EndowmentFundsGrp",
            "Return.ReturnData.IRS990ScheduleD.EndowmentFundGrp",
            "Return.ReturnData.IRS990ScheduleD.EndowmentFundsInfoGrp",
            "Return.ReturnData.IRS990ScheduleD.EndowmentFundsTableGrp",
        ];

        let rows: any[] = [];
        for (const p of endowmentGroupPaths) {
            const arr = getArrayByPath(doc, p);
            if (arr.length) {
                rows = arr;
                break;
            }
        }

        if (rows.length) {
            const parsedRows = rows.map((r) => {
                const begin = asNumberOrNull(
                    r?.BeginningYearBalanceAmt ?? r?.BeginningBalanceAmt ??
                        r?.BeginningYearBalance,
                );
                const contrib = asNumberOrNull(
                    r?.ContributionsAmt ?? r?.Contributions,
                );
                const invest = asNumberOrNull(
                    r?.InvestmentEarningsOrLossesAmt ??
                        r?.InvestmentEarningsLossesAmt ??
                        r?.InvestmentIncomeAmt,
                );
                const grants = asNumberOrNull(
                    r?.GrantsOrScholarshipsAmt ?? r?.GrantsScholarshipsAmt ??
                        r?.GrantsAmt,
                );
                const other = asNumberOrNull(
                    r?.OtherExpendituresAmt ?? r?.OtherExpenseAmt ??
                        r?.OtherAmt,
                );
                const end = asNumberOrNull(
                    r?.EndingYearBalanceAmt ?? r?.EndingBalanceAmt ??
                        r?.EndingYearBalance,
                );
                const purpose = safeTrimText(
                    r?.EndowmentPurposeTxt ?? r?.PurposeTxt ??
                        r?.EndowmentTypeTxt ?? r?.TypeTxt,
                );
                return {
                    purpose: purpose || null,
                    begin,
                    contrib,
                    invest,
                    grants,
                    other,
                    end,
                };
            });

            const totalEnd = parsedRows.reduce(
                (acc, r) => acc + (r.end ?? 0),
                0,
            );
            const hasMeaningful = parsedRows.some((r) => (r.end ?? 0) !== 0);

            if (hasMeaningful) {
                out.push({
                    restriction_type: "endowment",
                    summary:
                        `Endowment reported (ending balance total=${totalEnd.toLocaleString()})`,
                    details: {
                        rows: parsedRows,
                        totals: { ending_balance: totalEnd },
                    },
                    confidence: 0.75,
                    source_narrative_id: null,
                });
            }
        }
    } else {
        // Regex fallback: just look for EndingYearBalanceAmt repeated and sum
        const re =
            /<\s*(EndingYearBalanceAmt|EndingBalanceAmt)\s*>\s*([^<]+)\s*<\s*\/\s*(EndingYearBalanceAmt|EndingBalanceAmt)\s*>/gi;
        let m: RegExpExecArray | null;
        let total = 0;
        let count = 0;
        while ((m = re.exec(xml))) {
            const n = asNumberOrNull(m[2]);
            if (n != null) {
                total += n;
                count++;
            }
            if (count >= 200) break;
        }
        if (count && total !== 0) {
            out.push({
                restriction_type: "endowment",
                summary:
                    `Endowment (regex sum of ending balances=${total.toLocaleString()}, rows=${count})`,
                details: { ending_balance_sum: total, rows_count: count },
                confidence: 0.55,
                source_narrative_id: null,
            });
        }
    }

    // Normalize restriction_type to enum-safe
    return out.map((r) => ({
        ...r,
        restriction_type: clampEnumRestrictionType(r.restriction_type),
    }));
}

async function bestEffortUpsertRestrictions(params: {
    supabaseAdmin: any;
    return_id: string;
    restrictions: ParsedRestriction[];
}) {
    const { supabaseAdmin, return_id, restrictions } = params;
    if (!restrictions.length) return;

    try {
        const del = await supabaseAdmin
            .schema("irs")
            .from("return_restrictions")
            .delete()
            .eq("return_id", return_id);

        if (del.error) {
            console.warn(
                `WARN: could not clear existing irs.return_restrictions for return_id=${return_id}: ${del.error.message}`,
            );
        }
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e
            ? String((e as any).message)
            : String(e);
        console.warn(
            `WARN: exception clearing irs.return_restrictions for return_id=${return_id}: ${msg}`,
        );
    }

    // Bulk insert first
    const payloads = restrictions.map((r) => ({
        return_id,
        restriction_type: clampEnumRestrictionType(r.restriction_type),
        summary: r.summary,
        details: r.details ?? {},
        confidence: r.confidence ?? null,
        source_narrative_id: r.source_narrative_id ?? null,
    }));

    const bulk = await supabaseAdmin
        .schema("irs")
        .from("return_restrictions")
        .insert(payloads);

    if (!bulk.error) return;

    console.warn(
        `WARN: bulk insert irs.return_restrictions failed for return_id=${return_id}: ${bulk.error.message}. Falling back to per-row inserts.`,
    );

    for (const p of payloads) {
        const r = await supabaseAdmin.schema("irs").from("return_restrictions")
            .insert(p);
        if (r.error) {
            console.warn(
                `WARN: insert irs.return_restrictions failed for return_id=${return_id} type=${p.restriction_type}: ${r.error.message}`,
            );
        }
    }
}

async function bestEffortUpsertNarratives(params: {
    supabaseAdmin: any;
    return_id: string;
    narratives: ParsedNarrative[];
}) {
    const { supabaseAdmin, return_id, narratives } = params;
    if (!narratives.length) return;

    // Idempotency: clear all narratives for this return_id.
    // NOTE: We do NOT filter by `section` because `section` is an enum and passing unknown values
    // will cause PostgREST to reject the request before it reaches the DB.
    try {
        const del = await supabaseAdmin
            .schema("irs")
            .from("return_narratives")
            .delete()
            .eq("return_id", return_id);
        if (del.error) {
            console.warn(
                `WARN: could not clear existing irs.return_narratives for return_id=${return_id}: ${del.error.message}`,
            );
        }
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e
            ? String((e as any).message)
            : String(e);
        console.warn(
            `WARN: exception clearing irs.return_narratives for return_id=${return_id}: ${msg}`,
        );
    }

    function looksLikeEnumError(message: string): boolean {
        const m = (message || "").toLowerCase();
        return m.includes("invalid input value for enum");
    }

    function candidateNarrativeSections(section: string): string[] {
        const s = (section || "").toLowerCase();
        // Try a small set of plausible enum labels.
        if (s === "mission") {
            return [
                "mission",
                "mission_statement",
                "mission_desc",
                "mission_description",
                "primary_exempt_purpose",
                "primary_exempt_purpose_txt",
                "exempt_purpose",
                "other",
            ];
        }
        if (s === "program_accomplishments") {
            return [
                "program_accomplishments",
                "program_service_accomplishments",
                "program_services",
                "programs",
                "activities",
                "other",
            ];
        }
        return [section, "other"].filter(Boolean);
    }

    for (const n of narratives) {
        const fullPayload: any = {
            return_id,
            section: n.section,
            label: n.label,
            raw_text: n.raw_text,
            extracted: n.extracted,
            source_map: n.source_map,
        };

        const sectionCandidates = candidateNarrativeSections(n.section);

        // 1) Try full insert with candidate section values.
        let inserted = false;
        let lastErr: string | null = null;
        for (const sec of sectionCandidates) {
            const res = await supabaseAdmin
                .schema("irs")
                .from("return_narratives")
                .insert({ ...fullPayload, section: sec });
            if (!res.error) {
                inserted = true;
                break;
            }
            lastErr = res.error.message;
            if (!looksLikeEnumError(res.error.message)) {
                // Not an enum mismatch; don't spin.
                break;
            }
        }
        if (inserted) continue;

        // 2) Retry minimal payload with candidate section values.
        for (const sec of sectionCandidates) {
            const res = await supabaseAdmin
                .schema("irs")
                .from("return_narratives")
                .insert({ return_id, section: sec, raw_text: n.raw_text });
            if (!res.error) {
                console.warn(
                    `WARN: inserted irs.return_narratives with minimal payload for return_id=${return_id} section=${sec} (full payload failed)`,
                );
                inserted = true;
                break;
            }
            lastErr = res.error.message;
            if (!looksLikeEnumError(res.error.message)) break;
        }

        if (!inserted) {
            console.warn(
                `WARN: insert irs.return_narratives failed for return_id=${return_id} section=${n.section}: ${
                    lastErr || "unknown error"
                }`,
            );
        }
    }
}

async function bestEffortUpsertPeople(params: {
    supabaseAdmin: any;
    return_id: string;
    people: ParsedPerson[];
}) {
    const { supabaseAdmin, return_id, people } = params;
    if (!people.length) return;

    // Idempotency: clear all people for this return_id.
    // NOTE: We avoid filtering by role because it's an enum and unknown values can break PostgREST filters.
    try {
        const del = await supabaseAdmin
            .schema("irs")
            .from("return_people")
            .delete()
            .eq("return_id", return_id);
        if (del.error) {
            console.warn(
                `WARN: could not clear existing irs.return_people for return_id=${return_id}: ${del.error.message}`,
            );
        }
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e
            ? String((e as any).message)
            : String(e);
        console.warn(
            `WARN: exception clearing irs.return_people for return_id=${return_id}: ${msg}`,
        );
    }

    function looksLikeEnumError(message: string): boolean {
        const m = (message || "").toLowerCase();
        return m.includes("invalid input value for enum");
    }

    function candidateRoles(role: string): string[] {
        const r = (role || "").toLowerCase();
        // Most schemas have something like officer/director/key_employee/other.
        if (r === "unknown" || !r) {
            return ["other", "officer", "director", "key_employee", "employee"];
        }
        if (r === "officer") {
            return ["officer", "other"];
        }
        if (r === "director") {
            return ["director", "trustee", "other"];
        }
        return [role, "other"].filter(Boolean);
    }

    // Best-effort strategy:
    // - Attempt a bulk insert with full payload (roles normalized to first candidate).
    // - If it fails (schema mismatch), retry forcing all roles to "other".
    // - If still fails, try minimal payloads.
    // - If duplicates exist, ignore duplicate-key errors and continue.

    const fullPayloads: any[] = people.map((p) => ({
        return_id,
        role: candidateRoles(p.role)[0] || p.role,
        name: p.name,
        title: p.title,
        average_hours_per_week: p.average_hours_per_week,
        reportable_compensation: p.reportable_compensation,
        other_compensation: p.other_compensation,
        is_current: p.is_current,
        source_map: p.source_map,
    }));

    let bulk = await supabaseAdmin
        .schema("irs")
        .from("return_people")
        .insert(fullPayloads);

    if (!bulk.error) return;

    if (bulk.error && looksLikeEnumError(bulk.error.message)) {
        const forced = fullPayloads.map((p) => ({ ...p, role: "other" }));
        const bulk2 = await supabaseAdmin
            .schema("irs")
            .from("return_people")
            .insert(forced);
        if (!bulk2.error) {
            console.warn(
                `WARN: inserted irs.return_people after forcing role='other' for return_id=${return_id}`,
            );
            return;
        }
        // Fall through to minimal + per-row fallbacks
    }

    // If bulk insert fails, try minimal payloads.
    const minimalPayloads: any[] = people.map((p) => ({
        return_id,
        role: candidateRoles(p.role)[0] || p.role,
        name: p.name,
        title: p.title,
    }));

    bulk = await supabaseAdmin
        .schema("irs")
        .from("return_people")
        .insert(minimalPayloads);

    if (!bulk.error) {
        console.warn(
            `WARN: inserted irs.return_people with minimal payload for return_id=${return_id} (full payload failed)`,
        );
        return;
    }

    // Final fallback: insert one-by-one and ignore duplicate constraint errors.
    console.warn(
        `WARN: bulk insert irs.return_people failed for return_id=${return_id}: ${bulk.error.message}. Falling back to per-row inserts.`,
    );

    for (const p of fullPayloads) {
        let inserted = false;
        let lastErr: string | null = null;
        for (const role of candidateRoles(p.role)) {
            const r = await supabaseAdmin
                .schema("irs")
                .from("return_people")
                .insert({ ...p, role });
            if (!r.error) {
                inserted = true;
                break;
            }
            lastErr = r.error.message;
            const msg = String(r.error.message || "");
            if (msg.toLowerCase().includes("duplicate key")) {
                inserted = true;
                break;
            }
            if (!looksLikeEnumError(msg)) break;
        }
        if (inserted) continue;

        const msg = String(lastErr || "");
        // Try minimal per-row with role="other"
        const r2 = await supabaseAdmin
            .schema("irs")
            .from("return_people")
            .insert({ return_id, role: "other", name: p.name });

        if (r2.error) {
            const msg2 = String(r2.error.message || "");
            if (msg2.toLowerCase().includes("duplicate key")) continue;
            console.warn(
                `WARN: insert irs.return_people failed for return_id=${return_id} name=${p.name}: ${msg} (retry: ${msg2})`,
            );
        } else {
            console.warn(
                `WARN: inserted irs.return_people with minimal payload for return_id=${return_id} name=${p.name} (full insert failed: ${msg})`,
            );
        }
    }
}

function asNumberOrNull(input: unknown): number | null {
    if (input == null) return null;
    if (typeof input === "number" && Number.isFinite(input)) return input;
    const s = String(input).trim();
    if (!s) return null;
    // Remove commas, currency symbols, spaces, etc.
    const cleaned = s.replace(/[^0-9\-\.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

function getByPath(obj: any, p: string): unknown {
    // Simple dot-path getter; supports arrays by taking first element.
    const parts = p.split(".").filter(Boolean);
    let cur: any = obj;
    for (const part of parts) {
        if (cur == null) return undefined;
        cur = cur[part];
        if (Array.isArray(cur)) cur = cur[0];
    }
    return cur;
}

function findFirstNumberFromDoc(
    doc: any,
    candidates: Array<{ path: string; label?: string }>,
): { value: number | null; picked: string | null; raw?: unknown } {
    for (const c of candidates) {
        const raw = getByPath(doc, c.path);
        const n = asNumberOrNull(raw);
        if (n != null) {
            return { value: n, picked: c.path, raw };
        }
    }
    return { value: null, picked: null };
}

function findFirstNumberFromXmlRegex(
    xml: string,
    tags: string[],
): { value: number | null; picked: string | null; raw?: unknown } {
    for (const tag of tags) {
        const re = new RegExp(
            `<\\s*${tag}\\s*>\\s*([^<]+)\\s*<\\s*\\/\\s*${tag}\\s*>`,
            "i",
        );
        const m = xml.match(re);
        if (m && m[1] != null) {
            const raw = m[1];
            const n = asNumberOrNull(raw);
            if (n != null) {
                return { value: n, picked: tag, raw };
            }
        }
    }
    return { value: null, picked: null };
}

function parseReturnFinancialsFromLoaded(loaded: LoadedXml): ParsedFinancials {
    const { xml, doc, usedParser } = loaded;

    // IMPORTANT: IRS XML varies across years and return types (990/990EZ/990PF).
    // Minimal v1 uses a best-effort set of common tags.
    // We look both in Return.ReturnData.IRS990* and in Return-level summary nodes.

    const baseCandidates = {
        totalRevenue: [
            "Return.ReturnData.IRS990.CYTotalRevenueAmt",
            "Return.ReturnData.IRS990.TotalRevenueCurrentYearAmt",
            "Return.ReturnData.IRS990.TotalRevenueAmt",
            "Return.ReturnData.IRS990EZ.TotalRevenueAmt",
            "Return.ReturnData.IRS990EZ.CYTotalRevenueAmt",
            "Return.ReturnData.IRS990PF.TotalRevAndExpnssAmt",
            "Return.ReturnHeader.TotalRevenueAmt",
        ].map((p) => ({ path: p })),

        totalExpenses: [
            "Return.ReturnData.IRS990.CYTotalExpensesAmt",
            "Return.ReturnData.IRS990.TotalFunctionalExpensesAmt",
            "Return.ReturnData.IRS990.TotalExpensesCurrentYearAmt",
            "Return.ReturnData.IRS990EZ.TotalExpensesAmt",
            "Return.ReturnData.IRS990EZ.CYTotalExpensesAmt",
            "Return.ReturnData.IRS990PF.TotalExpensesAmt",
            "Return.ReturnHeader.TotalExpensesAmt",
        ].map((p) => ({ path: p })),

        contributions: [
            "Return.ReturnData.IRS990.CYContributionsGrantsAmt",
            "Return.ReturnData.IRS990.ContributionsGiftsGrantsEtcAmt",
            "Return.ReturnData.IRS990.TotalContributionsAmt",
            "Return.ReturnData.IRS990EZ.ContributionsGiftsGrantsEtcAmt",
            "Return.ReturnData.IRS990EZ.TotalContributionsAmt",
            "Return.ReturnData.IRS990PF.ContributionsGiftsAmt",
            "Return.ReturnHeader.ContributionsAmt",
        ].map((p) => ({ path: p })),

        netAssetsEnd: [
            "Return.ReturnData.IRS990.NetAssetsOrFundBalancesEOYAmt",
            "Return.ReturnData.IRS990.TotalNetAssetsFundBalancesEOYAmt",
            "Return.ReturnData.IRS990EZ.NetAssetsOrFundBalancesEOYAmt",
            "Return.ReturnData.IRS990EZ.TotalNetAssetsFundBalancesEOYAmt",
            "Return.ReturnData.IRS990PF.NetAssetsEOYAmt",
            "Return.ReturnHeader.NetAssetsEOYAmt",
        ].map((p) => ({ path: p })),

        netAssetsBegin: [
            "Return.ReturnData.IRS990.NetAssetsOrFundBalancesBOYAmt",
            "Return.ReturnData.IRS990.TotalNetAssetsFundBalancesBOYAmt",
            "Return.ReturnData.IRS990EZ.NetAssetsOrFundBalancesBOYAmt",
            "Return.ReturnData.IRS990EZ.TotalNetAssetsFundBalancesBOYAmt",
            "Return.ReturnData.IRS990PF.NetAssetsBOYAmt",
            "Return.ReturnHeader.NetAssetsBOYAmt",
        ].map((p) => ({ path: p })),
    };

    const source_map: ParsedFinancials["source_map"] = {
        parser: usedParser ? { path: "fast-xml-parser" } : { path: "regex" },
        total_revenue: null,
        total_expenses: null,
        contributions: null,
        net_assets_begin: null,
        net_assets_end: null,
    };

    let totalRevenue: number | null = null;
    let totalExpenses: number | null = null;
    let contributions: number | null = null;
    let netAssetsEnd: number | null = null;
    let netAssetsBegin: number | null = null;

    if (usedParser && doc) {
        const tr = findFirstNumberFromDoc(doc, baseCandidates.totalRevenue);
        totalRevenue = tr.value;
        if (tr.picked) {
            source_map.total_revenue = { path: tr.picked, raw: tr.raw };
        }

        const te = findFirstNumberFromDoc(doc, baseCandidates.totalExpenses);
        totalExpenses = te.value;
        if (te.picked) {
            source_map.total_expenses = { path: te.picked, raw: te.raw };
        }

        const c = findFirstNumberFromDoc(doc, baseCandidates.contributions);
        contributions = c.value;
        if (c.picked) source_map.contributions = { path: c.picked, raw: c.raw };

        const nab = findFirstNumberFromDoc(doc, baseCandidates.netAssetsBegin);
        netAssetsBegin = nab.value;
        if (nab.picked) {
            source_map.net_assets_begin = { path: nab.picked, raw: nab.raw };
        }

        const nae = findFirstNumberFromDoc(doc, baseCandidates.netAssetsEnd);
        netAssetsEnd = nae.value;
        if (nae.picked) {
            source_map.net_assets_end = { path: nae.picked, raw: nae.raw };
        }
    } else {
        const tr = findFirstNumberFromXmlRegex(xml, [
            "CYTotalRevenueAmt",
            "TotalRevenueAmt",
            "TotalRevenueCurrentYearAmt",
            "TotalRevAndExpnssAmt",
        ]);
        totalRevenue = tr.value;
        if (tr.picked) {
            source_map.total_revenue = { path: tr.picked, raw: tr.raw };
        }

        const te = findFirstNumberFromXmlRegex(xml, [
            "CYTotalExpensesAmt",
            "TotalFunctionalExpensesAmt",
            "TotalExpensesAmt",
            "TotalExpensesCurrentYearAmt",
        ]);
        totalExpenses = te.value;
        if (te.picked) {
            source_map.total_expenses = { path: te.picked, raw: te.raw };
        }

        const c = findFirstNumberFromXmlRegex(xml, [
            "CYContributionsGrantsAmt",
            "ContributionsGiftsGrantsEtcAmt",
            "TotalContributionsAmt",
            "ContributionsGiftsAmt",
        ]);
        contributions = c.value;
        if (c.picked) source_map.contributions = { path: c.picked, raw: c.raw };

        const nab = findFirstNumberFromXmlRegex(xml, [
            "NetAssetsOrFundBalancesBOYAmt",
            "TotalNetAssetsFundBalancesBOYAmt",
            "NetAssetsBOYAmt",
        ]);
        netAssetsBegin = nab.value;
        if (nab.picked) {
            source_map.net_assets_begin = { path: nab.picked, raw: nab.raw };
        }

        const nae = findFirstNumberFromXmlRegex(xml, [
            "NetAssetsOrFundBalancesEOYAmt",
            "TotalNetAssetsFundBalancesEOYAmt",
            "NetAssetsEOYAmt",
        ]);
        netAssetsEnd = nae.value;
        if (nae.picked) {
            source_map.net_assets_end = { path: nae.picked, raw: nae.raw };
        }
    }

    return {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        contributions,
        net_assets_begin: netAssetsBegin,
        net_assets_end: netAssetsEnd,
        source_map,
    };
}

async function parseReturnFinancials(
    xmlPath: string,
): Promise<ParsedFinancials> {
    const xml = await fsp.readFile(xmlPath, "utf8");
    const loaded = loadXmlDoc(xml);
    return parseReturnFinancialsFromLoaded(loaded);
}

async function resolveReturnRowByReturnIdOrObjectId(params: {
    supabaseAdmin: any;
    returnIdOrObjectId: string;
}): Promise<{ id: string; xml_path: string }> {
    const { supabaseAdmin, returnIdOrObjectId } = params;

    const q = supabaseAdmin
        .schema("irs")
        .from("returns")
        .select("id, xml_path")
        .limit(1);

    const { data, error } = looksLikeUuid(returnIdOrObjectId)
        ? await q.eq("id", returnIdOrObjectId).maybeSingle()
        : await q.eq("irs_object_id", returnIdOrObjectId).maybeSingle();

    if (error) {
        throw new Error(
            `Failed to load irs.returns for returnId=${returnIdOrObjectId}: ${error.message}`,
        );
    }

    if (!data?.id || !data.xml_path) {
        throw new Error(
            `Return not found or xml_path missing for returnId=${returnIdOrObjectId}. (If you passed a TEOS object id, it must exist in irs.returns.irs_object_id.)`,
        );
    }

    return { id: data.id, xml_path: String(data.xml_path) };
}

async function resolveReturnAndXml(params: {
    returnId: string | null;
    xmlPathArg: string | null;
}) {
    tryLoadDotenvOnce();
    const { returnId, xmlPathArg } = params;

    let xml_path: string | null = xmlPathArg ? path.resolve(xmlPathArg) : null;
    let return_id: string | null = returnId;

    const supabaseAdmin = createSupabaseAdmin();

    if (return_id && !xml_path) {
        const row = await resolveReturnRowByReturnIdOrObjectId({
            supabaseAdmin,
            returnIdOrObjectId: return_id,
        });
        return_id = row.id;
        xml_path = path.resolve(row.xml_path);
    }

    if (!return_id && xml_path) {
        const { data, error } = await supabaseAdmin
            .schema("irs")
            .from("returns")
            .select("id")
            .eq("xml_path", xml_path)
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to resolve return_id by xml_path=${xml_path}: ${error.message}`,
            );
        }

        if (!data?.id) {
            throw new Error(
                `Could not resolve return_id from irs.returns.xml_path=${xml_path}. Pass --returnId explicitly.`,
            );
        }

        return_id = data.id;
    }

    if (!return_id || !xml_path) {
        throw new Error("Provide --returnId <uuid> and/or --xml <path>");
    }

    // Use resolveXmlPathOnDisk to locate the XML file, with helpful error if not found.
    const resolved = resolveXmlPathOnDisk(xml_path);
    if (!resolved.path) {
        throw new Error(
            `XML not found on disk for return_id=${return_id} original=${xml_path} Tried: ${
                resolved.tried.join(", ")
            } Set IRS_TEOS_XML_ROOT to your persistent XML directory.`,
        );
    }
    xml_path = resolved.path;

    return { return_id, xml_path, supabaseAdmin };
}

async function upsertReturnFinancials(params: {
    supabaseAdmin: any;
    return_id: string;
    parsed: ParsedFinancials;
}) {
    const { supabaseAdmin, return_id, parsed } = params;

    if (!supabaseAdmin) {
        throw new Error(
            "Supabase client required to write irs.return_financials",
        );
    }

    const now = new Date().toISOString();

    const payload = {
        return_id,
        total_revenue: parsed.total_revenue,
        total_expenses: parsed.total_expenses,
        contributions: parsed.contributions,
        net_assets_begin: parsed.net_assets_begin,
        net_assets_end: parsed.net_assets_end,
        source_map: parsed.source_map,
        updated_at: now,
    };

    const { error } = await supabaseAdmin
        .schema("irs")
        .from("return_financials")
        .upsert(payload, { onConflict: "return_id" });

    if (error) {
        throw new Error(
            `Upsert into irs.return_financials failed: ${error.message}`,
        );
    }
}

async function processDistrict(params: {
    districtEntityId: string;
    statuses: string[];
    limit?: number;
    dryRun?: boolean;
}) {
    const { districtEntityId, statuses, limit, dryRun } = params;

    const supabaseAdmin = createSupabaseAdmin();

    // 1) Load scoped EINs
    const einSet = new Set<string>();
    const pageSize = 1000;
    let from = 0;

    while (true) {
        let q = supabaseAdmin
            .schema("public")
            .from("superintendent_scope_nonprofits")
            .select("ein")
            .eq("district_entity_id", districtEntityId)
            .range(from, from + pageSize - 1);

        if (statuses.length) q = q.in("status", statuses);

        const { data, error } = await q;
        if (error) {
            throw new Error(`Failed to load scoped EINs: ${error.message}`);
        }

        const rows = (data || []) as Array<{ ein: string }>;
        for (const r of rows) {
            const n = String(r.ein || "").replace(/\D/g, "");
            if (n.length === 9) einSet.add(n);
        }

        if (rows.length < pageSize) break;
        from += pageSize;
    }

    if (!einSet.size) {
        console.log(
            `No scoped EINs found for district_entity_id=${districtEntityId} (statuses=${
                statuses.join(",") || "<any>"
            }).`,
        );
        return;
    }

    console.log(
        `Scoped EINs: ${einSet.size.toLocaleString()} (district_entity_id=${districtEntityId})`,
    );

    // 2) Page through returns for those EINs
    const eins = Array.from(einSet);
    const returnsPageSize = 500;
    let processed = 0;
    let upserted = 0;
    let skippedMissingXml = 0;
    let parseErrors = 0;

    // NOTE: PostgREST has a URL length limit, so we chunk the EIN list.
    const chunkSize = 200;
    for (let i = 0; i < eins.length; i += chunkSize) {
        const chunk = eins.slice(i, i + chunkSize);
        let pageFrom = 0;

        while (true) {
            // TEOS ingestion currently stores EINs both as `ein` (often dashed) and `ein_normalized` (9 digits).
            // District scope EINs are normalized to 9 digits, so prefer matching on `ein_normalized`.
            // We also include a fallback match against dashed EINs in case some rows haven't had the trigger run yet.
            const dashedChunk = chunk.map((n) => formatEinDashed(n) || n);

            const q = supabaseAdmin
                .schema("irs")
                .from("returns")
                .select("id, ein, ein_normalized, xml_path")
                .or(
                    `ein_normalized.in.(${chunk.join(",")}),ein.in.(${
                        dashedChunk.join(",")
                    })`,
                )
                .not("xml_path", "is", null)
                .range(pageFrom, pageFrom + returnsPageSize - 1);

            const { data, error } = await q;
            if (error) {
                throw new Error(
                    `Failed to load irs.returns page: ${error.message}`,
                );
            }

            const rows = (data || []) as Array<{
                id: string;
                ein: string | null;
                ein_normalized: string | null;
                xml_path: string | null;
            }>;
            if (!rows.length) break;

            // Helpful visibility while iterating
            if (pageFrom === 0) {
                console.log(
                    `Fetched ${rows.length} irs.returns rows for chunk ${i}-${
                        Math.min(i + chunkSize, eins.length)
                    } (pageFrom=${pageFrom})`,
                );
            }

            for (const r of rows) {
                if (limit && processed >= limit) break;
                processed++;

                const xmlPath = String(r.xml_path || "");
                if (!xmlPath) {
                    skippedMissingXml++;
                    continue;
                }

                // Try to resolve the XML path on disk using the helper.
                const resolved = resolveXmlPathOnDisk(xmlPath);
                if (!resolved.path) {
                    skippedMissingXml++;
                    console.warn(
                        `WARN: Skipping return_id=${r.id} - XML not found on disk. Tried: ${
                            resolved.tried.join(", ")
                        }. Set IRS_TEOS_XML_ROOT to your persistent XML directory.`,
                    );
                    continue;
                }

                try {
                    const xml = await fsp.readFile(resolved.path, "utf8");
                    const loaded = loadXmlDoc(xml);

                    const parsed = parseReturnFinancialsFromLoaded(loaded);
                    const narratives = parseMissionAndProgramsFromLoaded(
                        loaded,
                    );
                    const people = parsePartVIIAPeopleFromLoaded(loaded);
                    const restrictions = parseRestrictionsFromLoaded(loaded);
                    // Restrictions inference layer (narrative + signal tags)
                    const inferredRestrictions =
                        inferRestrictionsFromNarratives(loaded, narratives);

                    if (!dryRun) {
                        await upsertReturnFinancials({
                            supabaseAdmin,
                            return_id: r.id,
                            parsed,
                        });

                        await bestEffortUpsertNarratives({
                            supabaseAdmin,
                            return_id: r.id,
                            narratives,
                        });

                        await bestEffortUpsertPeople({
                            supabaseAdmin,
                            return_id: r.id,
                            people,
                        });

                        await bestEffortUpsertRestrictions({
                            supabaseAdmin,
                            return_id: r.id,
                            restrictions: inferredRestrictions,
                        });

                        // await bestEffortUpsertRestrictions({
                        //     supabaseAdmin,
                        //     return_id: r.id,
                        //     restrictions,
                        // });

                        upserted++;
                    }
                } catch (e) {
                    parseErrors++;
                    const msg = (e && typeof e === "object" && "message" in e)
                        ? String((e as any).message)
                        : String(e);
                    console.warn(
                        `WARN: parse/upsert failed for return_id=${r.id}: ${msg}`,
                    );
                }

                if (processed % 50 === 0) {
                    console.log(
                        `Progress: processed=${processed.toLocaleString()} upserted=${upserted.toLocaleString()} missing_xml=${skippedMissingXml.toLocaleString()} errors=${parseErrors.toLocaleString()}`,
                    );
                }
            }

            if (limit && processed >= limit) break;

            if (rows.length < returnsPageSize) break;
            pageFrom += returnsPageSize;
        }

        if (limit && processed >= limit) break;
    }

    console.log(
        `Done. processed=${processed.toLocaleString()} upserted=${
            dryRun ? 0 : upserted.toLocaleString()
        } missing_xml=${skippedMissingXml.toLocaleString()} errors=${parseErrors.toLocaleString()}${
            dryRun ? " (dryRun)" : ""
        }`,
    );
}

async function main() {
    const args = parseArgs(process.argv);

    const district = args.district ? String(args.district) : null;
    const returnId = args.returnId ? String(args.returnId) : null;
    const xmlArg = args.xml ? String(args.xml) : null;
    const dryRun = Boolean(args.dryRun);
    const limit = args.limit ? Number(args.limit) : undefined;
    const statusesArg = args.statuses ? String(args.statuses) : null;
    const statuses = parseCommaList(statusesArg);

    if (limit != null && (!Number.isFinite(limit) || limit <= 0)) {
        throw new Error("--limit must be a positive number.");
    }

    if (district) {
        const effectiveStatuses = statuses.length
            ? statuses
            : ["candidate", "active"];
        await processDistrict({
            districtEntityId: district,
            statuses: effectiveStatuses,
            limit,
            dryRun,
        });
        return;
    }

    if (!returnId && !xmlArg) {
        throw new Error(
            "Usage: pass --district <DISTRICT_ENTITY_UUID> (preferred) or --returnId/--xml for single return.",
        );
    }

    const { return_id, xml_path, supabaseAdmin } = await resolveReturnAndXml({
        returnId,
        xmlPathArg: xmlArg,
    });

    const xml = await fsp.readFile(xml_path, "utf8");
    const loaded = loadXmlDoc(xml);

    const parsed = parseReturnFinancialsFromLoaded(loaded);
    const narratives = parseMissionAndProgramsFromLoaded(loaded);
    const people = parsePartVIIAPeopleFromLoaded(loaded);
    const restrictions = parseRestrictionsFromLoaded(loaded);
    const inferredRestrictions = inferRestrictionsFromNarratives(
        loaded,
        narratives,
    );

    // Always print a deterministic artifact for auditing.
    const artifact = {
        return_id,
        xml_path,
        parsed,
        narratives_count: narratives.length,
        people_count: people.length,
        restrictions_count: restrictions.length,
    };

    console.log(JSON.stringify(artifact, null, 2));

    if (dryRun) {
        console.log("Dry-run: not writing to irs.return_financials");
        return;
    }

    await upsertReturnFinancials({
        supabaseAdmin,
        return_id,
        parsed,
    });

    await bestEffortUpsertNarratives({
        supabaseAdmin,
        return_id,
        narratives,
    });

    await bestEffortUpsertPeople({
        supabaseAdmin,
        return_id,
        people,
    });

    await bestEffortUpsertRestrictions({
        supabaseAdmin,
        return_id,
        restrictions: inferredRestrictions,
    });

    console.log(
        `Upserted irs.return_financials (and best-effort narratives/people) for return_id=${return_id} narratives=${narratives.length} people=${people.length}`,
    );
}

main().catch((e) => {
    const msg = e && typeof e === "object" && "message" in e
        ? String((e as any).message)
        : String(e);
    console.error("ERROR:", msg);
    process.exit(1);
});
