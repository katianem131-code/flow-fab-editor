import type { ReactNode } from "react";

export const LEGAL_CONTACT = "brasmon@hotmail.com";
export const LEGAL_OWNER = "Enoque Marques dos Santos";

export function LegalLinks() {
  return (
    <nav aria-label="Informações legais" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <a className="underline underline-offset-4 hover:text-foreground" href="/privacidade">Privacidade</a>
      <a className="underline underline-offset-4 hover:text-foreground" href="/termos">Termos de Uso</a>
      <a className="underline underline-offset-4 hover:text-foreground" href="/exclusao-de-dados">Exclusão de dados</a>
    </nav>
  );
}

export function LegalContact() {
  return <p>Responsável pelo LabRemix: {LEGAL_OWNER}. Contato: <a className="underline" href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.</p>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3"><h2 className="text-lg font-semibold text-foreground">{title}</h2>{children}</section>;
}

export function LegalLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <a href="/" className="text-lg font-semibold">LabRemix</a>
          <a href="/auth" className="text-sm underline underline-offset-4">Acessar aplicativo</a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-sm leading-7 text-muted-foreground">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p>Última atualização: 24 de novembro de 2026.</p>
          <p>{intro}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
