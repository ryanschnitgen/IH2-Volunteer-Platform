---
type: decisions
updated: 2026-05-09
---

# Project Decisions

## Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (no separate server)
- **Database:** MongoDB via Mongoose — models live in `backend/lib/models/`
- **Auth:** Firebase (client) + Firebase Admin SDK (server)
- **Email:** Resend
- **File imports:** xlsx for Excel, native CSV parsing

## Architecture
- All API routes connect to MongoDB via `connectDB()` from `@backend/lib/db/mongodb`
- Admin access controlled by `isAdmin()` from `@backend/lib/admin`
- Super-admins hardcoded in code: `rschnitgen@zoominternet.net`, `info@inspiredheartsandhands.com`
- No separate backend server — everything runs as Next.js API routes

## Hours Tracking
- Hours stored in two places: `HoursLog` (all hours) and `EventRegistration.hoursCompleted` (event-specific)
- `autoAssigned: true` = created by assign-hours endpoint when admin closes an event
- `autoAssigned: false` = manual entry or clock-in/out
- User volunteer-hours page counts event hours from EventRegistration, manual hours from HoursLog(!autoAssigned), imported from VolunteerProfile.lifetimeHours
- Analytics endpoint avoids double-counting by excluding autoAssigned HoursLog when summing event registration hours

## Volunteers
- `VolunteerProfile` = imported legacy data (may have no Firebase account)
- `linkedUserId` = Firebase UID linking profile to account
- Volunteers can be imported without email (username-based matching)
- `lifetimeHours` on VolunteerProfile = hours from the OLD system only (not platform hours)
- Platform hours tracked separately in HoursLog

## Events / Opportunities
- Events marked `status: 'completed'` after hours are assigned via assign-hours API
- Opportunities page shows only `status: 'active'` events with date >= today
- Group registrations supported: `totalAttendees`, `additionalAttendees`, `attendeeNames`
- `isGroupCheckIn: true` = guests without accounts, no individual names required

## Tools Installed
- **Ruflo** (formerly Claude Flow) — multi-agent orchestration, installed 2026-05-09
  - Daemon running (PID 55493)
  - Memory DB initialized at `.swarm/memory.db`
  - Swarm ID: `swarm-1778382916641-rgle0c`
