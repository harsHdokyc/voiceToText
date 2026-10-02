# V1 Scope and Acceptance
## P0 private beta
1. Auth/session; 2. short voice recording and private upload; 3. processing state machine; 4. transcription; 5. structured extraction; 6. transcript/suggestion review; 7. edit/approve/reject; 8. task list/completion; 9. retry-safe processing; 10. RLS and core tests.

## P1 before broader launch
Reminders, Expo push registration/delivery, note/task search, transactional email, deletion flows, rate limits/quotas, cost/failure monitoring, privacy disclosure.

## P2 only after evidence
Widgets, Siri/Shortcuts, calendar/task integrations, semantic search, voice chat, teams, billing.

## Note states
`draft -> uploading -> queued -> transcribing -> extracting -> review_ready`; failures: `upload_failed`, `transcription_failed`, `extraction_failed`; user may archive. Validate transitions; avoid an overly generic state machine.

## Acceptance
One valid upload creates one note and one private object. Processing moves through defined states without duplicate jobs. Transcript and suggestions persist on success. Model output is schema-validated. User can review suggestions. Approving a suggestion twice creates only one task. Cross-user note/task/audio access is denied. Retry after failure does not lose the original audio. Loading, empty, success, and error states exist.
