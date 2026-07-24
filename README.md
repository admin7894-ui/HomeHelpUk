# HomeHelpUK — Investor POC

A UK home-services marketplace app (Urban Company-inspired, with its own distinct navy/amber
branding) built as an **investor proof of concept**. One React Native (Expo) app with a
switchable **Customer** and **Provider** mode, backed by a mock Express API — no external
services or paid accounts required to run it.

> This is a POC / investor demo, not a production application. Payments, maps, and OTP login
> are all mocked. See Section 9 for what's simulated vs. real.

---

## 1. Project structure

```
HomeHelpUK/
├── server/                  Express backend (mock JSON "database")
│   ├── routes/               Route definitions per resource
│   ├── controllers/          Request handlers / business logic
│   ├── data/                 JSON files acting as the database (read/write at runtime)
│   ├── middleware/           Fake-JWT auth middleware
│   ├── utils/                Helpers (id + token generation)
│   └── server.js              App entry point
│
└── mobile/                  React Native (Expo) app
    ├── src/
    │   ├── assets/
    │   ├── components/       Shared UI: AppButton, Card, AccessibleTextInput, etc.
    │   ├── screens/
    │   │   ├── Auth/          Login, Register
    │   │   ├── Customer/      Home, ServiceDetail, ProviderDetail, BookService,
    │   │   │                  Payment, BookingConfirmation, BookingStatus,
    │   │   │                  RateReview, Bookings, Messages
    │   │   ├── Provider/      JobFeed, JobDetail, MyJobs, Earnings, ReviewsReceived
    │   │   └── Shared/        Onboarding, Profile, Chat, Notifications
    │   ├── navigation/        Root stack + Customer/Provider bottom-tab navigators
    │   ├── store/             Zustand stores (auth, app/accessibility prefs, bookings)
    │   ├── services/          Axios API client
    │   └── utils/              theme.js (shared design tokens)
    └── App.js
```

---

## 2. Prerequisites

- Node.js 18+ and npm
- The [Expo Go](https://expo.dev/go) app on your phone (easiest way to run it), **or**
  Xcode/Android Studio simulators if you prefer
- Both your computer and phone on the same Wi-Fi network (for the Expo Go route)

---

## 3. Running the backend

```bash
cd server
cp .env.example .env
npm install
npm start
# API now running at http://localhost:4000
```

Quick smoke test:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/categories
```

The "database" is just the JSON files in `server/data/`. Creating a booking, submitting a
review, or updating booking status **writes back to these files**, so the demo can show real
persistence and, if you run it on your laptop while your phone hits the same server over
Wi-Fi, a genuinely live Customer → Provider hand-off.

To reset demo data at any time, restore the JSON files from git or re-copy the originals.

---

## 4. Running the mobile app

```bash
cd mobile
npm install
npx expo start
```

This prints a QR code — scan it with Expo Go (iOS/Android) to run the app on your phone, or
press `i` / `a` in the terminal for a simulator.

### Pointing the app at your backend

The mobile app automatically resolves the API host so you rarely need to change it manually. It checks these in order:
1. **Environment Variable**: If `EXPO_PUBLIC_API_URL` is set, it uses that (e.g. for staging/production).
2. **Dynamic LAN IP (Expo Go)**: If running on a physical device via Expo Go, it automatically detects your development machine's LAN IP so it just works. **Make sure your phone and computer are on the same Wi-Fi network.**
3. **Simulator Fallbacks**: If running in a simulator where Expo's LAN IP isn't available, it falls back to `http://localhost:4000/api` (iOS/Web) or `http://10.0.2.2:4000/api` (Android).

*Note: The backend server is bound to `0.0.0.0` to ensure it can accept connections from external devices on your Wi-Fi network.*

If the app cannot reach the server, you will see a clear error message: "Cannot reach server — check that your device and computer are on the same Wi-Fi network."

---

## 5. Demo accounts

| Role      | Email                 | Password      |
|-----------|------------------------|---------------|
| Customer  | sophie@example.com     | password123   |
| Provider  | aisha@example.com      | password123   |

Or tap "Create an account" to register a fresh Customer or Provider from scratch.

---

## 6. Demo script (suggested investor walkthrough)

1. **Onboarding** — show the accessibility setup (text size, high-contrast, voice assistance).
2. **Log in as Sophie (Customer)** — browse categories, open "Gardening", pick a provider,
   book a slot, and note the transparent price breakdown ("provider earns £X / service fee £Y").
3. **Mock payment** — pay with the test card, land on the confirmation screen.
4. **Track status** — walk through Provider Assigned → En Route → In Progress → Complete.
5. **Switch to Provider mode** (Profile → Switch to Provider Mode, or log in as Aisha on a
   second device) — accept the job from the Job Feed, advance its status, and open **Earnings**
   to show the commission breakdown live — this is the strongest "we take less" investor moment.
6. **Rate & review** — back in Customer mode, leave a review once the job is complete.

---

## 7. Design & accessibility notes

- One shared `theme.js` token file (navy/amber, warm and rounded — deliberately not Urban
  Company's black/white minimalism) with a subtle accent shift between Customer (navy) and
  Provider (teal) mode.
- A genuinely separate **high-contrast theme** (not just darker text) is toggleable from
  Onboarding or Profile → Accessibility.
- Font scale (Small / Default / Large / Extra Large) is stored in app state and applied via a
  shared scale helper (`scaledFont`) used throughout the screens.
- Every interactive element carries `accessibilityLabel` / `accessibilityRole`.
- A POC-level "read aloud" button (powered by `expo-speech`) appears on Home and Service
  Detail once Voice Assistance is enabled in Accessibility settings — full voice navigation is
  a post-POC feature.

---

## 8. Commission model shown in the app

Per the market research behind this POC, the platform commission is fixed at **11%**
(`server/controllers/bookingsController.js`), positioned well below the 15–25% typical of
Urban Company / TaskRabbit-style marketplaces. Every price summary in the app itemises:

- What the provider earns (hourly rate × duration)
- The service fee (11%)
- The total the customer pays

The Provider Earnings screen surfaces this same split live, which is the core "fairer to the
people doing the work" narrative for investors.

---

## 9. What's real vs. simulated in this POC

| Feature                     | Status                                                        |
|-------------------------------|----------------------------------------------------------------|
| Auth                          | Real Express endpoints, but fake JWT (not for production use)  |
| Categories / providers        | Real API, served from JSON mock data                           |
| Bookings & status tracking    | Real API + persisted JSON, mock lifecycle (no real dispatch)   |
| Reviews                       | Real API, recalculates provider rating live                    |
| Notifications                 | Real API, created as a side-effect of booking/status changes    |
| Payment                       | Fully mocked — no card details are transmitted or stored        |
| Chat                          | Mocked in-app only, not persisted or networked                  |
| Maps / location                | Not included — addresses are free-text UK postcodes             |

---

## 10. Next steps beyond the POC

- Swap the JSON "database" for a real datastore (Postgres/Firestore) and real JWT auth
- Real payment gateway integration (Stripe)
- Push notifications for booking status changes
- Real-time sync (websockets/Firestore listeners) instead of pull-to-refresh
- Full voice navigation, not just read-aloud
- Expand licensed/certified service categories (plumbing, gas, electrical) with proper
  compliance checks
