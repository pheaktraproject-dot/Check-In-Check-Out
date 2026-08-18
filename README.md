# Alongsiders Attendance

A staff check-in / check-out system for Alongsiders. Staff sign in with a
passkey (fingerprint or Face ID), scan a QR code, and tap Check In or Check
Out. Admins see everyone's attendance, fix mistakes, and download an Excel
report.

Built with React + TypeScript + Vite + Tailwind CSS (frontend), Netlify
Functions (backend), and Supabase (database). Installable as an app (PWA) on
Android and iPhone.

---

## 1. How it's organized

```
alongsiders-attendance/
├── src/                        Frontend (React app)
│   ├── pages/                  Login, Register, staff Dashboard
│   │   └── admin/              Admin Dashboard, Staff, Attendance, QR, Settings
│   ├── components/              QR scanner, install-app prompt, route guards
│   └── lib/                    API client, auth state, passkey helper
├── netlify/functions/          Backend (one file = one API endpoint)
│   └── _lib/                   Shared helpers (database client, auth, settings)
├── supabase/schema.sql         Database tables and security rules
├── public/                     App icons, robots.txt
├── netlify.toml                Netlify build & routing configuration
└── .env.example                List of settings you need to fill in
```

The browser (the app on someone's phone) never talks to the database
directly and never holds a database key. Every action goes through a
Netlify Function, which is the only thing that holds the powerful database
key. This is what keeps the system secure.

---

## 2. What you need before you start

- A free [Supabase](https://supabase.com) account (the database)
- A free [Netlify](https://netlify.com) account (where the app lives)
- A [GitHub](https://github.com) account (to hold the code so Netlify can
  find it)
- Node.js installed on your computer (version 18 or newer) — only needed if
  you want to test things on your own computer before publishing

---

## 3. Step 1 — Set up the database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a new project.
   Pick any name, e.g. "alongsiders-attendance". Save the database password
   somewhere safe.
2. Once the project is ready, open **SQL Editor** in the left menu.
3. Open the file `supabase/schema.sql` from this project, copy all of it,
   paste it into the SQL Editor, and click **Run**. This creates all the
   tables the app needs.
4. Open **Project Settings → API**. You will need two values from this
   page later:
   - **Project URL** (this is your `SUPABASE_URL`)
   - **service_role key**, under "Project API keys" (this is your
     `SUPABASE_SERVICE_ROLE_KEY`)

   ⚠️ The service_role key is very powerful — it can read and change
   anything in the database. Never put it in the frontend code, never
   share it, never commit it to GitHub. It only ever goes into Netlify's
   environment variables (Step 5).

---

## 4. Step 2 — Create the first administrator account

The app itself only lets people register as regular staff. The very first
administrator has to be created by hand, once.

1. On your own computer, open a terminal in this project folder and run:
   ```bash
   npm install
   node -e "console.log(require('bcryptjs').hashSync('choose-a-strong-password', 12))"
   ```
   This prints a long scrambled password hash. Copy it.
2. In Supabase, open **SQL Editor** and run (replace the placeholders):
   ```sql
   insert into users (name, email, password_hash, role)
   values ('Admin Name', 'admin@alongsiders.org', 'PASTE-THE-HASH-HERE', 'admin');
   ```
3. That's it — this person can now log in with that email and password, and
   set up a passkey for themselves from then on, and can also promote other
   staff to admin later from the Admin → Staff page.

---

## 5. Step 3 — Put the code on GitHub

1. Create a new, empty repository on GitHub (e.g. `alongsiders-attendance`).
2. From this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/alongsiders-attendance.git
   git push -u origin main
   ```

---

## 6. Step 4 — Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import
   an existing project**.
2. Choose GitHub and select the repository you just pushed.
3. Netlify will detect the build settings from `netlify.toml` automatically
   (build command `npm run build`, publish folder `dist`, functions folder
   `netlify/functions`). Click **Deploy**.
4. The first deploy will likely finish but the app won't work correctly yet
   — you still need to add the environment variables in the next step.

---

## 7. Step 5 — Environment variables

In Netlify: **Site settings → Environment variables → Add a variable**, and
add every value listed in `.env.example`:

| Variable | Where it comes from |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret!) |
| `VITE_ALLOWED_EMAIL_DOMAIN` | `alongsiders.org` |
| `JWT_SECRET` | Any long random text — run `openssl rand -base64 48` |
| `QR_SIGNING_SECRET` | Another long random text, different from the one above |
| `RP_ID` | Your site's domain with no `https://`, e.g. `alongsiders-attendance.netlify.app` |
| `RP_NAME` | `Alongsiders Attendance` |
| `ORIGIN` | Your full site address, e.g. `https://alongsiders-attendance.netlify.app` |
| `DEFAULT_TIMEZONE` | `Asia/Phnom_Penh` |
| `DEFAULT_WORK_START` | `08:00` |
| `DEFAULT_WORK_END` | `17:00` |
| `DEFAULT_LATE_THRESHOLD_MINUTES` | `15` |
| `QR_TOKEN_TTL_SECONDS` | `30` |

After saving, go to **Deploys** and click **Trigger deploy → Deploy site**
so the new settings take effect.

**Important:** `RP_ID` and `ORIGIN` must exactly match the real address
people use to open the app, including using a custom domain if you set one
up later — otherwise passkeys will stop working. If you later attach a
custom domain (e.g. `attendance.alongsiders.org`), update these two
variables and redeploy.

---

## 8. Step 6 — Try it out

1. Open your Netlify site address on a phone.
2. Tap **Register**, sign up with an `@alongsiders.org` email, and follow
   the prompt to set up a passkey (fingerprint or Face ID).
3. On a separate device or computer, log in as the administrator you
   created in Step 2, go to **Admin → QR Code**, and display it.
4. Back on the staff phone, tap **Check In**, scan that QR code, and you
   should see a confirmation message with the time.
5. Try **Install App** on the login screen to add it to the home screen.

---

## 9. Everyday use

**Staff**
- Open the app (or tap its home-screen icon).
- Sign in with your passkey.
- Tap Check In or Check Out, then scan the screen at the entrance.

**Admin**
- Display **Admin → QR Code** on a tablet, computer, or screen at the
  entrance. It refreshes on its own every 30 seconds so an old code can't
  be reused; there's also a **Generate New QR Code** button.
- **Admin → Dashboard** shows who's in, who's out, and who's late today.
- **Admin → Attendance** lets you filter by date, staff, month, or year, fix
  a record someone forgot to check out of, and download an Excel file for
  any date range.
- **Admin → Staff** lets you promote someone to admin or turn off an
  account.
- **Admin → Settings** lets you change work start/end times, how many
  minutes late counts as "late," and the timezone.

---

## 10. Passkeys, explained simply

A passkey lets someone unlock the app with the same fingerprint or face
scan they already use to unlock their phone. The phone itself checks the
fingerprint or face — that information never leaves the phone and is never
sent to, or stored on, our server. All the server ever receives and stores
is a public "key" that can confirm a login is genuine, similar to how a
lock can check a key fits without ever needing to know how the key was cut.

If someone loses their phone or gets a new one, they can log in with their
password once and set up a new passkey from their dashboard.

---

## 11. Security measures already built in

- Every check-in/out time is recorded by the server's clock, never the
  phone's clock, so nobody can fake the time by changing their phone
  settings.
- The QR code changes automatically and expires quickly, so a photo of it
  becomes useless within seconds.
- Only admins can view attendance records or download the Excel report.
- Registration is blocked for anyone without an `@alongsiders.org` email.
- The database is locked down (Row Level Security) so that even if a key
  were ever exposed by mistake, direct database access is still blocked
  unless it comes from the server.
- Every sign-in, check-in, check-out, admin correction, and export is
  written to an audit log.

---

## 12. Local development (optional)

If you want to test changes on your own computer before publishing:

```bash
npm install
npm install -g netlify-cli
cp .env.example .env      # then fill in the real values
netlify dev
```

This runs the frontend and the backend functions together on
`http://localhost:8888`. Passkeys require `RP_ID=localhost` and
`ORIGIN=http://localhost:5173` (or whichever port `netlify dev` reports)
while testing locally.

---

## 13. Troubleshooting

- **"Please use your @alongsiders.org email address."** — registration or
  login was attempted with a different email domain. This is expected
  behavior.
- **Passkey button does nothing / fails silently** — check that `RP_ID` and
  `ORIGIN` in Netlify's environment variables exactly match the address in
  the phone's browser bar, and that the site is served over `https://`
  (Netlify does this automatically).
- **Camera won't open for QR scanning** — the browser needs permission to
  use the camera, and the page must be `https://`. On iPhone, QR scanning
  only works in Safari or a home-screen-installed app, not inside another
  app's built-in browser.
- **"This QR code has expired."** — the screen refreshed after the person
  started scanning. Ask them to scan the current code again; this is by
  design so an old code (or a photo of one) cannot be reused.
