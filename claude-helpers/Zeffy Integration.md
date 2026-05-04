# Zeffy Integration

Zeffy is a free fundraising platform. This app connects to Zeffy so that donations made through Zeffy automatically appear in your fundraisers — no manual entry needed.

---

## How to Connect

1. Log into Zeffy and go to your account settings to find your **API key**.
2. In this app, go to **Settings** and find the Zeffy section.
3. Paste your API key and click **Connect**.

The app will test the key immediately. If it works, you'll see a "Connected" status. If not, double-check that you copied the full key.

---

## What the Sync Does

Once connected, you can click **Sync Now** in Settings to pull data from Zeffy into the app. There are two things that sync:

### Donations
- Every payment in Zeffy is checked against your existing fundraisers.
- If a Zeffy campaign matches a fundraiser already in the app, the donation is linked to it. If not, a new fundraiser is created automatically.
- If the donor's email matches a Person in your office, the donation is **auto-approved** and linked to that person.
- If the donor email doesn't match anyone, the donation is saved as **Pending** — you can review and approve it manually in the fundraiser detail page.
- Payments that have already been imported are skipped automatically (safe to run sync multiple times).

### Contacts
- Every Zeffy contact with an email address is checked against your People records.
- If a contact's email is already in your office, they are skipped.
- If they're new, a People record is created for them automatically.
- Contacts without an email address are skipped.

The sync results (how many were synced, skipped, or had errors) are shown on screen after the sync completes.

---

## Webhooks (Real-Time Donations)

In addition to the manual sync, Zeffy can send the app a notification the moment a donation is made. This is called a **webhook**.

If Zeffy is configured to send webhooks to this app, new donations will appear automatically without needing to click Sync Now. The webhook uses the same logic as the manual sync — idempotency, donor matching, and fundraiser linking all work the same way.

The webhook URL is: `https://<your-domain>/api/webhooks/zeffy`

---

## Donor Matching

When a Zeffy payment comes in, the app tries to find the donor in your People records by email address (case-insensitive, checks both email fields).

| Situation | Result |
|-----------|--------|
| Email matches a Person | Donation linked to them, status: **Auto Approved** |
| Email doesn't match anyone | Donation saved with status: **Pending** |
| No email on the payment | Donation saved with status: **Pending** |

Pending donations can be reviewed and approved on the fundraiser detail page.

---

## Fundraiser Matching

Each Zeffy campaign maps to one fundraiser in the app.

| Situation | Result |
|-----------|--------|
| Zeffy campaign already has a matching fundraiser | Donation added to that fundraiser |
| Zeffy campaign is new | A new fundraiser is created automatically |
| Payment has no campaign | Added to a catch-all **"Zeffy Donations"** fundraiser |

All amounts are stored in cents internally (a $100 donation is stored as 10000).

---

## How to Disconnect

Go to **Settings**, find the Zeffy section, and click **Disconnect**. This removes the API key from the app. Your existing donations and fundraisers that came from Zeffy are kept — nothing is deleted from your data.

---

## Troubleshooting

**Sync says 0 synced, lots of skipped** — Everything in Zeffy has already been imported. This is normal after the first sync.

**Donations showing as Pending** — The donor email didn't match a Person in your office. Go to the fundraiser detail page to review and approve them.

**Connect fails with an error** — The API key is wrong or expired. Get a fresh one from Zeffy account settings.

**Webhook donations not appearing** — Check that the webhook URL is correctly configured in Zeffy. The URL must point to `/api/webhooks/zeffy` on your live domain (not localhost).
