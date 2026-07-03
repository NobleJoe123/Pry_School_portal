# Implementation Plan — Primary School Portal

## Summary
Continued development from existing codebase. This document captures completed work and remaining tasks.

## Completed ✅

### Missing Parent Pages (Critical)
Both files were completely missing, causing import errors and broken routes in `App.tsx`.

#### `frontend/src/pages/Parents/ParentReports.tsx` [NEW - DONE]
- Full report card viewer for parents
- Multi-child selector tabs (if multiple children)
- Per-subject score breakdown with expandable rows and progress bars
- Grade calculation (A/B/C/D/F) with visual indicators
- Handles "no published report" state gracefully
- Consumes `endpoints.academics.scores` and `endpoints.academics.reportCards`

#### `frontend/src/pages/Parents/ParentTickets.tsx` [NEW - DONE]
- Support ticket system for parent-school communication
- Create new tickets with subject, category, priority
- View conversation thread (message drawer/side panel)
- Filter by status (Open / In Progress / Resolved / Closed) and search
- Reply within open tickets
- Demo data included; backend integration ready when `/support/tickets/` endpoint is added

### App Routes (already existed in `App.tsx`)
```
/parent/reports  → ParentReports
/parent/tickets  → ParentTickets
```

### Sidebar (already existed in `Sidebar.tsx`)
- 'Academic Reports' link → `/parent/reports`
- QuickNavCard in `ParentDashboard` → `/parent/reports`

## Current Architecture
- **Backend**: Django REST Framework with JWT auth
- **Frontend**: React + TypeScript + Vite, Tailwind-like utility classes (custom CSS)
- **Auth Context**: `useAuth()` → provides `user` object with `user.children[]`
- **API layer**: `api.get/post/patch/delete` wrappers in `frontend/src/utils/api.ts`

## Remaining Tasks

### Backend — Support Tickets (Optional Enhancement)
The `ParentTickets` page currently uses demo data. A real implementation needs:
- Django model: `SupportTicket` (parent, subject, category, priority, status, created_at)
- Django model: `TicketMessage` (ticket FK, sender, body, timestamp)
- DRF Serializers + ViewSets for both models
- URL registration in `portal/urls.py`
- Frontend `endpoints.support.tickets` entry in `api.ts`

### Known Issues to Investigate
- `ParentDashboard.tsx` references `endpoints.attendance.students` for parent view — confirm backend filters by parent's children
- Check if `endpoints.auth.notifications` returns per-parent notifications or global

## Verification
1. Run `npm run dev` in `frontend/` → visit `/parent/reports` and `/parent/tickets`
2. Log in as a parent account to test live data flow
3. Run `docker-compose exec backend python manage.py test` for backend tests