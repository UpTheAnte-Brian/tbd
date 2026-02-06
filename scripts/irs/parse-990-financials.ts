/*
  Shared Form 990 XML financial parser

  Why this file exists
  - `import-990-bulk.ts` needs a best-effort way to populate irs.return_financials while ingesting XML.
  - `parse-990-return.ts` (deterministic phase-2) can also reuse the exact same extraction logic.

  Output is intentionally "wide" to match irs.return_financials columns and allow incremental completeness.
*/

import fsp from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type ParsedReturnFinancials = {
    total_revenue: number | null;
    total_expenses: number | null;
    excess_or_deficit: number | null;

    total_assets_begin: number | null;
    total_assets_end: number | null;
    total_liabilities_begin: number | null;
    total_liabilities_end: number | null;

    net_assets_begin: number | null;
    net_assets_end: number | null;

    contributions: number | null;
    program_service_revenue: number | null;
    investment_income: number | null;
    fundraising_gross: number | null;

    program_expenses: number | null;
    management_general_expenses: number | null;
    fundraising_expenses: number | null;

    source_map: Record<string, any>;
};

function asNumberOrNull(input: unknown): number | null {
    if (input == null) return null;
    if (typeof input === "number" && Number.isFinite(input)) return input;
    const s = String(input).trim();
    if (!s) return null;
    const cleaned = s.replace(/[^0-9\-\.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

function getByPath(obj: any, p: string): unknown {
    const parts = p.split(".").filter(Boolean);
    let cur: any = obj;
    for (const part of parts) {
        if (cur == null) return undefined;
        cur = cur[part];
        // In many XML shapes, repeating groups become arrays; for scalars, take the first.
        if (Array.isArray(cur)) cur = cur[0];
    }
    return cur;
}

function findFirstNumberFromDoc(
    doc: any,
    candidates: string[],
): { value: number | null; picked: string | null; raw?: unknown } {
    for (const p of candidates) {
        const raw = getByPath(doc, p);
        const n = asNumberOrNull(raw);
        if (n != null) return { value: n, picked: p, raw };
    }
    return { value: null, picked: null };
}

function loadXmlWithFastParser(
    xml: string,
): { doc: any | null; usedParser: boolean } {
    try {
        const { XMLParser } = require("fast-xml-parser");
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            removeNSPrefix: true,
        });
        return { doc: parser.parse(xml), usedParser: true };
    } catch {
        return { doc: null, usedParser: false };
    }
}

function setSource(
    source_map: Record<string, any>,
    key: keyof ParsedReturnFinancials | string,
    picked: string | null,
    raw?: unknown,
) {
    if (!picked) return;
    source_map[String(key)] = { path: picked, raw };
}

export async function parseReturnFinancialsFromXmlPath(
    xmlPath: string,
): Promise<ParsedReturnFinancials> {
    const xml = await fsp.readFile(xmlPath, "utf8");
    const { doc, usedParser } = loadXmlWithFastParser(xml);

    // NOTE: We intentionally include multiple candidates across 990/990EZ/990PF variants.
    const candidates = {
        // Core totals
        totalRevenue: [
            "Return.ReturnData.IRS990.CYTotalRevenueAmt",
            "Return.ReturnData.IRS990.TotalRevenueCurrentYearAmt",
            "Return.ReturnData.IRS990.TotalRevenueAmt",
            "Return.ReturnData.IRS990EZ.TotalRevenueAmt",
            "Return.ReturnData.IRS990EZ.CYTotalRevenueAmt",
            "Return.ReturnData.IRS990PF.TotalRevAndExpnssAmt",
            "Return.ReturnHeader.TotalRevenueAmt",
        ],
        totalExpenses: [
            "Return.ReturnData.IRS990.CYTotalExpensesAmt",
            // Some schemas expose total functional expenses as the headline number
            "Return.ReturnData.IRS990.TotalFunctionalExpensesAmt",
            "Return.ReturnData.IRS990.TotalExpensesCurrentYearAmt",
            "Return.ReturnData.IRS990EZ.TotalExpensesAmt",
            "Return.ReturnData.IRS990EZ.CYTotalExpensesAmt",
            "Return.ReturnData.IRS990PF.TotalExpensesAmt",
            "Return.ReturnHeader.TotalExpensesAmt",
        ],

        // Balance sheet
        totalAssetsBegin: [
            "Return.ReturnData.IRS990.TotalAssetsBOYAmt",
            "Return.ReturnData.IRS990EZ.TotalAssetsBOYAmt",
            "Return.ReturnData.IRS990PF.TotalAssetsBOYAmt",
        ],
        totalAssetsEnd: [
            "Return.ReturnData.IRS990.TotalAssetsEOYAmt",
            "Return.ReturnData.IRS990EZ.TotalAssetsEOYAmt",
            "Return.ReturnData.IRS990PF.TotalAssetsEOYAmt",
        ],
        totalLiabilitiesBegin: [
            "Return.ReturnData.IRS990.TotalLiabilitiesBOYAmt",
            "Return.ReturnData.IRS990EZ.TotalLiabilitiesBOYAmt",
            "Return.ReturnData.IRS990PF.TotalLiabilitiesBOYAmt",
        ],
        totalLiabilitiesEnd: [
            "Return.ReturnData.IRS990.TotalLiabilitiesEOYAmt",
            "Return.ReturnData.IRS990EZ.TotalLiabilitiesEOYAmt",
            "Return.ReturnData.IRS990PF.TotalLiabilitiesEOYAmt",
        ],

        // Net assets / fund balances
        netAssetsBegin: [
            "Return.ReturnData.IRS990.NetAssetsOrFundBalancesBOYAmt",
            "Return.ReturnData.IRS990.TotalNetAssetsFundBalancesBOYAmt",
            "Return.ReturnData.IRS990EZ.NetAssetsOrFundBalancesBOYAmt",
            "Return.ReturnData.IRS990EZ.TotalNetAssetsFundBalancesBOYAmt",
            "Return.ReturnData.IRS990PF.NetAssetsBOYAmt",
        ],
        netAssetsEnd: [
            "Return.ReturnData.IRS990.NetAssetsOrFundBalancesEOYAmt",
            "Return.ReturnData.IRS990.TotalNetAssetsFundBalancesEOYAmt",
            "Return.ReturnData.IRS990EZ.NetAssetsOrFundBalancesEOYAmt",
            "Return.ReturnData.IRS990EZ.TotalNetAssetsFundBalancesEOYAmt",
            "Return.ReturnData.IRS990PF.NetAssetsEOYAmt",
            "Return.ReturnHeader.NetAssetsEOYAmt",
        ],

        // Revenue components
        contributions: [
            "Return.ReturnData.IRS990.CYContributionsGrantsAmt",
            "Return.ReturnData.IRS990.ContributionsGiftsGrantsEtcAmt",
            "Return.ReturnData.IRS990.TotalContributionsAmt",
            "Return.ReturnData.IRS990EZ.ContributionsGiftsGrantsEtcAmt",
            "Return.ReturnData.IRS990EZ.TotalContributionsAmt",
            "Return.ReturnData.IRS990PF.ContributionsGiftsAmt",
            "Return.ReturnHeader.ContributionsAmt",
        ],
        programServiceRevenue: [
            "Return.ReturnData.IRS990.CYProgramServiceRevenueAmt",
            "Return.ReturnData.IRS990.ProgramServiceRevenueAmt",
            "Return.ReturnData.IRS990EZ.ProgramServiceRevenueAmt",
        ],
        investmentIncome: [
            // Part VIII line 11 (varies a lot across schema vintages)
            "Return.ReturnData.IRS990.CYTotalInvestmentIncomeAmt",
            "Return.ReturnData.IRS990.TotalInvestmentIncomeAmt",
            "Return.ReturnData.IRS990.CYInvestmentIncomeAmt",
            "Return.ReturnData.IRS990.InvestmentIncomeAmt",
            "Return.ReturnData.IRS990.CYInterestIncomeAmt",
            "Return.ReturnData.IRS990.InterestIncomeAmt",
            "Return.ReturnData.IRS990.CYDividendsAndInterestAmt",
            "Return.ReturnData.IRS990.DividendsAndInterestAmt",
            // Some filings break out interest/dividends under a group
            "Return.ReturnData.IRS990.InvestmentIncomeGrp.CYInvestmentIncomeAmt",
            "Return.ReturnData.IRS990.InvestmentIncomeGrp.InvestmentIncomeAmt",

            // 990EZ equivalents
            "Return.ReturnData.IRS990EZ.TotalInvestmentIncomeAmt",
            "Return.ReturnData.IRS990EZ.CYTotalInvestmentIncomeAmt",
            "Return.ReturnData.IRS990EZ.InvestmentIncomeAmt",
            "Return.ReturnData.IRS990EZ.CYInvestmentIncomeAmt",

            // PF often needs separate parsing; keep as last-resort fallback only.
            "Return.ReturnData.IRS990PF.TotalRevAndExpnssAmt",
        ],
        fundraisingGross: [
            "Return.ReturnData.IRS990.FundraisingGrossIncomeAmt",
            "Return.ReturnData.IRS990EZ.FundraisingGrossIncomeAmt",
        ],

        // Functional expense split (Part IX)
        programExpenses: [
            // Part IX (Functional expenses) - can appear as a top-level value
            "Return.ReturnData.IRS990.ProgramServiceExpensesAmt",
            "Return.ReturnData.IRS990.CYProgramServiceExpensesAmt",

            // Or as a grouped breakdown under TotalFunctionalExpensesGrp
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.ProgramServicesAmt",
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.ProgramServiceAmt",
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.ProgramServicesExpensesAmt",

            // Some older schema variants
            "Return.ReturnData.IRS990.FunctionalExpensesGrp.ProgramServicesAmt",
            "Return.ReturnData.IRS990.FunctionalExpensesGrp.ProgramServiceAmt",
        ],
        managementGeneralExpenses: [
            // Part IX - can appear as a top-level value
            "Return.ReturnData.IRS990.ManagementAndGeneralExpensesAmt",
            "Return.ReturnData.IRS990.CYManagementAndGeneralExpensesAmt",

            // Or grouped
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.ManagementAndGeneralAmt",
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.MngmntAndGeneralAmt",

            // Older schema variants
            "Return.ReturnData.IRS990.FunctionalExpensesGrp.ManagementAndGeneralAmt",
            "Return.ReturnData.IRS990.FunctionalExpensesGrp.MngmntAndGeneralAmt",
        ],
        fundraisingExpenses: [
            // Part IX - can appear as a top-level value
            "Return.ReturnData.IRS990.FundraisingExpensesAmt",
            "Return.ReturnData.IRS990.CYFundraisingExpensesAmt",

            // Or grouped
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.FundraisingAmt",
            "Return.ReturnData.IRS990.TotalFunctionalExpensesGrp.FundraisingExpensesAmt",

            // Older schema variants
            "Return.ReturnData.IRS990.FunctionalExpensesGrp.FundraisingAmt",
            "Return.ReturnData.IRS990.FunctionalExpensesGrp.FundraisingExpensesAmt",
        ],
    } as const;

    const source_map: Record<string, any> = {
        parser: { path: usedParser ? "fast-xml-parser" : "none" },
    };

    let total_revenue: number | null = null;
    let total_expenses: number | null = null;
    let contributions: number | null = null;
    let net_assets_begin: number | null = null;
    let net_assets_end: number | null = null;

    let total_assets_begin: number | null = null;
    let total_assets_end: number | null = null;
    let total_liabilities_begin: number | null = null;
    let total_liabilities_end: number | null = null;

    let program_service_revenue: number | null = null;
    let investment_income: number | null = null;
    let fundraising_gross: number | null = null;

    let program_expenses: number | null = null;
    let management_general_expenses: number | null = null;
    let fundraising_expenses: number | null = null;

    if (usedParser && doc) {
        const tr = findFirstNumberFromDoc(doc, [...candidates.totalRevenue]);
        total_revenue = tr.value;
        setSource(source_map, "total_revenue", tr.picked, tr.raw);

        const te = findFirstNumberFromDoc(doc, [...candidates.totalExpenses]);
        total_expenses = te.value;
        setSource(source_map, "total_expenses", te.picked, te.raw);

        const c = findFirstNumberFromDoc(doc, [...candidates.contributions]);
        contributions = c.value;
        setSource(source_map, "contributions", c.picked, c.raw);

        const nab = findFirstNumberFromDoc(doc, [...candidates.netAssetsBegin]);
        net_assets_begin = nab.value;
        setSource(source_map, "net_assets_begin", nab.picked, nab.raw);

        const nae = findFirstNumberFromDoc(doc, [...candidates.netAssetsEnd]);
        net_assets_end = nae.value;
        setSource(source_map, "net_assets_end", nae.picked, nae.raw);

        const tab = findFirstNumberFromDoc(doc, [
            ...candidates.totalAssetsBegin,
        ]);
        total_assets_begin = tab.value;
        setSource(source_map, "total_assets_begin", tab.picked, tab.raw);

        const tae = findFirstNumberFromDoc(doc, [...candidates.totalAssetsEnd]);
        total_assets_end = tae.value;
        setSource(source_map, "total_assets_end", tae.picked, tae.raw);

        const tlb = findFirstNumberFromDoc(doc, [
            ...candidates.totalLiabilitiesBegin,
        ]);
        total_liabilities_begin = tlb.value;
        setSource(source_map, "total_liabilities_begin", tlb.picked, tlb.raw);

        const tle = findFirstNumberFromDoc(doc, [
            ...candidates.totalLiabilitiesEnd,
        ]);
        total_liabilities_end = tle.value;
        setSource(source_map, "total_liabilities_end", tle.picked, tle.raw);

        const psr = findFirstNumberFromDoc(doc, [
            ...candidates.programServiceRevenue,
        ]);
        program_service_revenue = psr.value;
        setSource(source_map, "program_service_revenue", psr.picked, psr.raw);

        const inv = findFirstNumberFromDoc(doc, [
            ...candidates.investmentIncome,
        ]);
        investment_income = inv.value;
        setSource(source_map, "investment_income", inv.picked, inv.raw);

        const frg = findFirstNumberFromDoc(doc, [
            ...candidates.fundraisingGross,
        ]);
        fundraising_gross = frg.value;
        setSource(source_map, "fundraising_gross", frg.picked, frg.raw);

        const pe = findFirstNumberFromDoc(doc, [...candidates.programExpenses]);
        program_expenses = pe.value;
        setSource(source_map, "program_expenses", pe.picked, pe.raw);

        const mge = findFirstNumberFromDoc(doc, [
            ...candidates.managementGeneralExpenses,
        ]);
        management_general_expenses = mge.value;
        setSource(
            source_map,
            "management_general_expenses",
            mge.picked,
            mge.raw,
        );

        const fe = findFirstNumberFromDoc(doc, [
            ...candidates.fundraisingExpenses,
        ]);
        fundraising_expenses = fe.value;
        setSource(source_map, "fundraising_expenses", fe.picked, fe.raw);
    }

    const excess_or_deficit = total_revenue != null && total_expenses != null
        ? total_revenue - total_expenses
        : null;

    // We also persist the computed field so downstream UI doesn't need to recompute.
    if (excess_or_deficit != null) {
        source_map.excess_or_deficit = {
            computed: true,
            from: ["total_revenue", "total_expenses"],
        };
    }

    return {
        total_revenue,
        total_expenses,
        excess_or_deficit,

        total_assets_begin,
        total_assets_end,
        total_liabilities_begin,
        total_liabilities_end,

        net_assets_begin,
        net_assets_end,

        contributions,
        program_service_revenue,
        investment_income,
        fundraising_gross,

        program_expenses,
        management_general_expenses,
        fundraising_expenses,

        source_map,
    };
}
