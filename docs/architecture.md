# BeamDock — Architecture Decision Record

## Overview

BeamDock is built around a **digital twin** approach: the software simulates the hardware before it exists, using the exact same data contracts that real firmware will use.

## Key Decisions

### 1. Next.js (App Router, TypeScript)
- Single project for both frontend and backend API
- App Router for file-based routing
- TypeScript everywhere for type safety across the firmware API boundary

### 2. SQLite via better-sqlite3
- Zero-config, file-based database
- Synchronous API avoids callback complexity for MVP
- WAL mode enables concurrent reads
- Easy to swap for PostgreSQL later if needed
- DB file lives in `data/beamdock.db` (gitignored)

### 3. Vanilla CSS (No Tailwind)
- Full control over the dark space-themed design system
- CSS custom properties for consistent theming
- No framework lock-in or build complexity

### 4. Polling (1s interval), not WebSockets
- Simpler to implement for MVP
- Works reliably with Next.js API routes
- Easy to swap for WebSocket/SSE later for lower latency

### 5. Simulator as In-Process Singleton
- The simulator lives in the same Node.js process as the API
- Auto-starts when the first telemetry endpoint is hit
- No separate process management needed for MVP
- Later: replace with real ESP32 HTTP POST data

### 6. Shared TypeScript Types
- `TelemetryFrame` and `EventEntry` are defined once in `src/lib/types.ts`
- Used by simulator, database layer, API routes, and frontend
- Same shape the ESP32 firmware will use

## Firmware Integration Strategy

```
Current:   Simulator → DB ← API ← Dashboard
Future:    ESP32 → POST /api/telemetry → DB ← API ← Dashboard
```

The API route will accept both:
- Simulator-generated frames (dev mode)
- ESP32-posted frames (production)

No dashboard changes needed when hardware arrives.
