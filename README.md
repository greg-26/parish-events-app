# Parish Events Manager

A modern web and mobile app for Catholic parishes to manage their events, especially Mass times, following the **Mass Times Protocol** standard.

## Features

- 🏛️ **Multi-Parish Support** — parishes can add contributors with role-based access
- 📍 **Location Management** — OpenStreetMap integration for Catholic places of worship
- 📅 **Smart Calendar** — support for specific dates, recurrence patterns, and exclusions
- ⛪ **Mass Times Protocol** — automatic JSON-LD generation following schema.org standards
- 👨‍💼 **Priest Management** — assign celebrating and assisting clergy to events
- 🌐 **Public API** — each parish gets a public URL with structured data for apps and AI
- 📱 **Cross-Platform** — works on web, iOS, and Android (Ionic + Capacitor)

## Tech Stack

- **Frontend:** Vue 3 + Ionic + TypeScript + Pinia
- **Backend:** AWS Amplify Gen 2 + DynamoDB + Lambda
- **Auth:** Amazon Cognito with role-based permissions  
- **Standards:** Schema.org JSON-LD + OpenStreetMap + Mass Times Protocol

## Quick Start

```bash
# 1. Clone and install
git clone <this-repo>
cd parish-events-app
pnpm install

# 2. Configure AWS
cp .env.example .env
# Edit .env and set AWS_PROFILE

# 3. Deploy backend (sandbox)
pnpm run sb

# 4. Start dev server
pnpm run dev
```

## Data Model

This app implements the [Mass Times Protocol](https://masstimesprotocol.org) data model:

- **Events** follow schema.org Event + Schedule patterns
- **Locations** use OpenStreetMap references 
- **JSON-LD output** for machine-readable schedules
- **Liturgical support** for Catholic-specific event types

## Parish Public URLs

Each parish gets a public endpoint at `/api/parish/{id}/events` that returns:

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Sunday Mass",
  "additionalType": "https://www.wikidata.org/wiki/Q132612",
  "eventSchedule": {
    "@type": "Schedule",
    "byDay": "https://schema.org/Sunday", 
    "startTime": "11:00",
    "endTime": "12:00",
    "repeatFrequency": "P1W",
    "scheduleTimezone": "Europe/Madrid"
  },
  "location": {
    "@type": "Place",
    "name": "Cathedral of Our Lady",
    "sameAs": "https://www.openstreetmap.org/node/123456789"
  }
}
```

## User Roles

- **Parish Admin** — full parish management, user invitation
- **Event Manager** — create/edit events, manage priests
- **Viewer** — read-only access to parish events

## Mobile App Deployment

Built with Capacitor for cross-platform deployment:

```bash
# Build web app
pnpm run build

# Add platform (first time)
npx cap add ios      # or: npx cap add android

# Sync and open
npx cap sync && npx cap open ios
```

## License

MIT