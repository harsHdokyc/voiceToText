# UI Execution Planner

**Status:** plan only — no implementation in this document.  
**Source of truth (visual + interaction):** `ui/goals-in-motion-55/` (Saydo prototype) — **Workspace / dashboard only** for this execution.  
**Target:** this Expo app (`app/`, `src/`) on **iOS, Android, and Expo web** — same look, same product behaviors, wired to the real backend already shipped in Phases 0–7.  
**Product name:** **Saydo** (replace “Voice-to-Work” in app chrome, titles, and user-facing copy).  
**Engineering mode:** `.cursor/rules/01-simple-engineering.mdc` — climb the ladder before writing code; shortest working diff; reuse existing feature services; no new stack.

### Locked decisions (2026-10-10)

| # | Decision |
|---|---|
| 1 | **Display name:** Persist a real name via `public.profiles.display_name` (column already exists). Settings save updates the profile; Overview greeting uses it. |
| 2 | **Categories:** Add note category to schema + UI chips `All notes \| Work \| Ideas \| Personal` (same as prototype). |
| 3 | **Marketing site:** Later. This execution focuses **only** on Workspace / dashboard (plus auth chrome needed to enter it). Leave `ui/` marketing pages as reference; do not port home/product/FAQ/early-access into Expo now. |
| 4 | **Brand:** Product name is **Saydo**, not Voice-to-Work. |

---

## 0. How to use this plan

1. Execute **one step at a time**. Do not start step *N+1* until step *N* exit criteria pass.
2. Before each step, re-run the ladder: *Need it? Already exists? Stdlib/native? Existing dep? One line? Then minimum code.*
3. Treat `ui/goals-in-motion-55` as a **pixel / copy / interaction reference**, not as code to paste wholesale (it is TanStack Start + Tailwind + DOM; the product is Expo Router + React Native).
4. Prefer product truth from `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/01_PRD.md`, `docs/02_V1_SCOPE.md`. If a demo feature fights those, keep the **UI intent** and keep the **real backend contract**.
5. After each step that changes pure logic: side-by-side Vitest behavior tests (`.cursor/rules/07-testing.mdc`). Run `npm test` (+ `npm run typecheck` if types changed). Report exact results.

---

## 1. What the prototype actually ships

### 1.1 Surfaces in `ui/goals-in-motion-55`

**This execution ports only Workspace/dashboard (+ auth chrome).** Marketing rows are reference for later.

| Surface | Path | Role | In this execution? |
|---|---|---|---|
| Marketing home | `src/routes/index.tsx` + `components/home/*` | Landing, hero, story | Later |
| Product / journey | `product.tsx`, `how-it-works.tsx`, `Experience.tsx` | Interactive explainers | Later |
| Auth preview | `sign-in.tsx` + `SignInForm.tsx` | Demo form only (no real auth) | **Yes — restyle real auth** |
| **Workspace / dashboard** | `dashboard.tsx` → `Workspace.tsx` | **Primary product UI** | **Yes** |
| Settings (in workspace) | view inside `Workspace.tsx` | Display name only (demo) | **Yes — + real privacy/push/delete** |
| Legal / FAQ / early access | `terms`, `privacy`, `faq`, `early-access`, … | Marketing | Later |

### 1.2 Design system (must match)

Locked in `src/styles.css` + button variants:

| Token | Intent |
|---|---|
| Paper / ink / cobalt / lime / lavender / stone | Brand palette (oklch) |
| Fonts | Display: Space Grotesk · Body: Geist · Mono: Geist Mono |
| Surfaces | `surface-ink`, `surface-cobalt`, `surface-paper` |
| Buttons | `cta`, `ink`, `lime`, `quiet`, plus ghost/link/destructive |
| Eyebrow | Mono, uppercase, tracked |
| Motion | Soft enter/exit; `VoiceRibbon`; respect reduced motion |
| Mobile | Bottom 4-tab nav; 44px tap targets; safe-area padding |
| Desktop | Collapsible left sidebar (Overview / Voice notes / Suggestions / Tasks + Settings) |

### 1.3 Workspace views & behaviors (functional inventory)

Canonical implementation: `ui/goals-in-motion-55/src/components/workspace/Workspace.tsx` + `data.ts`.

#### Shell
- Sticky header: breadcrumb `Workspace / {view}` + **Capture a thought** CTA
- Desktop aside: Wordmark, **New voice note**, nav with Suggestions badge count, Settings, back link, avatar + display name
- Mobile: fixed bottom nav (4 items); Settings via link under content
- View switch clears search + active note

