<div align="center">
  <img src="assets/brand/saydo-mark.png" alt="Saydo Logo" width="120" height="120">

  # Saydo (Voice-to-Work)

  > Mobile-first app that turns voice notes into editable transcripts and user-approved tasks.

  ![Saydo](https://img.shields.io/badge/status-Phase%200%E2%80%937%20Complete-brightgreen)
  ![License](https://img.shields.io/badge/license-Proprietary-blue)
  ![Platform](https://img.shields.io/badge/platform-Expo%20%7C%20React%20Native-lightgrey)
  ![Backend](https://img.shields.io/badge/backend-Supabase-green)
</div>

Saydo captures voice notes, transcribes them with AI, extracts structured task suggestions, and lets you approve the ones that matter. All voice data stays private and under your control.

## ✨ Features

- **Voice Recording**: Record up to 60-second voice notes on iOS and Android
- **AI Transcription**: Automatic transcription using Google Gemini (`gemini-3.5-transcribe`)
- **Task Extraction**: Structured task suggestions with source evidence (Gemini `gemini-3.8-flash`)
- **User Approval**: AI suggestions never become active tasks until you approve them
- **Task Management**: Track tasks, set due dates, add reminders, and mark complete
- **Privacy-First**: Private audio storage, 3-day audio retention, row-level security
- **Cross-Platform**: Works on iOS, Android, and web via Expo

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (for backend)
- Google AI Studio API key (for Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/harsHdokyc/voiceToText.git
cd voiceToText

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

1. **Set up Supabase**:
   - Create a project at [supabase.com](https://supabase.com)
   - Run migrations: `npm run supabase:start` (local) or apply to hosted project
   - Get your project URL and publishable key

2. **Configure `.env`**:
   ```bash
   # Client (Expo) — public config only
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. **Set Edge Function secrets** (in Supabase Dashboard → Edge Functions → Secrets):
   ```
   GOOGLE_API_KEY=your-gemini-api-key
   AI_TRANSCRIPTION_MODEL=gemini-3.5-transcribe
   AI_CHAT_MODEL=gemini-3.8-flash
   CRON_SECRET=your-random-secret
   ```

### Running the App

```bash
# Start the Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Project Status](./docs/20_STATUS.md) | Current phase, completed features, and next steps |
| [Decision Log](./docs/17_DECISIONS.md) | Architectural decisions and technical choices |
| [Architecture](./docs/05_ARCHITECTURE.md) | System architecture and data flow |
| [AI Pipeline](./docs/06_AI_PIPELINE.md) | Transcription and task extraction flow |
| [Setup Guide](./docs/14_SETUP_AND_SOURCE_LOG.md) | Detailed setup and configuration |
| [Folder Structure](./docs/10_FOLDER_STRUCTURE.md) | Project organization and conventions |
| [Product PRD](./docs/01_PRD.md) | Product requirements and goals |
| [Security & Privacy](./docs/08_SECURITY_AND_PRIVACY.md) | Security practices and privacy model |

## 🏗️ Tech Stack

### Frontend
- **Framework**: Expo + React Native + TypeScript
- **Routing**: Expo Router
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS + NativeWind
- **Forms**: React Hook Form + Zod validation

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password + OTP)
- **Storage**: Supabase Storage (private audio bucket)
- **Edge Functions**: Supabase Edge Functions (Deno)

### AI
- **Transcription**: Google Gemini (`@google/genai` STT: `gemini-3.5-transcribe`)
- **Task Extraction**: LangChain + Gemini Chat (`gemini-3.8-flash`)
- **Validation**: Zod schemas

### Infrastructure
- **Hosting**: Supabase (backend), Vercel (marketing site)
- **Push Notifications**: Expo Push Service
- **Email**: Resend (transactional)

## 🔄 Core Product Flow

```
Record Voice Note
    ↓
Private Upload (Supabase Storage)
    ↓
Edge Function: process-note
    ↓
Transcribe (Gemini STT)
    ↓
Extract Tasks (LangChain + Gemini)
    ↓
User Reviews Suggestions
    ↓
Approve/Dismiss Tasks
    ↓
Track Tasks + Set Reminders
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## 🛠️ Development

### Local Supabase Stack

```bash
# Start local Supabase (Docker required)
npm run supabase:start

# Check status
npm run supabase:status

# Stop local stack
npm run supabase:stop

# Reset database
npm run supabase:reset
```

### Edge Functions

```bash
# Serve Edge Functions locally
npm run supabase:functions
```

### Coding Standards

This project follows strict engineering guidelines. See `.cursor/rules/` for:
- Simple engineering principles (YAGNI, minimal code)
- Testing policy (behavior-driven unit tests)
- Security practices (RLS, private storage, validation)
- Logging standards (structured `[vtw]` logs)

## 📦 Project Structure

```
voice-to-work/
├── app/                    # Expo Router routes
├── src/
│   ├── components/         # Reusable UI components
│   ├── features/           # Feature modules (auth, notes, tasks, etc.)
│   ├── lib/               # Infrastructure (Supabase, query client, env)
│   └── providers/         # React context providers
├── supabase/
│   ├── migrations/        # Database migrations
│   ├── functions/        # Edge Functions
│   └── tests/            # Database tests
├── docs/                 # Product and engineering documentation
├── .cursor/rules/        # Cursor agent rules
└── LandingPage/          # Marketing site (Vite + React)
```

## 🤝 Contributing

Contributions are welcome! Before contributing:

1. Read the [coding standards](./docs/11_CODING_STANDARDS.md)
2. Review the [testing strategy](./docs/12_TESTING_STRATEGY.md)
3. Check [open issues](https://github.com/harsHdokyc/voiceToText/issues)
4. Fork the repository and create a feature branch
5. Write tests for new functionality
6. Ensure all tests pass: `npm test` and `npm run typecheck`
7. Submit a pull request with a clear description

## 📄 License

This project is proprietary software. All rights reserved.

## 🔒 Privacy & Security

- **Private Storage**: All audio files stored in private Supabase Storage bucket
- **Row-Level Security**: All user data protected by PostgreSQL RLS policies
- **Audio Retention**: Audio files automatically deleted after 3 days
- **No Content Logging**: Transcripts and audio never logged or sent to analytics
- **Edge-Only Secrets**: API keys stored in Supabase Vault, never in client code

See [Security & Privacy](./docs/08_SECURITY_AND_PRIVACY.md) for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- Backend powered by [Supabase](https://supabase.com)
- AI powered by [Google Gemini](https://ai.google.dev)
- Task extraction via [LangChain](https://langchain.com)

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Report Issues](https://github.com/harsHdokyc/voiceToText/issues)
- 💬 [Discussions](https://github.com/harsHdokyc/voiceToText/discussions)

---

**Saydo** — Turn voice into action.
