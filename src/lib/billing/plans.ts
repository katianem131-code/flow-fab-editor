// Planos e pacotes vendidos na Cakto.
// `match` = palavra que aparece no nome do produto enviado pelo webhook.
// `checkoutUrl` = link do checkout na Cakto (preencher quando criar o produto).
export interface Plan { id: string; name: string; match: string; price: string; monthlyCredits: number; maxAccounts: number; checkoutUrl: string; features: string[] }
export interface CreditPack { id: string; name: string; match: string; price: string; credits: number; checkoutUrl: string }

export const PLANS: Plan[] = [
  { id: "basico", name: "Básico", match: "basico", price: "R$ 79/mês", monthlyCredits: 100, maxAccounts: 3, checkoutUrl: "", features: ["Até 3 contas conectadas", "100 vídeos por mês", "Editor completo", "Agenda de posts"] },
  { id: "pro", name: "Pro", match: "pro", price: "R$ 99/mês", monthlyCredits: 300, maxAccounts: 7, checkoutUrl: "", features: ["Até 7 contas conectadas", "300 vídeos por mês", "Descobrir virais", "Postagem automática"] },
  { id: "agencia", name: "Agência", match: "agencia", price: "R$ 149/mês", monthlyCredits: 800, maxAccounts: 15, checkoutUrl: "", features: ["Até 15 contas conectadas", "800 vídeos por mês", "Tudo do Pro", "Ideal para gerenciar clientes"] },
];

/** Contas permitidas sem plano ativo. */
export const FREE_ACCOUNTS = 1;

export function accountLimit(planName: string | null | undefined, status: string | null | undefined) {
  if (status !== "ativo") return FREE_ACCOUNTS;
  return PLANS.find((p) => p.name === planName)?.maxAccounts ?? FREE_ACCOUNTS;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "c50", name: "+50 créditos", match: "50 creditos", price: "R$ 19", credits: 50, checkoutUrl: "" },
  { id: "c200", name: "+200 créditos", match: "200 creditos", price: "R$ 59", credits: 200, checkoutUrl: "" },
];