#### Overview
- Greeting with display name (italic cobalt)
- Counts: pending suggestions · open approved tasks
- Cobalt CTA band + `VoiceRibbon` → open capture
- Recent notes grid (colored cards: lavender / lime / muted)
- Preview rows: waiting suggestions (approve) + next steps (complete)

#### Voice notes
- List: category chips `All notes | Work | Ideas | Personal` + search
- Card: category, title, transcript clamp, time, open, overflow **Delete note** (cascades related tasks in demo)
- Detail: back, category/time, title, transcript + ribbon, pending suggestions for that note

#### Suggestions
- Copy: “Possibilities, not commitments”
- Pending list with Approve / Edit / Dismiss
- **Approve all**
- Empty → CTA to Tasks

#### Tasks
- Filters: Open / Completed / All (approved only)
- Complete toggle, edit, remove (dismiss), source-note link
- Due label via `dueLabel()` (Today / Tomorrow / Overdue / date / anytime string)

#### Capture dialog
- Speak (Web Speech API) or type; optional title; timer; sample fill
- **Turn into next steps** (AI → note + pending suggestions) OR **Just save note**
- Max draft 4000 chars; errors surfaced in dialog

#### Edit task / suggestion dialog
- Title, due presets (Today / Tomorrow / Next week) + date, reminder presets + datetime-local
- Saving reminder clears `reminded`; toast; optional Notification permission
- In-tab reminder poll every 15s (demo-only delivery)

#### Settings (workspace)
- Display name (max 30), save affordance
- Leave workspace → sign-in (demo)

### 1.4 Demo-only (do **not** copy as production truth)

| Demo behavior | Why not | Production replacement |
|---|---|---|
| In-memory `useState` notes/tasks | Not durable / not multi-device | Existing Supabase services + TanStack Query |
| Web Speech API dictation | Not the product capture path; weak on native | Existing `expo-audio` record → upload → `process-note` |
| Lovable gateway `generateNextSteps` | Wrong provider; secrets wrong place | Existing Edge `process-note` (OpenAI per `DECISIONS.md`) |
| Browser `Notification` + 15s poll | Not durable | Existing reminders + Expo push |
| Fake sign-in (navigate only) | No session | Existing auth screens + OTP flows |
| “Demo mode” footers / sample seed as sole data | Misleading in real app | Empty states + real user data; optional seed only in storybook/demo flag if ever needed |
| Note categories Work/Ideas/Personal | Demo used local strings only | **In scope:** small migration + filter UI (see Step 6a / 6) — not demo seed data |
| Marketing site as part of Expo shell | Not this execution | **Later** — Workspace/dashboard (+ auth) only for now; `ui/` marketing stays reference |

---

## 2. What the real app already has (reuse first)

Do not rebuild these — restyle and compose them.

| Capability | Where |
|---|---|
| Auth session / protected routes | `app/(auth)/*`, `app/(app)/_layout.tsx`, `auth-service` |
| Notes list / search / detail | `app/(app)/index.tsx`, `notes/[noteId].tsx`, `notes-service` |
| Record ≤60s → upload → process | `app/(app)/record.tsx`, recording + notes services |
| Suggestions approve/edit/reject | `suggestions-service` + note detail |
| Tasks list / edit / complete | `app/(app)/tasks/*`, `tasks-service` |
| Reminders 1h/3h/1d + cancel | task detail + `reminders-service` |
| Settings privacy / push / delete account | `app/(app)/settings.tsx` |
| Logging / UI errors | `withApiLog`, `ApiError`, `errorMessageForUi` |

**Gap:** UI is utilitarian RN `StyleSheet` (e.g. `#f7f7f5` / `#1f4b3a`). Structure is stack screens, not the Saydo workspace shell (Overview + four nav destinations + capture modal).

---

## 3. Target architecture (lazy)

```
app/(app)/
  _layout.tsx          → workspace shell (sidebar / bottom tabs) + theme
  index.tsx            → Overview
  notes/index.tsx      → Voice notes list (extract from home if needed)
  notes/[noteId].tsx   → Note detail (Saydo layout)
  suggestions.tsx      → Pending suggestions inbox (new thin route)
  tasks/index.tsx      → Tasks (Saydo filters)
  settings.tsx         → Settings (Saydo chrome + real privacy/delete/push)
  record.tsx           → Keep as capture engine; present as modal/sheet from shell CTA
src/
  theme.ts             → all design tokens (colors, type, space, radius, fonts)
  components/ui.tsx    → Button, TextField, Sheet, Eyebrow, VoiceRibbon, EmptyState
  components/workspace-shell.tsx + workspace-nav.ts
  features/...         → unchanged services; only add pure UI helpers if needed
```

