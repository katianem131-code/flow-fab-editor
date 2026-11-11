# Meta integration corrections — no deployment

## Scope and verification

Implemented the server-configured Facebook Login for Business code flow (the configuration controls the available Unified Login experience). Direct Instagram Login is not claimed as a separate implemented flow. No permission request, OAuth consent, provider-token generation, secret change, external cron, publishing request, payment change or deployment was performed.

Account discovery for User tokens follows `/me/accounts` with cursor pagination. System-user tokens use delegated Page IDs returned by `debug_token.granular_scopes`, then read each Page's Instagram account. Missing delegated IDs stop onboarding as incomplete rather than guessing assets or adding `business_management`/advertising permissions. SUAT asset discovery and actual token-type responses must still be confirmed against the selected Meta configuration; offline fixtures cannot establish that a particular configuration returns those fields. The business portfolio ID is context, not a configuration ID or an authorization grant.

`fb_exchange_token` is used only after the code result is checked as a Facebook User token; system-user code results are not exchanged again. Publication uses the delegated system-user token or a discovered Page token, with actual debug-token expiration (zero means no fixed expiration, not immunity to revocation). Invalid/expired/data-access-expired tokens stop delivery.

## Security and delivery

- OAuth state lasts ten minutes, binds to the initiating user, Supabase session ID, exact callback and an HttpOnly/Secure/SameSite=Lax per-attempt cookie. `DELETE ... RETURNING` consumes it once only while the session exists and its maximum lifetime is valid. Cancelled attempts with valid binding also consume state.
- Postgres claims one post using `FOR UPDATE SKIP LOCKED`, assigns a 120-second lease, and fences all destination mutations with worker ID and lease expiry.
- One invocation advances one destination by one step; HTTP requests have eight-second timeouts, no blocking polling loop. Intent is stored before container creation or publication.
- Destination rows preserve stable account ID, container ID, media ID, phase and retries. Published destinations never replay after sibling failure. Legacy handle-only schedules require reselecting connected accounts.
- Interrupted writes become `unknown`. Known containers are queried read-only: `PUBLISHED` confirms delivery, but if no media ID was returned it stays unresolved rather than inventing one. `FINISHED` does not justify republishing an uncertain write. Unknown creation without a container and exhausted uncertain reconciliation require manual investigation; no blind retries.
- RLS and server guards validate account/video ownership and storage-path ownership, reject cross-user batch references and lock active delivery edits. Destination writes and OAuth/token reads are service-only. Tokens have no browser grants/policies.
- The `videos` bucket was confirmed private by a read-only query. Container creation requires it remain private. Signed video URLs last 24 hours and must be externally reachable HTTPS. No signed URLs or raw provider errors are returned by cron responses.

## Applied migrations

1. `20261111021446_a9151733-ff6f-4ce1-bf98-418fa0d4007b.sql`: atomic state, destinations, leases, owner guards, RLS.
2. `20261111021519_4ff16a9d-83a0-490d-8a9f-c61c0a71674f.sql`: revoke direct execution of ownership trigger guard.
3. `20261111021849_41e00cda-d2de-4701-b8fd-cd69f5fa7dae.sql`: bounded unknown reconciliation and session maximum-lifetime validation.

All three applied successfully; none pending. Readback confirmed anon/authenticated cannot execute the five new service-only/trigger functions. Linter reports two deliberately policy-free internal tables (states and tokens), and the pre-existing authenticated SECURITY DEFINER credit function; payments were not modified.

## Tests and checks

- `bunx vitest run src/lib/meta/publishing.test.ts src/lib/meta/graph.test.ts`: 12 tests, including concurrent creation, partial failure, resume, ambiguous reconciliation, storage isolation, minimal authorization URL, expiry and revocation.
- `python3 src/lib/meta/database.test.py`: five SQL integration tests against a disposable local PostgreSQL with production migration SQL, including simultaneous claims, lease fencing/recovery, simultaneous state consumption/replay, expired/signed-out states and cross-user RLS. Never run this fixture bootstrap on a hosted database.
- `bun test src/lib/editor/templates.test.ts src/lib/editor/encoding.test.ts`: five existing regression tests passed. Their first invocation with Vitest failed because they use `bun:test`; rerunning with Bun passed.
- Automatic preview build/typecheck: `build OK`, after fixing the nullable container narrowing error.
- Browser: Agenda renders with configuration-incomplete message and connection button disabled; unsigned cron returns 401; localhost callback is rejected with 403; zero page runtime errors. No signed-in OAuth or live posting flow was exercised, as prohibited.

## Manual configuration remaining (not performed)

- Verify existing `META_APP_ID` refers to app `2056146455756708`, associated with portfolio `2076601436361179`.
- Set the real `META_CONFIG_ID` from the Meta dashboard; do not use the app or portfolio ID in its place.
- Set `META_GRAPH_VERSION` to an officially supported version enabled for the app, and `META_TOKEN_KIND` to `user` or `system_user` to match that exact configuration. Documentation examples currently show v26.0; the app does not silently assume it.
- Configure only `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` and necessary Page/Instagram assets in that configuration. No ads, messaging, comments or Facebook Page publishing support is claimed.
- Exact production callback: `https://flow-fab-editor.lovable.app/api/public/meta/callback`. Additional HTTPS origins require explicit comma-separated `META_ALLOWED_ORIGINS` and exact dashboard callbacks. Localhost is not implicitly allowed.
- Keep the existing Meta secret and cron secret untouched. Ensure existing server storage configuration yields an external HTTPS Supabase Storage origin (`VITE_SUPABASE_URL` if a server-only origin needs remapping).
- Reselect connected accounts on legacy handle-only schedules. Investigate `unknown` outcomes manually rather than resetting/replaying them. No automatic cron setup was performed.
- OAuth consent and real per-destination publication/readback remain unverified until separately authorized.

## Official references consulted

- https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/get-started
- https://developers.facebook.com/docs/instagram-platform/content-publishing/
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login/

These distinct login surfaces were not treated as interchangeable; the implemented configuration-driven business code flow does not assume an Instagram User token or `ig_exchange_token`.