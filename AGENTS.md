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
- Requests to /~oauth/* that reach the app are redirected to the preview host in src/server.ts — some preview hosts forward the Google sign-in path to the app instead of handling it, which showed a 404.
