---
type: people
updated: 2026-05-09
---

# People & Roles

## Ryan Schnitgen
- **Role:** Developer / Super-Admin
- **Email:** rschnitgen@zoominternet.net
- **Access:** Super-admin (can grant/revoke admin, delete accounts)

## Organization Contact
- **Email:** info@inspiredheartsandhands.com
- **Role:** Second super-admin account for the organization
- **Phone:** 724-230-6378

## Volunteer Structure
- **Super-admins:** rschnitgen@zoominternet.net, info@inspiredheartsandhands.com (defined in `admin/volunteers/page.tsx` SUPER_ADMINS array)
- **Admins:** any user with `isAdmin: true` in MongoDB User record (set via admin panel)
- **Volunteers:** all other registered users
- **Unlinked volunteers:** imported profiles with no Firebase account (no linkedUserId)
