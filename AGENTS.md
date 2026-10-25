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

- All app data is client-only: zustand persist (localStorage) in src/lib/store.ts, audio files in IndexedDB (src/lib/audio.ts); app renders inside ClientOnly in __root — why: offline-first single-user app with no backend.
- Timer/stopwatch/countdown state lives in the global src/lib/timer.ts store, ticked by Engine in __root — why: timers must keep running across tab navigation.
- Reusable style primitives (panel, btn-*, field, chip, label-xs) are Tailwind `@utility` blocks in src/styles.css — why: v4 @apply only resolves utilities, not plain classes.
