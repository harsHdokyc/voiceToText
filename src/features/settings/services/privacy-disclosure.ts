/** Short in-app privacy disclosure for private beta (Phase 7). */
export const PRIVACY_DISCLOSURE = `Saydo stores your account email, voice notes, transcripts, task suggestions, and tasks in a private Supabase project.

Voice-note audio is kept in a private storage bucket and deleted automatically 3 days after recording. Those 3 days are the retry window: the file is removed even if processing never finished. Transcripts, notes, suggestions, tasks, and reminders are kept. If the audio is gone and there is no transcript, the recording cannot be retried. Processing runs on trusted Edge Functions and sends audio or transcript text to the configured AI provider (Google Gemini). API keys never ship in the mobile app.

AI suggestions are drafts until you approve them. We do not log raw audio, transcripts, or prompts in application logs.

You can delete individual notes (and any audio still stored) or delete your account and associated app data from Settings. Push notifications (optional) use Expo push tokens stored per device.

This beta disclosure is not legal advice; review Google Gemini and Supabase terms before broader launch.`;

export function privacyDisclosureParagraphs() {
  return PRIVACY_DISCLOSURE.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}
