# The Board — Complete Local Setup Guide

This guide explains how to take a fresh clone of **The Board — Campus Lost & Found**, configure every required service, install dependencies, initialize MongoDB data, and run the complete application locally.

Follow the steps in order.

---

# 1. Prerequisites

Install the following before cloning the project.

## 1.1 Git

Install Git:

```text
https://git-scm.com/
```

Verify:

```bash
git --version
```

## 1.2 Node.js

Use **Node.js 22 or newer**.

Verify:

```bash
node --version
npm --version
```

You should see Node 22.x or newer.

If you use `nvm`, Node 22 is recommended:

```bash
nvm install 22
nvm use 22
```

## 1.3 MongoDB

You need MongoDB either:

- installed and running locally, or
- a MongoDB Atlas database.

For local MongoDB, the default connection used by this project is:

```text
mongodb://localhost:27017/lost-and-found
```

Verify that your MongoDB service is running before starting the backend.

---

# 2. Clone the repository

Clone the GitHub repository:

```bash
git clone https://github.com/amansatya/lost-and-found.git
```

Enter the project:

```bash
cd lost-and-found
```

Check the project:

```bash
git status
```

You should see the project files and no need to modify source code for basic setup.

---

# 3. Install frontend dependencies

From the project root:

```bash
npm install
```

This installs the React/Vite/Firebase frontend dependencies.

---

# 4. Install backend dependencies

Move into the server:

```bash
cd server
```

Install backend dependencies:

```bash
npm install
```

Return to the project root when needed:

```bash
cd ..
```

---

# 5. Configure the frontend environment

The frontend uses Vite environment variables.

Create:

```text
.env
```

from:

```text
.env.example
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Open `.env`.

You should have:

```env
VITE_API_URL=http://localhost:4000

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Do not put backend secrets in this file.

---

# 6. Create a Firebase project

Open the Firebase Console:

```text
https://console.firebase.google.com/
```

Create a new Firebase project or select an existing project.

Example project name:

```text
KIIT Lost and Found
```

Remember the Firebase Project ID because it must match the backend Firebase configuration.

Google Analytics is not required for this application.

---

# 7. Register the Firebase Web App

Inside the Firebase project:

```text
Project Overview
→ Add app
→ Web (</>)
```

Give the application a name, for example:

```text
The Board Web
```

Register the application.

Firebase will provide a web configuration similar to:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Copy those values into the root `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

The Firebase Web configuration is used by the browser.

It is not a replacement for the Firebase Admin credentials used by the backend.

---

# 8. Enable Google authentication

In Firebase Console:

```text
Authentication
→ Sign-in method
→ Google
```

Enable Google.

Select the appropriate project support email if requested.

Save the provider.

---

# 9. Configure Firebase authorized domains

Go to:

```text
Authentication
→ Settings
→ Authorized domains
```

For local development, make sure:

```text
localhost
```

is present.

Do not enter:

```text
http://localhost:5173
```

as the domain.

For production, add your real frontend domain, for example:

```text
yourdomain.com
```

---

# 10. Configure Firebase Admin SDK

The backend needs Firebase Admin credentials to verify Google ID tokens.

In Firebase Console:

```text
Project Settings
→ Service accounts
→ Firebase Admin SDK
→ Generate new private key
```

Download the JSON file.

Treat this file as a secret.

Do not:

- commit it to GitHub
- put it inside `src/`
- expose it to the browser
- put it in the frontend `.env`
- send it to other people

You only need values from it for `server/.env`.

---

# 11. Configure backend environment

Create:

```text
server/.env
```

from:

```text
server/.env.example
```

On Windows PowerShell:

```powershell
Copy-Item server\.env.example server\.env
```

On macOS/Linux:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and configure all values.

Example:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/lost-and-found

GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-character-google-app-password

OTP_HASH_SECRET=your-random-secret
AUTH_JWT_SECRET=your-different-random-secret
AUTH_JWT_EXPIRES_IN=7d

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

---

# 12. Configure MongoDB

## Option A — Local MongoDB

Use:

```env
MONGODB_URI=mongodb://localhost:27017/lost-and-found
```

Start MongoDB using the method appropriate for your operating system.

Then verify the MongoDB service is running.

## Option B — MongoDB Atlas

Create a MongoDB Atlas cluster and database user.

Add your development machine's IP address to the Atlas network access rules.

Copy the connection string.

Example:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/lost-and-found
```

Do not commit this connection string.

---

# 13. Configure Gmail for OTP email

The application sends registration OTPs through Gmail SMTP.

Use a Google account dedicated to development/application email if possible.

## Enable 2-Step Verification

The Gmail account must have Google 2-Step Verification enabled.

## Create an App Password

In the Google account security settings:

