import type { Receipt } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server";

type DonationRow = {
    id: string;
    amount: number;
    created_at: string;
    district?: { shortname: string }[];
    stripe_session_id: string;
    user_id?: string;
    type?: "platform" | "district";
    email?: string | null;
    receipt_url?: string | null;
    subscription_id?: string | null;
    invoice_id?: string | null;
};

export async function getReceipts(): Promise<Receipt[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("donations")
        .select(`
            id,
            amount,
            created_at,
            stripe_session_id,
            user_id,
            type,
            email,
            receipt_url,
            subscription_id,
            invoice_id,
            district:district_id(shortname)
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return (data as DonationRow[]).map((r) => ({
        id: r.id,
        amount: r.amount,
        date: new Date(r.created_at).toISOString().split("T")[0],
        district_name: r.district?.[0]?.shortname ?? undefined,
        stripe_session_id: r.stripe_session_id ?? undefined,
        user_id: r.user_id ?? undefined,
        type: r.type ?? undefined,
        email: r.email ?? undefined,
        invoice_id: r.invoice_id ?? undefined,
        receipt_url: r.receipt_url ?? undefined,
        subscription_id: r.subscription_id ?? undefined,
    }));
}

export async function getReceiptBySessionId(
    stripeSessionId: string,
): Promise<Receipt | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("donations")
        .select(`
            id,
            amount,
            created_at,
            stripe_session_id,
            user_id,
            type,
            email,
            receipt_url,
            subscription_id,
            invoice_id,
            district:district_id(shortname)
        `)
        .eq("stripe_session_id", stripeSessionId)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const r = data as DonationRow;
    return {
        id: r.id,
        amount: r.amount,
        date: new Date(r.created_at).toISOString().split("T")[0],
        district_name: r.district?.[0]?.shortname ?? undefined,
        stripe_session_id: r.stripe_session_id ?? undefined,
        user_id: r.user_id ?? undefined,
        type: r.type ?? undefined,
        email: r.email ?? undefined,
        invoice_id: r.invoice_id ?? undefined,
        receipt_url: r.receipt_url ?? undefined,
        subscription_id: r.subscription_id ?? undefined,
    };
}
