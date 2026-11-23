import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarClock,
  Download,
  FolderKanban,
  Gem,
  Menu,
  Pickaxe,
  Scissors,
  Settings,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import { CreditsBadge } from "./CreditsBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Item = {
  label: string;
  icon: typeof Scissors;
  to: "/" | "/descobrir" | "/agenda" | "/admin" | "/planos";
  hash?: string;
  match: (path: string, hash: string) => boolean;
};

const MAIN: Item[] = [
  { label: "Garimpar", icon: Pickaxe, to: "/descobrir", match: (p) => p.startsWith("/descobrir") },
  { label: "Baixar", icon: Download, to: "/", hash: "baixar", match: (p, h) => p === "/" && h === "baixar" },
  {
    label: "Projetos",
    icon: FolderKanban,
    to: "/",
    match: (p, h) =>
      (p === "/" && h !== "baixar") || ["/editor", "/carrossel", "/analise"].some((r) => p.startsWith(r)),
  },
  { label: "Agendar", icon: CalendarClock, to: "/agenda", match: (p) => p.startsWith("/agenda") },
];
const FOOT: Item[] = [
  { label: "Configurar", icon: Settings, to: "/admin", match: (p) => p.startsWith("/admin") },
  { label: "Créditos", icon: Gem, to: "/planos", match: (p) => p.startsWith("/planos") },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Scissors className="h-4 w-4" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">LabRemix</span>
        <span className="text-[10px] text-muted-foreground">Remix inteligente.</span>
      </div>
    </Link>
  );
}

function NavLink({ item, active, onClick }: { item: Item; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      hash={item.hash}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export function Header() {
  const location = useLocation();
  const path = location.pathname;
  const hash = (location.hash ?? "").replace(/^#/, "");
  const [moreOpen, setMoreOpen] = useState(false);
  const fullScreenTool = path.startsWith("/editor") || path.startsWith("/carrossel");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Logo />
        </div>
        <div className="px-3 pt-3">
          <Link
            to="/"
            hash="baixar"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Novo lote
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {MAIN.map((i) => (
            <NavLink key={i.label} item={i} active={i.match(path, hash)} />
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-border p-3">
          {FOOT.map((i) => (
            <NavLink key={i.label} item={i} active={i.match(path, hash)} />
          ))}
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <CreditsBadge />
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-3">
          <Logo />
          <div className="flex items-center gap-2">
            <CreditsBadge />
            <UserMenu />
            {fullScreenTool && (
              <button
                aria-label="Menu"
                onClick={() => setMoreOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-md border border-border"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom bar */}
      {!fullScreenTool && (
        <nav className="app-bottomnav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {MAIN.map((i) => {
            const Icon = i.icon;
            const active = i.match(path, hash);
            return (
              <Link
                key={i.label}
                to={i.to}
                hash={i.hash}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {i.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            Mais
          </button>
        </nav>
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="dark bg-background text-foreground">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-2">
            {(fullScreenTool ? [...MAIN, ...FOOT] : FOOT).map((i) => (
              <NavLink key={i.label} item={i} active={i.match(path, hash)} onClick={() => setMoreOpen(false)} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