```text
Google Account
→ Security
→ 2-Step Verification
→ App passwords
```

Create an app password.

Use the generated app password as:

```env
GMAIL_APP_PASSWORD=...
```

Do not use your normal Gmail password.

The value belongs only in:

```text
server/.env
```

---

# 14. Generate the OTP and JWT secrets

Do not invent weak secrets such as:

```text
123456
password
secret
my-secret
```

Generate cryptographically random values.

Run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to:

```env
OTP_HASH_SECRET=...
```

Run the command again and use the second output for:

```env
AUTH_JWT_SECRET=...
```

The two secrets must be different.

---

# 15. Verify the Firebase Admin values

From the Firebase service-account JSON, use:

```text
project_id
client_email
private_key
```

Map them to:

```env
FIREBASE_PROJECT_ID=project_id
FIREBASE_CLIENT_EMAIL=client_email
FIREBASE_PRIVATE_KEY="private_key"
```

The Firebase project ID used by the backend must be the same Firebase project used by the frontend.

The private key must remain server-side.

---

# 16. Verify `.gitignore`

Before continuing, make sure the following are not committed:

```text
.env
server/.env
Firebase service-account JSON
node_modules/
```

Run:

```bash
git status
```

and check that your environment files do not appear as files to commit.

If you accidentally created a Firebase service-account JSON inside the repository, move it outside the repository or explicitly ignore it.

---

# 17. Start the backend

Open Terminal 1.

```bash
cd server
npm run dev
```

A successful startup should show messages indicating that the backend has started and that MongoDB/email services are configured.

The backend normally runs at:

```text
http://localhost:4000
```

---

# 18. Check the backend health endpoint

Open:

```text
http://localhost:4000/api/health
```

The endpoint should return a successful JSON response.

If the database status is not ready, stop here and fix MongoDB before continuing.

---

# 19. Initialize the six demo listings

This is only needed when setting up a fresh database.

Open another terminal:

```bash
cd server
npm run seed:items
```

The script inserts the initial six demo listings.

If the database already contains items, the script does not create duplicate seed data.

You can safely run the command again.

---

# 20. Start the frontend

Open Terminal 2 from the repository root:

```bash
npm run dev
```

Vite will print the local development URL.

Normally it is:

```text
http://localhost:5173
```

Open that URL in your browser.

---

# 21. First authentication test

Do not begin with Google.

First verify normal registration.

## Register

Use a real:

```text
yourname@kiit.ac.in
```

Enter:

```text
Full name
KIIT email
Password
```

Submit registration.

---

# 22. Verify the OTP

Check the KIIT email inbox.

Enter the 6-digit OTP.

The OTP:

- expires after 10 minutes
- allows at most 3 incorrect attempts
- can be resent at most 3 times
- is invalidated when a new OTP is sent

After successful verification, the user account is created and the user is authenticated.

---

# 23. Test session persistence

After registration:

1. Refresh the browser.
2. Confirm you remain logged in.
3. Open another page.
4. Confirm the profile information remains available.

The application restores authentication using:

```text
GET /api/auth/me
```

The JWT is stored in an HTTP-only cookie, not localStorage.

---

# 24. Test email/password login

Log out.

Then log back in using:

```text
KIIT email
+
password
```

The user should be authenticated again.

---

# 25. Test forgot password

From the login modal, click:

```text
Forgot password?
```

Enter an existing verified `@kiit.ac.in` email. A 6-digit password reset OTP is sent to that email.

The reset code:

- expires after 10 minutes
- allows at most 3 incorrect attempts
- supports up to 3 resends after the initial code
- invalidates the previous code when a new code is sent

Enter the OTP, choose a new password, confirm it, and click:

```text
Change password
```

After a successful reset, the application signs the user in automatically.

Then test that the new password works for normal email/password login.

# 25. Test Google login

Use the same KIIT account's Google identity.

Click:

```text
Continue with Google
```

Select the Google account whose email is the existing verified KIIT account.

Expected result:

```text
Firebase verifies Google
        ↓
Backend verifies Firebase token
        ↓
Email is @kiit.ac.in
        ↓
Existing verified MongoDB user found
        ↓
Application session created
```

---

# 26. Important Google login rules

Google login is intentionally not registration.

## Existing verified KIIT account

```text
Registered with:
KIIT email + password + OTP

Then Google login:
Allowed
```

## New KIIT Google account

```text
No existing application account
        ↓
Google login
        ↓
Rejected
```

The user must register first using email/password/OTP.

## Non-KIIT Google account

```text
example@gmail.com
        ↓
Google login
        ↓
Rejected
```

Only:

```text
@kiit.ac.in
```

is accepted.

---

# 27. Test Lost & Found data

Open Browse.

The six seeded notices should come from MongoDB.

