export type Segment = { text: string; taskId?: number };

export const SAMPLE_DURATION = 14;

export const SAMPLE_TRANSCRIPT: Segment[] = [
  { text: "Need to " },
  { text: "send the revised proposal to Maya by Thursday", taskId: 1 },
  { text: ", " },
  { text: "book a dentist appointment", taskId: 2 },
  { text: ", and " },
  { text: "look into the new onboarding flow this weekend", taskId: 3 },
  { text: "." },
];

export type Suggestion = {
  id: number;
  title: string;
  due?: string;
  kind: "Follow-up" | "Task" | "Idea" | "Reminder";
};

export const SAMPLE_SUGGESTIONS: Suggestion[] = [
  { id: 1, title: "Send revised proposal to Maya", due: "Thursday", kind: "Follow-up" },
  { id: 2, title: "Book dentist appointment", kind: "Task" },
  { id: 3, title: "Explore the new onboarding flow", due: "This weekend", kind: "Idea" },
];

export const seo = (title: string, description: string) => [
  { title },
  { name: "description", content: description },
  { property: "og:title", content: title },
  { property: "og:description", content: description },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];

export type Faq = { q: string; a: string; group: string };

export const FAQS: Faq[] = [
  {
    group: "Product",
    q: "What is Saydo?",
    a: "A voice-first app for turning spoken thoughts into something you can act on. You record a note, get a readable transcript, and review suggested tasks, follow-ups, ideas and reminders. Nothing becomes a task until you approve it.",
  },
  {
    group: "Product",
    q: "How does transcription work?",
    a: "Your recording is converted to text with a speech-recognition model, then shown to you as a readable transcript you can check and correct. We'll publish the specific providers and supported languages before launch — they haven't been finalised yet.",
  },
  {
    group: "Product",
    q: "Does the app automatically create tasks?",
    a: "No. It suggests tasks. Suggestions stay pending — visually distinct from real tasks — until you approve, edit or dismiss them. AI proposes; you decide.",
  },
  {
    group: "Product",
    q: "Can I edit or reject suggestions?",
    a: "Yes. You can rewrite a suggestion's wording or due date before approving it, reject it outright, or simply leave it. Ignored suggestions never turn into tasks on their own.",
  },
  {
    group: "Privacy",
    q: "How is audio handled?",
    a: "Audio is processed to create your transcript and suggestions. Our retention policy for recordings and transcripts is still being written, and we'll state it plainly before anyone's data is collected. We won't sell your recordings.",
  },
  {
    group: "Product",
    q: "What happens if transcription fails?",
    a: "You keep the original recording and see a clear error with the option to retry. A failed transcript never silently drops your note.",
  },
  {
    group: "Access",
    q: "Is there a free plan?",
    a: "Pricing hasn't been decided. Early-access members will hear about plans before anything is charged.",
  },
  {
    group: "Access",
    q: "When will it be available?",
    a: "We're in early access and don't have a public launch date yet. Join the list and we'll write when there's something for you to try.",
  },
];
