import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Billing { plan_name: string | null; plan_status: string; plan_renews_at: string | null; credits_balance: number }

export function useBilling() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing | null>(null);
  useEffect(() => {
    if (!user) return setBilling(null);
    supabase.from("user_billing").select("plan_name, plan_status, plan_renews_at, credits_balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setBilling(data));
  }, [user]);
  return { user, billing };
}