**Rules**
- Route files stay thin; logic stays in `src/features/*`.
- No TanStack Start, no Tailwind-in-RN rewrite, no Radix port, no Lovable AI client.
- One shared theme for web + native; platform forks only where RN cannot do DOM (e.g. `Modal` / bottom sheet vs dialog).
- Suggestions inbox may be a **view composed from existing `getSuggestions` / list queries** — do not invent a second approval API.

---

## 4. Product mapping (exact UI intent → real function)

| Prototype action | Must feel the same | Wire to |
|---|---|---|
| New voice note / Capture | Modal/sheet with ribbon, timer, primary CTA | Open record flow; on success navigate to note detail (processing states visible) |
| Speak | Big mic / stop, live ribbon | Real recorder (not Web Speech). Optional later: typed “thought” only if product asks — **YAGNI for first pass** (record path already covers capture) |
| Turn into next steps | Thinking state → land on note with suggestions | `upload` + `process-note`; poll until `review_ready` |
| Just save note | Save without forcing AI wait UX | Same upload path; UI can emphasize “processing…” rather than inventing a no-AI path (backend always processes — **do not fork Edge** for demo’s “save only”) |
| Approve / Dismiss / Edit suggestion | Same row chrome | `approveSuggestion` / `rejectSuggestion` / edits via existing builders |
| Approve all | One control | Loop/batch using existing approve (extract pure helper if non-trivial; test it) |
| Complete task / reopen | Circle / check | Existing task complete mutation |
| Source note | Chevron link | `router` to `notes/[noteId]` |
| Delete note | Overflow menu | Existing `deleteNote` |
| Edit due / reminder | Dialog presets | Map presets onto existing due/reminder fields + reminder schedule APIs (1h/3h/1d already exist — match **visual presets** to those first; custom datetime only if already supported) |
| Settings display name | Field + save (max 30) | Read/update `profiles.display_name` (already on table; wire UI + service). Fallback greeting: email local-part only if name empty |
| Category filter / label | Chips + card eyebrow | Persist `notes.category`; filter list client- or query-side; default sensible value on create (e.g. `Ideas` or `Work` — pick one default in migration/service) |
| Sign out / leave | Quiet button | Real `signOut` |
| Auth screens | Match `SignInForm` layout/copy structure | Keep OTP / forgot / reset routes; restyle — do not collapse to demo single-form fake submit |

**Kind labels:** prototype shows `Task | Follow-up | Idea | Reminder`. App uses `task | follow_up | idea | reminder | question`. Map display labels in UI only; do not rename DB enums.

---

## 5. Out of scope for this UI execution (unless you explicitly expand)

- Porting the marketing site (home/product/FAQ/early-access/legal) into Expo — **explicitly later**; focus is Workspace/dashboard only.
- Replacing OpenAI Edge with Lovable.
- Web Speech as the primary capture path.
- New collaboration, billing, calendar, or broad marketing web surfaces (PRD non-goals for the app).
- New dependencies for styling (NativeWind/Tamagui) **unless** a spike proves StyleSheet+theme cannot hit parity in reasonable time — default is **no new dep**.
- Demo seed notes/tasks as production data.

---

## 6. Step-by-step execution

Each step: **goal → do → do not → exit**.

### Step 1 — Freeze the reference checklist

**Goal:** One checklist agents/humans can tick for visual+functional parity.

**Do**
- Extract a short parity checklist from §1.2–1.3 into the PR/issue (or keep this doc as the checklist).
- Screenshot or run the prototype locally for Overview / Notes / Suggestions / Tasks / Capture / Edit / mobile bottom nav / desktop sidebar.

**Do not**
- Change product code yet.

**Exit**
- Checklist exists and names every control in `Workspace.tsx` that must appear in the app.

