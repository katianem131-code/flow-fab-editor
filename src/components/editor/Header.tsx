import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { CreditsBadge } from "./CreditsBadge";

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-3 sm:px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">LabRemix</span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              Remix inteligente. Resultado original.
            </span>
          </div>
        </Link>
        <nav className="flex min-w-0 items-center gap-1 text-sm sm:gap-2">
          <Link
            to="/descobrir"
            className="hidden rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:block"
          >
            Virais
          </Link>
          <Link
            to="/agenda"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Agenda
          </Link>
          <Link
            to="/admin"
            className="hidden rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:block"
          >
            Admin
          </Link>
          <Link
            to="/"
            className="whitespace-nowrap rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 sm:px-3"
          >
            Novo lote
          </Link>
          <CreditsBadge />
          <UserMenu />
        </nav>

      </div>
    </header>
  );
}
