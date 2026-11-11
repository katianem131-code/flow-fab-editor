// Planos e pacotes vendidos na plataforma externa (Kiwify, Hotmart, Eduzz...).
// `match` = palavra que aparece no nome do produto enviado pelo webhook.
// `checkoutUrl` = link do checkout na plataforma (preencher quando criar o produto).
export interface Plan { id: string; name: string; match: string; price: string; monthlyCredits: number; checkoutUrl: string; features: string[] }
export interface CreditPack { id: string; name: string; match: string; price: string; credits: number; checkoutUrl: string }

export const PLANS: Plan[] = [
  { id: "basico", name: "Básico", match: "basico", price: "R$ 47/mês", monthlyCredits: 100, checkoutUrl: "", features: ["100 vídeos por mês", "Editor completo", "Agenda de posts"] },
  { id: "pro", name: "Pro", match: "pro", price: "R$ 97/mês", monthlyCredits: 300, checkoutUrl: "", features: ["300 vídeos por mês", "Descobrir virais", "Postagem automática no Instagram"] },
];

export const CREDIT_PACKS: CreditPack[] = [
  { id: "c50", name: "+50 créditos", match: "50 creditos", price: "R$ 19", credits: 50, checkoutUrl: "" },
  { id: "c200", name: "+200 créditos", match: "200 creditos", price: "R$ 59", credits: 200, checkoutUrl: "" },
];
