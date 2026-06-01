# API v2 — breaking changes (security hardening)

Clients integrating after the `fix(security)` commit on `main` must follow these rules.
The SPA (`love_frontend`) already implements them.

## Session and CSRF

- All mutating requests use **session cookies** (`withCredentials: true` / `credentials: 'include'`).
- Before the first `POST`/`PATCH`/`PUT`/`DELETE`, call **`GET /api/csrf/`** to receive the `csrftoken` cookie.
- Send the token on writes: header **`X-CSRFToken`** (see `love_frontend/src/api/axiosInstance.js`).

## Registration

| Before | After |
|--------|--------|
| `POST /api/register/` logged you in immediately | Returns `201` with `authenticated: false` and `message` — **call `POST /api/login/`** next |

Rate limit: **5 requests/hour** per IP (`register` throttle).

## Donations list API

| Before | After |
|--------|--------|
| `GET/POST /api/donations/` public | **Admin/staff only** (`IsAdminUser`) |

Public giving uses **`POST /api/payments/checkout/`** only.

## Checkout (Stripe)

**Required fields:**

- `charity` — id of a **verified**, active charity
- `campaign` — campaign **id or slug** (no silent flagship fallback)
- `donor_email` — valid email (non-empty)
- `amount` — positive decimal

**Optional:** `donor_name`, `message`, `is_anonymous`

**Origin:** request `Origin` or `Referer` must match `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` (dev includes `http://localhost:5173`).

Example:

```json
POST /api/payments/checkout/
{
  "charity": 1,
  "campaign": "anna-and-alan",
  "donor_name": "Guest",
  "donor_email": "guest@example.com",
  "amount": 50,
  "message": "Congrats!"
}
```

Response: `{ "checkout_url": "...", "donation_id": 123 }` — redirect the browser to `checkout_url`.

Confirmation is **webhook-driven** (`checkout.session.completed` with `payment_status=paid`, or `payment_intent.succeeded`). Do not rely on admin `PATCH .../confirm/` for Stripe gifts.

## Donation serializer (PII)

- Non-staff never receive `donor_email`.
- When `is_anonymous=true`, public/admin list responses omit `donor_name` and `message`; use `display_name` (`"Anonymous"`).

## Charities

- `DELETE /api/charities/{id}/` **soft-deactivates** (`is_active=false`); does not hard-delete.
- Updates require **owner/admin/editor** membership; deactivate requires **owner/admin**.
- Duplicate **name** (case-insensitive) rejected on create/update.

Staff-only: `GET /api/charities/pending/`, `PATCH .../verify/`, `PATCH .../reject/`.

## Campaigns

- **`DELETE`** only for the **owner** (cohosts cannot delete).
- Publish (`status=active`) requires verified charity with **charges_enabled** payout account.

## Connect onboarding

- `POST /api/payments/connect/` — charity **owner/admin** or platform staff only.
- Charity must be **`is_active=true`**.

## Local smoke (no Stripe)

```bash
cd love_backend
python manage.py migrate
python manage.py import_donations --csv ../love_frontend/public/data/donations.csv
python manage.py smoke_donate_flow --drain
```

With Stripe test keys in `.env`:

```bash
stripe listen --forward-to localhost:8000/api/payments/webhook/
# Donate at http://localhost:5173/donate
```
