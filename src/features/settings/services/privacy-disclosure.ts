/** Short in-app privacy disclosure for private beta (Phase 7). */
export const PRIVACY_DISCLOSURE = `Voice-to-Work stores your account email, voice notes, transcripts, task suggestions, and tasks in a private Supabase project.

Audio is kept in a private storage bucket. Processing (transcription and task extraction) runs on trusted Edge Functions and sends audio/transcript text to the configured AI provider (official OpenAI by default). API keys never ship in the mobile app.

AI suggestions are drafts until you approve them. We do not log raw audio, transcripts, or prompts in application logs.

You can delete individual notes (and their audio) or delete your account and associated app data from Settings. Push notifications (optional) use Expo push tokens stored per device.

This beta disclosure is not legal advice; review OpenAI and Supabase terms before broader launch.`;

export function privacyDisclosureParagraphs() {
  return PRIVACY_DISCLOSURE.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}
