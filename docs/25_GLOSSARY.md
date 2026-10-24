# Glossary
Domain and code terms with one meaning across docs, code, and reviews. Add a term when a new module or concept gets a name; sharpen it here instead of redefining it in another doc.

## Product
| Term | Meaning |
|---|---|
| **Note** | One voice capture. Row in `notes`; owns the private audio file, the transcript, and its suggestions. |
| **Suggestion** | AI-proposed next step from a note (`task_suggestions`). Stays `pending` until the user approves or rejects it. Never becomes a task on its own. |
| **Task** | User-approved work item (`tasks`). Created only by approving a suggestion or by manual create. |
| **Review** | The human decision on a suggestion: approve (with optional edits) or reject. |
| **Reminder** | Scheduled UTC nudge for a task (`reminders`), sent by `dispatch-reminders`. |
| **Retention window** | 3 days after a note is recorded. The audio file is purged after it; the note, transcript, and tasks stay. Also the only window for retrying transcription. |
| **Due** | `due_at` on a suggestion or task: one UTC instant. A **date-only due** is stored at 12:00 local and shows no time; a **timed due** shows its time and is overdue once that time passes. Helpers: `src/features/tasks/services/due-presets.ts`, label `task-due-label.ts`. |
| **Daily cap** | 40 `process-note` runs per user per **local day** (`count_ai_usage_today`). |
| **Toast** | Short in-app feedback banner (`showToast` / `ToastHost`). One message at a time; not a push notification. |

## Time
| Term | Meaning |
|---|---|
| **User time zone** | IANA zone in `profiles.timezone` (e.g. `Asia/Kolkata`). Synced from the device on profile load, so travel updates it; DB rejects unknown zones; unset → UTC. |
| **Local day** | A calendar day in the user time zone, from local midnight. Used by the daily cap and by “today / tomorrow” in extraction. |
| **Speaker's local time** | Wall clock + zone handed to extraction (`2026-10-24T00:10:00+05:30 (Asia/Kolkata)`). Relative days in a transcript resolve against it, never against a date spoken in the recording. Server helpers: `supabase/functions/_shared/time/user-time.ts`. |

Storage is always UTC `timestamptz`; screens format in the device zone.

## Note lifecycle
| Term | Meaning |
|---|---|
| **Note lifecycle** | The note status machine, owned by `supabase/functions/_shared/notes/note-lifecycle.ts`. |
| **Stage** | One pipeline step with a working and a failed status: `upload` (`uploading` / `upload_failed`), `transcribe` (`transcribing` / `transcription_failed`), `extract` (`extracting` / `extraction_failed`). |
| **Claim** | Conditional move from allowed statuses into a stage’s working status. Only one caller wins; a loser gets `claim_lost` and does nothing. |
| **Complete** | Conditional move from a stage’s working status to the next status (`queued`, `extracting`, `review_ready`). |
| **Fail** | Conditional move from a stage’s working status to its failed status with a stable `last_error_code`. Never overwrites a note that already moved on. |
| **Stale reclaim** | Flip an `extracting` note untouched for 3+ minutes (Edge wall-clock kill) to `extraction_failed` so extraction can be claimed again. |

Status flow: `draft → uploading → queued → transcribing → extracting → review_ready`, each working status able to fall to its `*_failed` status.

## Edge
| Term | Meaning |
|---|---|
| **Edge envelope** | Every Edge JSON response: `{ ok, error?, reason?, ... }`. App side: `edgeResult` in `src/lib/invoke-edge.ts` maps `ok:false` to `ApiError(error, reason)`. |
| **Edge request** | `edgeRequest(scope)` in `supabase/functions/_shared/http.ts`. Per-request `fail` / `failFrom`: logs the `[vtw]` fail line and returns the envelope. |
| **Machine code** | Stable snake_case `code` (`note_not_found`). A thrown `machine_code: detail` keeps its prefix as the code. See [16_LOGGING_COMBINED.md](./16_LOGGING_COMBINED.md#error-codes-stable). |
| **Service client** | Service-role Supabase client from `_shared/service-role.ts`. Server-only; bypasses RLS, so use it only for privileged steps (storage delete, auth delete, cron work). |
| **Cron secret** | `x-cron-secret` header matched against the `CRON_SECRET` Edge secret (`hasCronSecret`). Gates `dispatch-reminders` and `purge-note-audio`. |
| **Debug function** | `openai-spike` (and `health`). `openai-spike` is off (404) unless `ENABLE_DEBUG_FUNCTIONS=true`, because it skips the daily AI cap. |

## Architecture vocabulary
Used in architecture reviews (`.agents/skills/codebase-design`): **module**, **interface**, **implementation**, **depth**, **seam**, **adapter**, **leverage**, **locality**. Prefer these over “service”, “component”, “boundary”.
