# FamSync — Backend Specification

> Derived from the mobile mock data, existing `accounts` app, API client, and all screen flows.
> The `accounts` app already exists and is mostly complete. Everything else needs to be built.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Django Apps](#2-django-apps)
3. [Data Models & Relations](#3-data-models--relations)
4. [API Endpoints](#4-api-endpoints)
5. [Entity-Relationship Summary](#5-entity-relationship-summary)
6. [Permissions Matrix](#6-permissions-matrix)
7. [Settings & Environment Variables](#7-settings--environment-variables)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                           │
│           (Expo / React Native — web, iOS, Android)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS + JWT Bearer
┌───────────────────────▼─────────────────────────────────────┐
│                    Django REST API                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ accounts │  │ families │  │  events  │  │integrations│ │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  notifications                       │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   PostgreSQL DB    │
              └────────────────────┘
```

**Authentication:** Passwordless — Email OTP + Google OAuth → JWT (access 60 min, refresh 7 days, rotate + blacklist)

**Multi-tenancy model:** Users belong to one or more **families**. All calendar data is scoped to a family. A user can be a member of multiple families.

---

## 2. Django Apps

| App | Status | Responsibility |
|-----|--------|---------------|
| `accounts` | ✅ Exists | User auth: OTP, Google OAuth, JWT |
| `families` | 🔴 New | Family groups, membership, invite codes |
| `events` | 🔴 New | Calendar events, attendees, categories |
| `integrations` | 🔴 New | Google Calendar OAuth sync |
| `notifications` | 🔴 New | Push tokens, notification preferences |

---

## 3. Data Models & Relations

### 3.1 `accounts` — Already Exists

#### `User` (custom AbstractUser)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `email` | `EmailField` | unique, `USERNAME_FIELD` |
| `username` | `CharField(150)` | auto-generated, not used for login |
| `first_name` | `CharField(150)` | inherited |
| `last_name` | `CharField(150)` | inherited |
| `google_id` | `CharField(255)` | nullable, unique — links Google OAuth |
| `is_verified` | `BooleanField` | set True after first OTP / Google login |
| `created_at` | `DateTimeField` | auto |
| `updated_at` | `DateTimeField` | auto |

#### `VerificationCode`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `email` | `EmailField` | indexed |
| `code` | `CharField(6)` | 6-digit OTP |
| `created_at` | `DateTimeField` | auto |
| `expires_at` | `DateTimeField` | `created_at + OTP_EXPIRY_MINUTES` |
| `used` | `BooleanField` | marked True after successful verify |

---

### 3.2 `families` App — New

#### `Family`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `name` | `CharField(100)` | e.g. "Familia García" |
| `description` | `CharField(255)` | optional |
| `color` | `CharField(7)` | hex, default `#22C55E` |
| `invite_code` | `CharField(12)` | unique, auto-generated on create |
| `invite_code_expires_at` | `DateTimeField` | nullable — null = never expires |
| `created_by` | `ForeignKey(User)` | `SET_NULL`, nullable |
| `created_at` | `DateTimeField` | auto |
| `updated_at` | `DateTimeField` | auto |

#### `FamilyMember`

Represents a **User's membership in a Family**. Stores display overrides (name, color, initials) specific to this family context.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `family` | `ForeignKey(Family)` | `CASCADE`, `related_name='members'` |
| `user` | `ForeignKey(User)` | `CASCADE`, `related_name='family_memberships'` |
| `role` | `CharField(10)` | choices: `admin`, `member` — default `member` |
| `display_name` | `CharField(50)` | name shown within family (e.g. "Papá") |
| `color` | `CharField(7)` | hex avatar color, e.g. `#60A5FA` |
| `initials` | `CharField(3)` | e.g. "P", "M", "S" |
| `joined_at` | `DateTimeField` | auto |

**Constraints:**
- `unique_together = ('family', 'user')` — one membership per user per family
- Creator of a family is automatically added as `admin`

---

### 3.3 `events` App — New

#### `Category`

Global default categories exist (`family_id = NULL`). Families can create custom ones.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `family` | `ForeignKey(Family)` | `CASCADE`, nullable — null = global default |
| `label` | `CharField(50)` | e.g. "Escuela" |
| `icon` | `CharField(50)` | Ionicons name, e.g. `"school"` |
| `color` | `CharField(7)` | hex |
| `is_default` | `BooleanField` | True for the 7 seeded global categories |
| `order` | `PositiveSmallIntegerField` | sort order, default 0 |

**Global defaults to seed (migration):**

| id | label | icon | color |
|----|-------|------|-------|
| `family` | Familia | `people` | `#22C55E` |
| `school` | Escuela | `school` | `#A78BFA` |
| `health` | Salud | `medical` | `#FCA5A5` |
| `sport` | Deporte | `football` | `#FCD34D` |
| `home` | Hogar | `home` | `#86EFAC` |
| `food` | Comida | `restaurant` | `#FB923C` |
| `other` | Otro | `ellipsis-horizontal` | `#9CA3AF` |

#### `Event`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `family` | `ForeignKey(Family)` | `CASCADE`, `related_name='events'` |
| `category` | `ForeignKey(Category)` | `SET_NULL`, nullable |
| `created_by` | `ForeignKey(FamilyMember)` | `SET_NULL`, nullable |
| `title` | `CharField(120)` | required |
| `description` | `TextField` | blank=True |
| `date` | `DateField` | YYYY-MM-DD |
| `start_time` | `TimeField` | nullable — null when `all_day=True` |
| `end_time` | `TimeField` | nullable — null when `all_day=True` |
| `all_day` | `BooleanField` | default False |
| `location` | `CharField(255)` | blank=True |
| `priority` | `CharField(10)` | choices: `low`, `medium`, `high`, `family` — default `medium` |
| `created_at` | `DateTimeField` | auto |
| `updated_at` | `DateTimeField` | auto |

**Indexes:** `(family, date)` — queried heavily by date range

#### `EventAttendee`

Junction table: which `FamilyMember` attends which `Event`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `event` | `ForeignKey(Event)` | `CASCADE`, `related_name='attendees'` |
| `family_member` | `ForeignKey(FamilyMember)` | `CASCADE`, `related_name='event_attendances'` |
| `status` | `CharField(10)` | choices: `pending`, `accepted`, `declined` — default `pending` |

**Constraints:**
- `unique_together = ('event', 'family_member')`

---

### 3.4 `integrations` App — New

#### `GoogleCalendarIntegration`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `user` | `OneToOneField(User)` | `CASCADE`, `related_name='google_calendar'` |
| `access_token` | `TextField` | encrypted at rest (use `django-encrypted-model-fields` or env-level) |
| `refresh_token` | `TextField` | encrypted at rest |
| `token_expiry` | `DateTimeField` | nullable |
| `calendar_id` | `CharField(255)` | default `"primary"` |
| `last_sync_at` | `DateTimeField` | nullable |
| `is_active` | `BooleanField` | default True |
| `created_at` | `DateTimeField` | auto |

---

### 3.5 `notifications` App — New

#### `PushToken`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `user` | `ForeignKey(User)` | `CASCADE`, `related_name='push_tokens'` |
| `token` | `CharField(255)` | unique — Expo push token or APNs/FCM |
| `platform` | `CharField(10)` | choices: `ios`, `android`, `web` |
| `is_active` | `BooleanField` | default True |
| `created_at` | `DateTimeField` | auto |
| `last_used_at` | `DateTimeField` | auto_now |

#### `NotificationPreference`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigAutoField` | PK |
| `user` | `OneToOneField(User)` | `CASCADE`, `related_name='notification_prefs'` |
| `event_reminders` | `BooleanField` | default True |
| `family_activity` | `BooleanField` | default True — member joins, leaves, etc. |
| `weekly_summary` | `BooleanField` | default True |
| `reminder_minutes_before` | `PositiveSmallIntegerField` | default 30 |

---

## 4. API Endpoints

### 4.1 `accounts` — `/api/auth/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/google/` | None | Exchange Google ID token → JWT + user |
| `POST` | `/api/auth/email/request-otp/` | None | Send OTP to email |
| `POST` | `/api/auth/email/verify-otp/` | None | Verify OTP → JWT + user |
| `POST` | `/api/auth/refresh/` | None | Rotate JWT refresh token |
| `POST` | `/api/auth/logout/` | JWT | Blacklist refresh token |
| `GET` | `/api/auth/me/` | JWT | Get authenticated user |
| `PATCH` | `/api/auth/me/` | JWT | Update first_name / last_name |

---

### 4.2 `families` — `/api/families/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/families/` | JWT | List all families the user belongs to |
| `POST` | `/api/families/` | JWT | Create a new family (creator becomes admin) |
| `GET` | `/api/families/{id}/` | JWT + member | Get family detail |
| `PATCH` | `/api/families/{id}/` | JWT + admin | Update name, description, color |
| `DELETE` | `/api/families/{id}/` | JWT + admin | Delete family and all its data |
| `POST` | `/api/families/{id}/invite/` | JWT + admin | Regenerate invite code |
| `POST` | `/api/families/join/` | JWT | Join via `{ invite_code }` |
| `GET` | `/api/families/{id}/members/` | JWT + member | List all members |
| `PATCH` | `/api/families/{id}/members/{memberId}/` | JWT + admin | Update role, display_name, color, initials |
| `DELETE` | `/api/families/{id}/members/{memberId}/` | JWT + admin | Remove member |
| `DELETE` | `/api/families/{id}/members/me/` | JWT + member | Leave family |

**Request / Response shapes:**

```
POST /api/families/
Body: { name, description?, color? }
Response: { id, name, description, color, invite_code, created_at, members: [] }

POST /api/families/join/
Body: { invite_code }
Response: { family: { id, name, color }, member: { id, role, display_name } }

PATCH /api/families/{id}/members/{memberId}/
Body: { role?, display_name?, color?, initials? }
Response: { id, user_id, role, display_name, color, initials }
```

---

### 4.3 `events` — `/api/families/{familyId}/events/` & `/api/categories/`

#### Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/families/{id}/events/` | JWT + member | List events — query params: `date`, `date_from`, `date_to`, `member_id`, `priority`, `category` |
| `POST` | `/api/families/{id}/events/` | JWT + member | Create event |
| `GET` | `/api/families/{id}/events/{eventId}/` | JWT + member | Get event detail with attendees |
| `PATCH` | `/api/families/{id}/events/{eventId}/` | JWT + member | Update event (creator or admin) |
| `DELETE` | `/api/families/{id}/events/{eventId}/` | JWT + member | Delete event (creator or admin) |

**Request body — Create/Update Event:**
```json
{
  "title": "Control médico — Pedro",
  "description": "Posible conflicto con entrenamiento",
  "date": "2026-03-26",
  "start_time": "15:00",
  "end_time": "16:30",
  "all_day": false,
  "location": "Clínica Buen Pastor",
  "priority": "high",
  "category_id": 3,
  "attendee_ids": [2, 4]
}
```

**Response — Event:**
```json
{
  "id": 42,
  "title": "Control médico — Pedro",
  "description": "...",
  "date": "2026-03-26",
  "start_time": "15:00",
  "end_time": "16:30",
  "all_day": false,
  "location": "Clínica Buen Pastor",
  "priority": "high",
  "category": { "id": 3, "label": "Salud", "icon": "medical", "color": "#FCA5A5" },
  "attendees": [
    { "id": 2, "display_name": "Mamá", "color": "#F472B6", "initials": "M", "status": "pending" },
    { "id": 4, "display_name": "Luis",  "color": "#FB923C", "initials": "L", "status": "pending" }
  ],
  "created_by": { "id": 1, "display_name": "Papá" },
  "created_at": "2026-03-26T10:00:00Z",
  "updated_at": "2026-03-26T10:00:00Z"
}
```

#### Attendee Status

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/api/families/{id}/events/{eventId}/attendees/me/` | JWT + attendee | Update own status: `{ status: "accepted" \| "declined" }` |

#### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/categories/` | JWT | List global default categories |
| `GET` | `/api/families/{id}/categories/` | JWT + member | Global + family custom categories |
| `POST` | `/api/families/{id}/categories/` | JWT + admin | Create custom category |
| `PATCH` | `/api/families/{id}/categories/{catId}/` | JWT + admin | Update custom category |
| `DELETE` | `/api/families/{id}/categories/{catId}/` | JWT + admin | Delete custom category (not default) |

---

### 4.4 `integrations` — `/api/integrations/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/integrations/google-calendar/` | JWT | Get connection status + last sync time |
| `POST` | `/api/integrations/google-calendar/connect/` | JWT | Start OAuth flow — returns `{ auth_url }` |
| `GET` | `/api/integrations/google-calendar/callback/` | None | OAuth callback — stores tokens, redirects |
| `POST` | `/api/integrations/google-calendar/sync/` | JWT | Trigger manual sync → background task |
| `DELETE` | `/api/integrations/google-calendar/` | JWT | Disconnect (revoke + delete tokens) |

---

### 4.5 `notifications` — `/api/notifications/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/notifications/tokens/` | JWT | Register push token: `{ token, platform }` |
| `DELETE` | `/api/notifications/tokens/{token}/` | JWT | Unregister token |
| `GET` | `/api/notifications/preferences/` | JWT | Get notification preferences |
| `PATCH` | `/api/notifications/preferences/` | JWT | Update preferences |

---

## 5. Entity-Relationship Summary

```
User ──────────────────────────────────────────────┐
 │                                                  │
 │ 1:N  FamilyMember ◄──── M:1 ──── Family          │
 │       │                                          │
 │       │ 1:N EventAttendee ◄──── M:1 ──── Event   │
 │       │                             │            │
 │       │                             M:1          │
 │       │                           Category       │
 │       │                        (family nullable) │
 │                                                  │
 │ 1:1  GoogleCalendarIntegration                   │
 │                                                  │
 │ 1:N  PushToken                                   │
 │                                                  │
 └─ 1:1  NotificationPreference                     │
                                                    │
 VerificationCode ──── email (no FK) ───────────────┘
```

**Key relationships:**
- `User` → `FamilyMember` (1:N) — a user can belong to many families
- `Family` → `FamilyMember` (1:N) — a family has many members
- `Family` → `Event` (1:N) — events belong to a family
- `FamilyMember` → `EventAttendee` (1:N) — members can attend many events
- `Event` → `EventAttendee` (1:N) — events have many attendees
- `Category` → `Event` (1:N) — nullable; global or family-specific
- `User` → `GoogleCalendarIntegration` (1:1)
- `User` → `NotificationPreference` (1:1)
- `User` → `PushToken` (1:N)

---

## 6. Permissions Matrix

| Action | Any User | Family Member | Family Admin | Creator |
|--------|----------|---------------|--------------|---------|
| Create family | ✅ | — | — | — |
| View family | — | ✅ | ✅ | — |
| Edit family settings | — | — | ✅ | — |
| Delete family | — | — | ✅ (must be creator) | — |
| Invite members | — | — | ✅ | — |
| Remove members | — | — | ✅ | — |
| Leave family | — | ✅ | ✅ | — |
| Update own member profile | — | ✅ | ✅ | — |
| Update other member profile | — | — | ✅ | — |
| Create event | — | ✅ | ✅ | — |
| Edit event | — | — | ✅ | ✅ |
| Delete event | — | — | ✅ | ✅ |
| View events | — | ✅ | ✅ | — |
| Update own RSVP status | — | ✅ (if attendee) | ✅ | — |
| Create custom category | — | — | ✅ | — |
| Connect Google Calendar | ✅ (own) | — | — | — |

---

## 7. Settings & Environment Variables

### New variables to add to `backend/.env`

```ini
# Google Calendar OAuth (separate from Google Sign-In)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/integrations/google-calendar/callback/

# Expo push notifications (if using Expo's push service)
EXPO_PUSH_ACCESS_TOKEN=

# Encryption key for stored OAuth tokens (integrations app)
FIELD_ENCRYPTION_KEY=

# Optional: Celery / task queue for async sync jobs
CELERY_BROKER_URL=redis://localhost:6379/0
```

### New apps to add to `INSTALLED_APPS`

```python
INSTALLED_APPS = [
    ...existing...
    'families',
    'events',
    'integrations',
    'notifications',
]
```

### New URL includes in `config/urls.py`

```python
urlpatterns = [
    path('api/auth/',         include('accounts.urls')),
    path('api/families/',     include('families.urls')),
    path('api/categories/',   include('events.category_urls')),
    path('api/integrations/', include('integrations.urls')),
    path('api/notifications/',include('notifications.urls')),
]
```

---

## Implementation Order

1. **`families` app** — foundation; everything else depends on `FamilyMember`
2. **`events` app** — core product value; categories + events + attendees
3. **`notifications` app** — lightweight, no external deps
4. **`integrations` app** — depends on Google Calendar API, build last

---

*Generated from: mobile mockData, API client, all screen flows, and existing `accounts` app source.*
