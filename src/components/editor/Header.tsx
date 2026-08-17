import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">LabRemix</span>
            <span className="text-[10px] text-muted-foreground">
              Remix inteligente. Resultado original.
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/admin"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Admin
          </Link>
          <Link
            to="/editor"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Abrir editor
          </Link>
        </nav>

      </div>
    </header>
  );
}
