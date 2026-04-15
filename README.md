# Lumion — Wireless Power Through Light

**Infrared Energy Beaming for a Cable-Free Future**

Lumion is a real-time SaaS dashboard for monitoring infrared wireless power transmission systems. Built with Next.js 16, React 19, and SQLite, it provides live telemetry visualization, session tracking, and user authentication for managing optical power beaming hardware.

> *Charging the future, one beam at a time.*

---

## Features

- **Live Telemetry Dashboard** — Real-time monitoring of power, voltage, current, temperature, and beam status at 1 Hz refresh rate
- **Device Status** — Detailed view of transmitter (940 nm IR LED array), receiver (silicon PV panel), and ESP32 microcontroller
- **Analytics** — Historical charts with configurable time windows (1 min, 2 min, 5 min), summary statistics, and efficiency tracking
- **Event Log** — Safety events, system alerts, and session activity with severity filtering (info/warning/critical)
- **Session History** — Browse past power beaming sessions with peak power, total energy, and duration metrics
- **User Authentication** — Login/register system with secure password hashing (PBKDF2), session tokens, and cookie-based auth
- **Account Settings** — User profile management with company information
- **Simulated Telemetry** — Realistic power-beaming physics simulation with lifecycle phases (startup, ramp-up, steady state, perturbation, cooldown)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Hipdarius/maiou-laser.git
cd maiou-laser

# Install dependencies
npm install

# Start the development server
npm run dev

# Open dashboard
# → http://localhost:3000
```

The simulator auto-starts when the dashboard loads. No hardware needed.

### First Time Setup

1. Navigate to `/register` to create an account
2. Sign in at `/login`
3. The telemetry simulator starts automatically — live data appears within seconds

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js App                             │
│                                                              │
│  ┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐ │
│  │Dashboard│ │Devices │ │Analytics│ │Events│ │Sessions  │ │
│  └────┬────┘ └───┬────┘ └────┬────┘ └──┬───┘ └────┬─────┘ │
│       └──────────┴───────────┴─────────┴──────────┘        │
│                         │ polling 1-2s                      │
│              ┌──────────┴───────────┐                       │
│              │     API Routes       │                       │
│              │  /api/telemetry      │                       │
│              │  /api/events         │                       │
│              │  /api/sessions       │                       │
│              │  /api/auth/*         │                       │
│              └──────────┬───────────┘                       │
│                         │                                   │
│              ┌──────────┴───────────┐                       │
│              │  Simulator Engine    │  ← swap for ESP32     │
│              │  (Digital Twin)      │    POST later          │
│              └──────────┬───────────┘                       │
│                         │                                   │
│              ┌──────────┴───────────┐                       │
│              │    SQLite (WAL)      │                       │
│              │    data/lumion.db    │                       │
│              └──────────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Dashboard (Mission Control)
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── devices/                # Device status page
│   ├── analytics/              # Analytics & charts
│   ├── events/                 # Event log browser
│   ├── sessions/               # Session history
│   ├── settings/               # Account settings
│   └── api/
│       ├── auth/               # Auth endpoints (login, register, logout, me, update)
│       ├── telemetry/          # Telemetry data endpoints
│       ├── events/             # Event log endpoint
│       └── sessions/           # Session summaries endpoint
├── components/
│   ├── Navbar.tsx              # Navigation with user menu
│   ├── LayoutShell.tsx         # Layout wrapper (hides nav on auth pages)
│   ├── StatCard.tsx            # Metric cards with sparklines
│   ├── StatusBadge.tsx         # Status indicators
│   ├── TelemetryChart.tsx      # Recharts area chart wrapper
│   └── EventLog.tsx            # Event list component
└── lib/
    ├── db.ts                   # SQLite database layer + user ops
    ├── auth.ts                 # Session authentication helpers
    ├── simulator.ts            # Telemetry simulation engine
    └── types.ts                # TypeScript interfaces
```

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 16, React 19               |
| Charts    | Recharts                            |
| Styling   | Custom CSS design system            |
| Backend   | Next.js API Routes                  |
| Database  | SQLite via better-sqlite3 (WAL)     |
| Auth      | PBKDF2 hashing, HTTP-only cookies   |

---

## Hardware Architecture

Lumion monitors a four-component wireless power system:

| Component          | Function                        | Technology                            |
|--------------------|---------------------------------|---------------------------------------|
| **IR Transmitter** | Emits focused infrared beam     | High-power IR LEDs, Fresnel lens, ESP32 |
| **Receiver Module**| Captures IR → DC electricity    | Photovoltaic cell array, DC-DC converter |
| **Energy Storage** | Stores received energy          | 10F supercapacitor, charge controller |
| **Web Dashboard**  | Real-time monitoring            | Next.js, SQLite, Recharts             |

---

## Telemetry Schema

Every telemetry frame contains:

| Field              | Type    | Unit | Description                     |
|--------------------|---------|------|---------------------------------|
| `transmitter_on`   | boolean | —    | TX power state                  |
| `beam_locked`      | boolean | —    | Beam tracking lock              |
| `safety_ok`        | boolean | —    | Safety interlock status         |
| `receiver_voltage` | number  | V    | PV panel output voltage         |
| `receiver_current` | number  | A    | PV panel output current         |
| `received_power`   | number  | W    | Computed V × A                  |
| `supercap_voltage` | number  | V    | Supercapacitor charge level     |
| `energy_delivered_j`| number | J    | Cumulative session energy       |
| `distance_cm`      | number  | cm   | TX-to-RX distance               |
| `temperature_c`    | number  | °C   | System temperature              |

---

## API Endpoints

| Method | Endpoint                          | Description                   |
|--------|-----------------------------------|-------------------------------|
| `POST` | `/api/auth/register`              | Create a new user account     |
| `POST` | `/api/auth/login`                 | Authenticate and get session  |
| `POST` | `/api/auth/logout`                | End session                   |
| `GET`  | `/api/auth/me`                    | Get current user              |
| `POST` | `/api/auth/update`                | Update user profile           |
| `GET`  | `/api/telemetry`                  | Latest telemetry frame        |
| `GET`  | `/api/telemetry/history?limit=60` | Recent telemetry frames       |
| `GET`  | `/api/events?limit=50`            | Recent event log entries      |
| `GET`  | `/api/sessions`                   | Session summaries             |

---

## Hardware Integration Path

When ESP32 hardware arrives:

1. Flash firmware that POSTs `TelemetryFrame` JSON to `/api/telemetry`
2. Add a POST handler to the existing API route
3. Disable the simulator
4. Same dashboard, real data

---

## Roadmap

- [x] Simulated telemetry engine
- [x] Live dashboard with real-time charts
- [x] Device status page
- [x] Analytics with time windows
- [x] Event log with severity filters
- [x] SQLite session storage
- [x] User authentication (login/register)
- [x] Account settings page
- [x] Session history browser
- [x] Lumion brand design system
- [ ] ESP32 firmware + real telemetry
- [ ] CSV/JSON data export
- [ ] Camera-based tracking (pan-tilt)
- [ ] Multi-session comparison

---

## Team

| Member                    | Role                      |
|---------------------------|---------------------------|
| **Darius Ferent**         | Software & Dashboard Lead |
| **Alyssia Varela Fortes** | Hardware & Business Lead  |

Built at the Lycee des Arts et Metiers, Luxembourg — Maitrise d'Ouvrage, April 2026.

---

## License

This project is a student proof-of-concept for educational purposes.
