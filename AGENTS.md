<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Built-in framing templates are defined in `src/lib/editor/templates.ts` and applied atomically through the editor store; this keeps thumbnails, batch/single scope, and exported framing on the same settings without replacing text or overlays.
- Browser export encoding settings live in `src/lib/editor/encoding.ts` so the processing pipeline and regression tests share the same configuration.
- The mobile editor uses a viewport-height layout with an independently scrolling adjustment panel so the video preview stays visible while editing.
- Cloud sync lives in `src/lib/cloud/sync.ts`; local stores (batches, batchStorage, schedule) call it fire-and-forget so the app still works signed out and offline.
- Meta OAuth uses server-configured Business Login code flow and an HttpOnly per-attempt binding plus an atomic session-bound state RPC; browser code never receives provider tokens.
- Instagram delivery uses service-only leased RPCs and stable per-account destination rows; persist write intent before requests and reconcile unknown outcomes without replaying completed destinations.
- Meta callback diagnostics go only through `src/lib/meta/diagnostics.ts` (schema-validated enums and counts with a random per-attempt ID); never log tokens, codes, state, IDs, usernames, URLs or raw Graph data.
