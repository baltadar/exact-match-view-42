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

- Serve fixed homepage brand media from `public/media`; this avoids intermittent CDN authorization failures for core visuals.
- Any /~oauth/* request that reaches the app is forwarded straight to the sign-in service (src/lib/oauth-broker.ts, used by src/server.ts and the root 404 screen) — hosts don't always intercept that path, which showed a 404 on every host type.
