# AI Reminder

**An intelligent productivity and reminder system that helps developers stay focused, track their work, and remember what needs to be done.**

AI Reminder is a developer productivity platform designed to understand work activity, monitor workspace sessions, and generate timely reminders based on tasks, deadlines, inactivity, and working patterns.

It combines a web application, VS Code extension, and standalone CLI to bring productivity monitoring and intelligent reminders closer to the developer's everyday workflow.

> **Project status:** Active development. The application currently runs locally and is not yet deployed.

---

## ✨ Key Features

### 🧠 Intelligent Reminder Engine
- Evaluates reminder rules based on different conditions.
- Supports active-work, inactivity, deadline, and fixed-time reminder rules.
- Processes scheduled notification jobs.
- Prevents duplicate notification jobs through idempotency checks.

### 💻 Workspace Activity Tracking
- Tracks workspace activity through developer tooling.
- Records activity events and work sessions.
- Supports workspace registration and connection.
- Uses activity signals to help determine when reminders should be triggered.

### 🔌 VS Code Integration
- Connects the developer's workspace to AI Reminder.
- Supports an authentication and approval flow between the website and extension.
- Brings activity tracking closer to the developer's coding environment.

### ⚡ Standalone CLI
The standalone CLI provides commands for managing the local AI Reminder connection.

Available commands include:

| Command | Description |
|---|---|
| `ai-reminder login` | Authenticate with AI Reminder |
| `ai-reminder connect` | Connect a workspace |
| `ai-reminder start` | Start activity monitoring |
| `ai-reminder stop` | Stop activity monitoring |
| `ai-reminder disconnect` | Disconnect a workspace |
| `ai-reminder status` | View connection status |
| `ai-reminder logout` | Sign out |

### 🔔 Notification Processing
- Evaluates reminder rules.
- Identifies due notification jobs.
- Processes eligible notification channels.
- Includes WhatsApp notification integration with consent and verification checks.
- Tracks notification delivery states and failures.

---

## 🏗️ System Architecture

AI Reminder is built around a modular architecture that separates the frontend, backend, activity tracking, reminder processing, and notification delivery.

```text
                 AI REMINDER
                      |
          +-----------+-----------+
          |           |           |
       Web App    VS Code       CLI
       Next.js   Extension   TypeScript
          |           |           |
          +-----------+-----------+
                      |
                 API Layer
                      |
          +-----------+-----------+
          |           |           |
       Activity    Reminder    Workspace
       Tracking     Engine     Management
          |           |           |
          +-----------+-----------+
                      |
                PostgreSQL
                 + Drizzle
                      |
             Notification Jobs
                      |
               WhatsApp
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Data Fetching | TanStack Query |
| CLI | Node.js, Commander.js |
| Extension | VS Code Extension API |
| Testing | Vitest |
| Validation | Zod |
| Notifications | WhatsApp integration |

---

## 📁 Project Structure

The project is organized into separate application, API, and shared logic layers.

```text
ai-reminder/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── extension-auth/
│   │   ├── workspaces/
│   │   ├── activity/
│   │   └── cron/
│   └── (auth)/
│
├── components/
│   └── ui/
│
├── lib/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── server/
│   └── utils/
│
├── cli/
│   └── ai-reminder-cli/
│
├── drizzle/
│
├── public/
│
├── tests/
│
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Before running AI Reminder locally, make sure you have:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Navigate into the project

```bash
cd ai-reminder
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root.

Use the project's `.env.example` as the source of truth for the required environment variables and credentials.

Do not commit your `.env` file or expose API keys, database credentials, or authentication secrets.

### 5. Generate and run database migrations

```bash
npm run db:generate
npm run db:migrate
```

### 6. Start the development server

```bash
npm run dev
```

The application should be available at:

```text
http://localhost:3000
```

---

## ⚡ CLI Setup

The standalone CLI is maintained separately inside the `cli/ai-reminder-cli` directory.

```bash
cd cli/ai-reminder-cli
```

Install dependencies:

```bash
npm install
```

Build the CLI:

```bash
npm run build
```

Link it for local development:

```bash
npm link
```

Check the installation:

```bash
ai-reminder status
```

---

## 🧪 Testing and Development

The project includes scripts for development, testing, type checking, linting, and database management.

```bash
# Start development server
npm run dev

# Build the application
npm run build

# Run lint checks
npm run lint

# Check TypeScript types
npm run typecheck

# Run tests
npm run test

# Generate database migrations
npm run db:generate

# Apply database migrations
npm run db:migrate

# Check database configuration
npm run db:check

# Open Drizzle Studio
npm run db:studio
```

---

## 🔐 Security and Reliability

AI Reminder is designed with reliability and responsible notification delivery in mind.

Current implementation includes:

- Protected API endpoints.
- Authentication for connected developer tools.
- Idempotent notification job processing.
- WhatsApp consent and verification checks.
- Notification delivery-state tracking.
- Recovery handling for stale processing jobs.

Secrets and authentication credentials should be stored securely through environment configuration and appropriate local credential storage.

---

## 🛠️ Roadmap

AI Reminder is actively evolving. Planned improvements include:

- [ ] Complete and improve the VS Code connection workflow.
- [ ] Complete end-to-end CLI authentication and workspace synchronization.
- [ ] Expand reminder customization and scheduling.
- [ ] Improve activity analysis and context-aware reminder generation.
- [ ] Expand notification channel support.
- [ ] Improve notification retry and failure recovery.
- [ ] Deploy the web application.
- [ ] Improve the developer dashboard and activity insights.
- [ ] Add comprehensive integration and end-to-end tests.

---

## 🎯 Project Vision

The goal of AI Reminder is to make productivity assistance more contextual.

Instead of relying entirely on manually configured alarms and reminders, AI Reminder aims to understand a developer's working environment and provide useful reminders at the right time.

Whether it is remembering an unfinished task, taking a break after inactivity, or keeping track of an important deadline, AI Reminder aims to make staying organized a natural part of the development workflow.

---

## 👨‍💻 Development

AI Reminder is an independently developed project built with a focus on modular architecture, automation, developer experience, and intelligent productivity tools.

**Built with TypeScript, Next.js, and a passion for making everyday work smarter.**