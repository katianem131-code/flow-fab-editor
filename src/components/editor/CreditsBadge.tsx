import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";

export function CreditsBadge() {
  const { user, billing } = useBilling();
  if (!user) return null;
  return (
    <Link to="/planos" title="Planos e créditos" className="inline-flex items-center gap-1 rounded-md border border-accent/50 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10">
      <Coins className="h-3.5 w-3.5" /> {billing?.credits_balance ?? "…"}
    </Link>
  );
}
