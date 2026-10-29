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

## Architecture rules
- Multi-tenant: every business table carries `establishment_id`; RLS uses `is_member` / `has_est_role` security-definer helpers — never trust client-side role checks.
- Order totals are computed only in the `place_order` SQL function (and `src/lib/pricing.ts` for previews) from DB prices — never from AI output.
- AI attendant is shared in `src/lib/attendant.server.ts`, invoked by the authenticated simulator and verified messaging processor; it may only reference DB menu IDs so channels use identical pricing safeguards.
- Order idempotency uses tenant-scoped `request_key` under an establishment row lock; staff status changes use `transition_order`, never direct order updates, to protect money and payment state.
- Z-API events use database leases and durable send checkpoints; uncertain sends require review rather than automatic resend. Recovery runs on subsequent verified deliveries, so quiet periods delay retries.
- Simulator orders are created with `is_test = true` and an idempotency key so test sessions never duplicate or bill.
- External integrations (WhatsApp, payments, printing) must show explicit pending/connected states; never fake a connection.
