# Positioning and Validation
Headline candidate: “Your voice notes should go somewhere.” Subhead: Speak naturally. Get a transcript and suggested next actions. Review them, then follow through.

Interview 10–15 people who already use voice notes. Ask about the last actual recording, what happened after it, how often they replay/search, how they convert notes into tasks, tools they've tried, privacy concerns, and willingness to pay. Avoid leading questions like “Would you use my app?”

Primary beta metrics: first note transcribed/reviewed, suggestion approval rate, time to first approved task, D7 retained users who capture, completion rate for generated tasks. Guardrails: transcription failures, extraction retries, cost/audio minute, cost/approved task, rejected suggestions, delete rate, push opt-out. Never log content.

Decision gates: if tasks are rejected often, improve grounding/review before upgrading models; if users mainly want cleaned prose, test a writing wedge; if they record but don't return, focus on retrieval/follow-through. Don't expand into meeting bots without separate evidence.