**Status: done (2026-10-10).** Canonical checklist → [§11 Workspace parity checklist](#11-workspace-parity-checklist).

---

### Step 2 — Theme tokens only

**Goal:** Same colors, type, radii, shadows — no screen redesign yet.

**Do**
- Add single `src/theme.ts` with paper/ink/cobalt/lime/lavender/stone, fonts, spacing, radii from `styles.css`.
- Load Space Grotesk + Geist (+ Mono) via `expo-font` (already a dependency).
- Apply background/header tint in `app/(app)/_layout.tsx` and auth layout.

**Do not**
- Install Tailwind/NativeWind.
- Restyle every screen in this step.

**Exit**
- App shell background/fonts/header match Saydo paper/ink/cobalt.
- `npm run typecheck` clean if types touched.

**Status: done (2026-10-10).** All design tokens in `src/theme.ts`; fonts via `@expo-google-fonts/{space-grotesk,geist,geist-mono}`; shell tints on root / `(app)` / `(auth)` layouts; `APP_NAME` = Saydo.

---

### Step 3 — Primitive UI kit (minimum)

**Goal:** Reusable primitives so screens don’t invent one-off buttons.

**Do** (fewest files)
- `Button` variants: `cta | ink | lime | quiet | ghost | destructive` (+ sizes)
- `Eyebrow` text
- `TextField` / search field styling (`input-field` feel)
- `EmptyState` (inbox icon + title + body)
- `VoiceRibbon` (Reanimated; honor reduced motion)
- Modal/sheet wrapper for capture + edit

**Do not**
- Port the entire `components/ui/*` Radix library.
- Abstract a design-system package.

**Exit**
- Primitives render on a throwaway screen or Story-less smoke in existing settings/debug is optional; prefer using them immediately in Step 4.
- Any non-trivial pure variant mapping gets a tiny behavior test only if logic exists (else skip — presentational).

**Status: done (2026-10-10).** Primitives in `src/components/ui.tsx` (Button, Eyebrow, TextField, EmptyState, VoiceRibbon, Sheet). Used in shell + placeholder screens.

---

### Step 4 — Workspace shell (nav only)

**Goal:** Exact information architecture: Overview / Voice notes / Suggestions / Tasks (+ Settings).

**Do**
- Restructure `app/(app)/_layout.tsx`:
  - **Web/desktop (≥md):** collapsible sidebar matching prototype
  - **Mobile:** bottom tab bar matching `workspace-mobile-nav` (4 items)
- Wire routes to existing screens; add thin `suggestions` route if missing.
- Header: `Workspace / {section}` + Capture CTA opening record/capture.
- Sidebar wordmark / titles: **Saydo** (not Voice-to-Work).
- Suggestions nav badge = count of pending suggestions (query; reuse services).

**Do not**
- Put business logic in the layout.
- Keep the old flat “Notes title + Record + Tasks” home as the primary IA.
- Port marketing routes into the app shell.

**Exit**
- Mobile and web can reach all four primary destinations + Settings.
- Capture CTA visible in header on both breakpoints.
- Auth gate unchanged (signed-out → sign-in).
- User-facing product name reads Saydo.

**Status: done (2026-10-10).** `WorkspaceShell` + nav helper; desktop ink sidebar + mobile bottom tabs; header Capture CTA → record modal; Suggestions badge via `countPendingSuggestions`; routes: Overview `index`, Voice notes `notes/index`, `suggestions`, tasks, settings.

---

### Step 5 — Overview screen (composition)

**Goal:** Same Overview composition and copy hierarchy.

**Do**
- Rebuild `app/(app)/index.tsx` as Overview:
  - Greeting from `profiles.display_name` (fallback: email local-part)
  - To review / Next steps counts
  - Cobalt band + VoiceRibbon + New voice note
  - Recent notes (real `listNotes`, newest first; card colors rotate lavender/lime/muted; show category when present)
  - Two columns (stack on mobile): pending suggestions preview + open tasks preview
- Loading / empty / error via Query (no silent empty).

**Do not**
- Seed fake `initialNotes` in production builds.
- Fetch in the route beyond composing hooks/services.

**Exit**
- Overview matches prototype layout at mobile + desktop widths.
- Counts and lists reflect live data.
- Greeting shows the persisted display name when set.
- `npm test` still passes.

**Status: done (2026-10-10).** Overview in `app/(app)/index.tsx` — greeting via `profiles.display_name`, counts, cobalt band + VoiceRibbon, recent `NoteCardGrid`, pending approve/dismiss preview, open tasks preview.

---

### Step 6a — Note category schema (before list UI)

**Goal:** Real categories matching prototype chips — not fake client-only filters.

**Do**
- Small migration on `public.notes`:
  - `category text not null` (or nullable with default) constrained to `Work | Ideas | Personal` (check constraint or enum — prefer check text matching prototype labels)
  - Default for existing + new rows: e.g. `Ideas`
  - Index `(user_id, category)` only if list filter will query by it often (optional; YAGNI until measured)
- Extend `notes-service` create/list/update to read/write `category`.
- Allow changing category on note detail (minimal control) so chips aren’t dead-end labels.
- Pure helper for filter predicate + Vitest (All vs one category).
- RLS unchanged (still own-row only); grants unchanged pattern.

**Do not**
- Invent extra categories beyond the prototype set.
- Client-only category that isn’t persisted.

**Exit**
- Migration applied (local/hosted as you normally ship).
- Create note gets a default category; list can filter by category via real data.
- `npm test` covers filter/default helper behavior.

**Status: done (2026-10-10).** Migration `note_category` applied on hosted `voiceToWork`; helpers in `note-category.ts`; `notes-service` read/write/default `Ideas`.

---

### Step 6 — Voice notes list + detail

**Goal:** Same list/detail UX; real note lifecycle.

**Do**
- Notes list: search; category chips `All notes | Work | Ideas | Personal` wired to Step 6a field; cards with category eyebrow, title, transcript preview, relative time, open, delete menu.
- Detail: category/time, transcript block + ribbon; suggestions panel; processing states (`queued` / `transcribing` / `extracting` / failures + retry) styled into the same page chrome; keep edit title/transcript if already present; edit category.
- Delete uses real delete + query invalidation.

**Do not**
- Drop processing/retry — prototype didn’t show it, but production needs it (honest empty/error UI in the same visual language).
- Port demo cascade-delete of tasks in the client if the Edge/DB already handles ownership cleanup — call the real API once.
- Ship chips before Step 6a lands.

**Exit**
- List/detail look like Saydo; category filter works on real rows; approve/reject/edit still work; delete works; cross-user still denied (no RLS weaken).

**Status: done (2026-10-10).** Notes list chips + search + cards; detail with category, transcript/ribbon, processing, suggestions approve/dismiss, delete.

---

### Step 7 — Suggestions inbox

**Goal:** Global “Your call” view.

**Do**
- Aggregate pending suggestions across notes (smallest query approach that already fits RLS — e.g. list notes’ suggestions or a single filtered select via existing patterns).
- Rows = prototype `taskRows(..., review=true)`.
- Approve all = sequential/batched approve through existing service; extract pure “partition pending” helper if needed + behavior test.
- Empty state + Go to tasks.

**Do not**
- New Edge function for approve-all.
- Auto-approve anything.

**Exit**
- Inbox matches prototype; approving creates exactly one task per suggestion (existing idempotency).

**Status: done (2026-10-10).** Suggestions inbox + Approve all (sequential `approveSuggestion`); `pendingSuggestionIds` helper; rows via `SuggestionReviewRow`.

---

### Step 8 — Tasks view

**Goal:** “Make progress” with Open / Completed / All.

**Do**
- Restyle `tasks/index` to prototype filters and row layout.
- Complete toggle, edit entry, remove/archive per existing semantics.
- Source note link.
- Due display: port `dueLabel` as a pure helper next to tasks feature (adapt to app’s date fields) + Vitest like `data.test.ts`.

**Do not**
- Reimplement task storage.
- Add kanban/board.

**Exit**
- Filters behave; completion persists; tests cover `dueLabel` (and any new pure filter helper).

**Status: done (2026-10-10).** Tasks Open/Completed/All; `dueLabel` + `taskListQueryForFilter`; complete/reopen, edit → detail, remove → archive; source note link.

---

### Step 9 — Capture flow (visual parity on real recorder)

**Goal:** Capture feels like the dialog; engine stays `expo-audio` + upload.

**Do**
- Present record UI as modal/sheet from shell CTA (and Overview band).
- Include: title copy “Catch that thought.”, description, VoiceRibbon tied to `isRecording`, mic/stop, mm:ss timer, primary “Turn into next steps” (stop → upload → process → note), secondary only if it maps cleanly (otherwise one primary CTA is enough — **do not** add a fake no-process path).
- Cap at existing `MAX_AUDIO_DURATION_SECONDS` (60); show errors with `errorMessageForUi`.
- On success: close sheet, go to note detail (active processing UI).

**Do not**
- Web Speech API as primary.
- Call Lovable / add `next-steps.functions.ts`.
- Log audio/transcripts.

**Exit**
- Happy path: record → note → transcript/suggestions.
- Failure path: permission denied / upload fail shows reason; note recoverable per existing retry.

**Status: done (2026-10-13).** Transparent modal `record` screen matching Dialog copy/layout; Speak/Stop + `formatCaptureTimer` + VoiceRibbon; Turn into next steps → upload → process → note detail. No Web Speech / sample / just-save.

---

### Step 10 — Edit suggestion / task + reminders

**Goal:** Edit dialog look; reminder behavior stays durable.

**Do**
- Shared edit sheet: title, due presets, reminder presets styled like prototype.
- Map reminder presets to **existing** schedule APIs (1h / 3h / 1d) first for parity of *intent*.
- Custom datetime only if current schema/API already supports it; otherwise show presets only (ponytail comment if deferring custom picker).

**Do not**
- Reintroduce in-tab 15s toast poll as the real reminder system.
- Put reminder secrets or Expo push logic in the UI kit.

**Exit**
- Edit + reminder schedule/cancel works on device; UI matches dialog structure.

**Status: done (2026-10-13).** `EditNextStepSheet` (title / Today·Tomorrow·Next week / 1h·3h·1d); tasks save via `updateTask`+`scheduleReminder`; suggestions via `approveSuggestion` edits (RLS); wired on Overview / Suggestions / Tasks / task detail.

---

### Step 11 — Settings + auth chrome

**Goal:** Settings and auth feel like Saydo; keep real power tools.

**Do**
- Settings: Saydo header/copy structure; **display name** field (max 30) load/save `profiles.display_name`; keep privacy paragraphs, push enable, account delete, sign out. Drop or relocate debug probes under a collapsible “Developer” if they clutter the calm layout.
- On sign-up, if name is collected, write it into `profiles.display_name` (trigger already seeds from metadata/email — align client metadata or post-signup update).
- Auth: restyle sign-in / sign-up / forgot / OTP / reset to match `SignInForm` visual language (split ink panel on large web width optional). Keep real validation + OTP. Copy/branding: **Saydo**.

**Do not**
- Demo “Continue to demo” without auth.
- Local-only display name that resets on reload.
- Remove account deletion or privacy disclosure.
- Build marketing pages in this step.

**Exit**
- Saving display name persists and shows on Overview after refresh.
- Auth + settings visually aligned; all Phase 7 settings actions still work.

---

### Step 12 — Motion, a11y, web polish

**Goal:** Same presence without noise.

**Do**
- Enter transitions for view changes (Reanimated); respect reduced motion.
- Focus/hit slop 44px on mobile; safe-area on bottom nav.
- Web: sidebar collapse control; no horizontal overflow on note cards.
- Toasts only if already used / minimal — don’t add Sonner unless needed; reuse simple RN feedback if present.

**Do not**
- Decorative animation piles on every list row if performance suffers on Android — match *feel*, not library.

**Exit**
- Manual pass: iPhone/Android + Expo web width 390 and 1280 against prototype checklist.

---

### Step 13 — Hardening pass (done bar)

**Goal:** Meet `.cursor/rules/06-done.mdc`.

**Do**
- Happy path, failure path, auth boundary smoke.
- `npm test` + `npm run typecheck`.
- Grep diff for secrets, dead demo seeds, unused Lovable bits.
- Update `docs/STATUS.md` Next slice / note that UI shell landed (when implementation happens).
- `DECISIONS.md` entry when implementing: product UI = Saydo workspace from `ui/goals-in-motion-55`; brand = Saydo; marketing site deferred; note `category` + `profiles.display_name` in product UI.

**Do not**
- Leave demo footers (“changes are not saved”) in production UI.
- Leave “Voice-to-Work” in user-facing chrome.

**Exit**
- Checklist from Step 1 ticked for **Workspace/dashboard (+ auth)** only.
- No regressions in note processing, approval idempotency, delete, reminders.
- Categories + display name persist across reload.

---

## 7. Suggested implementation order (compressed)

```
1 Checklist
2 Theme tokens + fonts
3 UI primitives (Button, Eyebrow, Ribbon, Sheet)
4 App shell (sidebar + tabs + header CTA) — Saydo wordmark
5 Overview (greeting from profiles.display_name)
6a Note category migration + notes-service
6 Notes list/detail + category chips
7 Suggestions inbox
8 Tasks
9 Capture sheet → real recorder
10 Edit + reminders chrome
11 Settings (display name persist) + auth restyle
12 Motion / a11y / web
13 Tests + STATUS/DECISIONS + parity QA
```

If capacity is tight, **cut order is not** “drop Suggestions” or **categories** (locked in) — cut **custom datetime** and anything marketing-related first. Keep: shell, capture, note detail review, category filter, tasks, settings + display name.

---

## 8. Per-step ladder reminders (recurring)

Before writing code in any step:

1. **YAGNI** — Is this control in `Workspace.tsx` / auth visual, or are we inventing?
2. **Exists?** — Service/mutation/screen already in `src/features` or `app/`?
3. **Stdlib / RN?** — `Modal`, `Pressable`, `StyleSheet`, Reanimated already installed.
4. **Native?** — Expo Audio, Notifications, Router — use them; don’t polyfill web-only APIs on native.
5. **Dep?** — Only `expo install` if a font/icon gap blocks parity; no UI framework by default.
6. **One line?** — Prefer mapping helpers over new modules.
7. **Minimum** — Restyle + compose; don’t rewrite the domain layer.

Bug fixes: change the shared helper once; grep callers.

---

## 9. Definition of done (this UI effort)

- [ ] Desktop sidebar + mobile bottom nav match prototype IA
- [ ] Overview / Voice notes / Suggestions / Tasks / Settings match layout, typography, color, key copy
- [ ] Product chrome says **Saydo** (not Voice-to-Work)
- [ ] Display name saves to `profiles.display_name` and greets on Overview
- [ ] Note categories persist; chips filter `Work | Ideas | Personal`
- [ ] Capture CTA opens real recording → private upload → process-note → review
- [ ] Suggestions never become tasks without approve
- [ ] Tasks complete/edit/source-note work
- [ ] Reminders use durable backend (not tab toasts)
- [ ] Auth is real; settings keep privacy + delete account
- [ ] Marketing site **not** ported (deferred)
- [ ] No Lovable / Web Speech / demo seed as production path
- [ ] `npm test` and `npm run typecheck` reported clean
- [ ] `ui/goals-in-motion-55` remains reference only (not a second app runtime)

---

## 10. Decisions log (resolved)

| # | Question | Answer |
|---|---|---|
| 1 | Display name | **Real name** — persist `profiles.display_name` (column already exists from Phase 0). |
| 2 | Category chips | **Add category** — migration + UI `All notes \| Work \| Ideas \| Personal`. |
| 3 | Marketing site | **Later** — this execution = Workspace / dashboard (+ auth) only. |
| 4 | Product name | **Saydo** — not Voice-to-Work. |

No open product questions blocking Step 1. Optional micro-choice at Step 6a: default category for new notes (`Ideas` vs `Work`) — prefer **`Ideas`** to match prototype capture default unless you say otherwise.

---

## 11. Workspace parity checklist

Source: `ui/goals-in-motion-55/src/components/workspace/Workspace.tsx` (+ `data.ts`).  
Tick when the **Expo app** matches. Demo-only controls marked **(skip / replace)** per §1.4.

### Design system
- [x] Paper / ink / cobalt / cobalt-deep / lime / lavender / stone palette *(Step 2 — `src/theme.ts`)*
- [x] Display font Space Grotesk; body Geist; mono Geist Mono *(Step 2 — `src/theme.ts` + root layout)*
- [x] Button variants: cta, ink, lime, quiet, ghost, destructive, link *(Step 3)*
- [x] Eyebrow (mono, uppercase, tracked) *(Step 3)*
- [x] VoiceRibbon (live + static; reduced motion) *(Step 3)*
- [x] Card colors: lavender / lime / muted *(Step 5/6 — NoteCard)*
- [x] Surfaces: ink sidebar, cobalt CTA band, paper content *(shell + Overview band)*
- [ ] Mobile 44px targets + bottom safe-area; desktop sidebar collapse

### Shell — desktop sidebar
- [x] Saydo wordmark (collapsed: audio/lines icon ok) *(Step 4)*
- [x] **New voice note** (lime) → opens capture *(Step 4)*
- [x] Nav: Overview, Voice notes, Suggestions (badge = pending count), Tasks *(Step 4)*
- [x] Active nav: muted bg + lime label *(Step 4)*
- [x] **Settings** *(Step 4)*
- [x] Avatar initial + display name (no “Demo workspace” in prod) *(Step 4 — email/metadata until Settings persist)*
- [x] Collapse / expand nav control *(Step 4)*
- [x] ~~Back to website~~ **(skip)** — marketing deferred

### Shell — header
- [x] Breadcrumb `Workspace / {view}` *(Step 4)*
- [x] **Capture a thought** (cta + mic) *(Step 4)*
- [x] ~~Demo mode eyebrow~~ **(skip)**

### Shell — mobile
- [x] Fixed bottom 4-tab nav: Overview / Voice notes / Suggestions / Tasks *(Step 4)*
- [x] Active tab: lavender bg + primary *(Step 4)*
- [x] Settings link under content (mobile) *(Step 4)*

### Overview
- [x] Eyebrow: “A little room to think” *(Step 5)*
- [x] H1: “Good to see you, {displayName}.” (name italic cobalt) *(Step 5)*
- [x] Sub: “Your thoughts have somewhere to go.” *(Step 5)*
- [x] Counts: To review (pending) · Next steps (open approved) *(Step 5)*
- [x] Cobalt band: eyebrow, “What’s on your mind?”, body, **New voice note**, VoiceRibbon *(Step 5)*
- [x] Recent thoughts grid + **All notes** *(Step 5)*
- [x] Note card: category, title, transcript clamp, time, open, overflow **Delete note** *(Step 5/6)*
- [x] Waiting for your call (≤2 pending rows) + go-to Suggestions *(Step 5)*
- [x] Your next steps (≤3 approved rows) + go-to Tasks *(Step 5)*
- [x] Empty states for those sections *(Step 5)*

### Voice notes — list
- [x] Eyebrow + H1 “Voice *notes.*” *(Step 6)*
- [x] Chips: All notes | Work | Ideas | Personal *(Step 6)*
- [x] Search: “Search your thoughts” *(Step 6)*
- [x] Note grid (same card controls as Overview) *(Step 6)*
- [x] Empty: “No notes found.” *(Step 6)*

### Voice notes — detail
- [x] **All notes** back *(Step 6)*
- [x] Eyebrow `{category} / {time}` *(Step 6)*
- [x] Title *(Step 6)*
- [x] Transcript block + VoiceRibbon (static) + quoted transcript *(Step 6 — editable field)*
- [x] Suggestions for this note (approve / edit / dismiss) or empty *(Step 6)*

### Suggestions
- [x] Eyebrow: “Possibilities, not commitments” *(Step 7)*
- [x] H1: “Your *call.*” *(Step 7)*
- [x] Count line + **Approve all** (when pending > 0) *(Step 7)*
- [x] Pending rows (review chrome) *(Step 7)*
- [x] Empty + **Go to tasks** *(Step 7)*

### Tasks
- [x] Eyebrow: “The things you chose” *(Step 8)*
- [x] H1: “Make *progress.*” *(Step 8)*
- [x] Filters: Open | Completed | All *(Step 8)*
- [x] Approved rows only (complete / edit / remove / source note) *(Step 8)*
- [x] Empty copy per filter *(Step 8)*

### Task / suggestion row
- [x] Review: sparkles avatar, **Approve**, **Edit**, **Dismiss** *(Step 7)*
- [x] Task: complete/reopen circle, kind, due label (incl. Overdue), reminder chip, **Source note**, **Edit**, **Remove** *(Step 8 — reminder chip on task detail later)*
- [x] Done: strikethrough muted title *(Step 8)*

### Capture sheet
- [ ] Title: “Catch that thought.”
- [ ] Description (AI → next steps you review)
- [ ] VoiceRibbon live while recording
- [ ] Speak / Stop + mm:ss timer
- [ ] Optional note title
- [ ] Thought field (cap 4000) — or real recorder UX that covers the same job
- [ ] Error alert
- [ ] Primary: Turn into next steps / Thinking…
- [ ] Secondary: Just save note **(map to real upload path; no fake no-AI fork)**
- [ ] ~~Use a sample~~ **(skip in prod)**

### Edit sheet
- [ ] Title: “Edit your next step”
- [ ] Title field
- [ ] Due presets: Today / Tomorrow / Next week + clear + date
- [ ] Reminder presets (map to durable 1h/3h/1d first) + clear
- [ ] **Save changes**
- [ ] ~~In-tab toast reminders~~ **(replace with push/durable reminders)**

### Settings
- [ ] Eyebrow: “Make yourself at home”
- [ ] H1: “Your workspace.”
- [ ] Display name (max 30) + **Save changes** → `profiles.display_name`
- [ ] Sign out / leave (real auth)
- [ ] Privacy disclosure, push enable, delete account (prod extras beyond prototype)

### Auth chrome (in scope)
- [ ] Sign-in / sign-up visual language from `SignInForm` (real submit + OTP flows)
- [ ] Saydo branding (not Voice-to-Work)
- [ ] ~~Explore demo without auth~~ **(skip)**

---

*When you say go on a step, implement only that step against this plan.*
