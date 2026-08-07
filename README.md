# The Board — Campus Lost & Found

A React + Vite app for posting and browsing lost/found items, with email
sign-up verified by a one-time passcode (OTP) sent through Gmail.

## Project structure

```
.
├── src/            # React frontend (Vite)
└── server/          # Tiny Express API that emails OTP codes via Gmail
```

## 1. Set up the OTP email server

The OTP codes are sent using a Gmail account + an **App Password** (not your
regular Gmail password — Google blocks plain-password SMTP logins).

1. Turn on 2-Step Verification on the Gmail account you want to send from:
   https://myaccount.google.com/security
2. Generate an App Password: https://myaccount.google.com/apppasswords
   - App: "Mail", Device: "Other" → name it "The Board", then copy the
     16-character password it gives you.
3. In `server/`, copy the example env file and fill it in:

   ```bash
   cd server
   cp .env.example .env
   ```

   ```
   GMAIL_USER=youraddress@gmail.com
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   # the 16-char App Password, no spaces
   PORT=4000
   FRONTEND_URL=http://localhost:5173
   ```

4. Install and run the server:

   ```bash
   npm install
   npm start
   ```

   You should see `OTP server listening on http://localhost:4000`.

## 2. Run the frontend

In the project root (a separate terminal):

```bash
npm install
npm run dev
```

By default the frontend calls the OTP server at `http://localhost:4000`. If
you're running the server somewhere else, copy `.env.example` to `.env` in
the project root and set `VITE_API_URL` accordingly.

## How the OTP flow works

1. User fills in the **Sign Up** form (name, email, password) and submits.
2. The frontend calls `POST /api/send-otp` → the server generates a 6-digit
   code, stores it in memory for 5 minutes, and emails it via Gmail.
3. The modal switches to a 6-digit code entry screen.
4. The frontend calls `POST /api/verify-otp` with the code the user typed.
5. On success, the account is "created" (this demo stores the session in
   `localStorage` — swap in a real user database for production).

Codes expire after 5 minutes, allow 5 incorrect attempts before requiring a
resend, and resending is rate-limited to once every 30 seconds.

## Notes

- The OTP store is in-memory, so it resets if the server restarts — fine
  for a small app/demo. For production, back it with Redis or a database
  table with a TTL.
- Never commit your `.env` file — it's already git-ignored.