The frontend should not depend on hardcoded runtime seed data or localStorage.

Try:

- Search
- Category filtering
- Lost/found filtering
- Newest sorting
- Oldest sorting
- Opening an item
- Creating a new item

---

# 28. Test creating a listing

Log in and open the posting flow.

Choose:

```text
Lost
```

or:

```text
Found
```

Enter the required information.

The date field must not allow future dates.

The backend also validates the date, so manually submitting a future date through an API request should still be rejected.

Submit the listing.

Confirm it appears in Browse.

---

# 29. Test closing a listing

Open a listing created by your account.

Click:

```text
Close this notice
```

A custom confirmation modal should appear.

Confirm the close.

The listing should disappear from the active Browse results.

The MongoDB document should remain and have:

```text
active: false
```

This is a soft delete.

---

# 30. Test the 30-active-item rule

The board is limited to 30 active notices.

When a new active notice would make the count exceed 30:

```text
oldest active notice
        ↓
active = false
```

The database record is retained.

This behavior is enforced by the backend.

---

# 31. Common problems

## `npm install` fails

Check:

```bash
node --version
npm --version
```

Use Node 22 or newer.

Then retry:

```bash
npm install
```

and:

```bash
cd server
npm install
```

## MongoDB connection error

Check:

```env
MONGODB_URI=...
```

and make sure MongoDB is running.

## Gmail authentication error

Check:

```env
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
```

The password must be a Google App Password.

## Firebase Google login error

Check:

- Google provider is enabled.
- `localhost` is an authorized domain.
- frontend Firebase values belong to the correct Firebase project.
- backend Firebase Admin values belong to the same Firebase project.
- Google account uses `@kiit.ac.in`.
- an application account already exists for that email.

## Frontend cannot reach backend

Check:

```env
VITE_API_URL=http://localhost:4000
```

and:

```env
FRONTEND_URL=http://localhost:5173
```

Make sure both servers are running.

## Authentication disappears after refresh

Check:

- backend is running
- `/api/auth/me` succeeds
- frontend requests use credentials
- `FRONTEND_URL` matches the actual frontend origin
- browser cookies are not being blocked

## Browse is empty after a fresh setup

Run:

```bash
cd server
npm run seed:items
```

Then refresh the browser.

---

# 32. Recommended development workflow

Use three terminals.

### Terminal 1 — MongoDB

Keep MongoDB running.

### Terminal 2 — Backend

```bash
cd server
npm run dev
```

### Terminal 3 — Frontend

```bash
npm run dev
```

Then use:

```text
http://localhost:5173
```

for the application.

---

# 33. Before pushing changes to GitHub

Run:

```bash
git status
```

Check that:

```text
.env
server/.env
node_modules
Firebase service-account files
```

are not being committed.

Then:

```bash
git add .
git commit -m "Update The Board"
git push
```

Never push application secrets.

---

# 34. Production notes

The local configuration is designed for development.

Before production deployment:

- Use HTTPS.
- Set the production frontend URL.
- Configure production Firebase authorized domains.
- Use production MongoDB credentials.
- Rotate development credentials if they were ever exposed.
- Keep all backend secrets server-side.
- Use a shared rate-limit store such as Redis when running multiple backend instances.
- Review CORS configuration.
- Review cookie `Secure` and `SameSite` behavior for the final deployment architecture.
- Verify MongoDB access controls and backups.

---

# 35. Final local setup checklist

```text
[ ] Git installed
[ ] Node.js 22+ installed
[ ] MongoDB running or Atlas configured
[ ] Repository cloned
[ ] npm install completed in root
[ ] npm install completed in server
[ ] Root .env created
[ ] server/.env created
[ ] Firebase project created
[ ] Firebase Web App registered
[ ] Firebase Web config copied to root .env
[ ] Google provider enabled
[ ] localhost authorized in Firebase
[ ] Firebase Admin service account created
[ ] Firebase Admin values added to server/.env
[ ] Gmail 2-Step Verification enabled
[ ] Gmail App Password created
[ ] Gmail values added to server/.env
[ ] OTP_HASH_SECRET generated
[ ] AUTH_JWT_SECRET generated separately
[ ] MongoDB connection verified
[ ] Backend starts successfully
[ ] /api/health works
[ ] Six demo items seeded
[ ] Frontend starts successfully
[ ] KIIT registration tested
[ ] OTP verification tested
[ ] Email/password login tested
[ ] Google login tested
[ ] Refresh/session persistence tested
[ ] Logout tested
[ ] Browse/search/filter/sorting tested
[ ] Create listing tested
[ ] Close listing tested
[ ] Soft delete verified
[ ] 30-active-item rule tested
[ ] No secrets appear in git status
```

Once all checklist items pass, the project should be runnable locally from a fresh clone with the required external services configured.
