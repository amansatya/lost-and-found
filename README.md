# The Board — Campus Lost & Found

The Board is a campus lost-and-found web application built for KIIT. Students can publish lost or found-item notices, browse active notices, search and filter listings, and contact the person who posted a notice.

The application uses a React + Vite frontend, an Express/Node.js backend, MongoDB for persistent data, Gmail for registration OTPs, and Firebase Authentication for Google identity verification.

## Features

### Authentication

- KIIT-only registration using an `@kiit.ac.in` email address.
- Registration requires:
  - Full name
  - KIIT email
  - Password
- A 6-digit OTP is sent to the registration email.
- OTP validity: 10 minutes.
- Maximum incorrect OTP attempts: 3.
- Maximum OTP resends: 3.
- Resending an OTP invalidates the previous OTP and starts a new 10-minute validity period.
- Subsequent login using KIIT email + password.
- Google login through Firebase, restricted to existing verified KIIT accounts.
- Google login does not create new accounts.
- Authentication uses an HTTP-only JWT cookie.
- Authentication state is restored through `/api/auth/me` after a page refresh.
- Authentication endpoints have IP-based rate limiting.

### Lost & Found board

- Lost and found notices are stored in MongoDB.
- Browse displays active database records rather than hardcoded frontend data.
- Search by title, category, location, and description.
- Filter by notice type and category.
- Sort by newest or oldest.
- Listing details are loaded from MongoDB.
- A listing owner can close their own notice.
- Closing a notice is a soft delete:
  - `active` becomes `false`
  - the database record is retained
  - closed metadata is retained
- The board keeps a maximum of 30 active notices.
- When a new notice would create more than 30 active notices, the oldest active notice is automatically soft-closed.
- Initial demo listings can be inserted with a one-time seed script.

### User experience

- Responsive navigation and profile menu.
- Profile avatar uses the first letter of the user's name.
- Profile menu shows the user's name and email.
- Custom confirmation modal for closing notices.
- Modal content scrolls when it exceeds the viewport height.
- Custom application scrollbar.
- Future dates cannot be selected for lost/found notices.
- Scenario-specific validation and error messages.
- Responsive lost/found posting and browse interfaces.

---

# Technology stack

## Frontend

- React
- Vite
- Firebase Web SDK
- CSS

## Backend

- Node.js
- Express
- MongoDB
- Mongoose
- bcrypt
- JSON Web Tokens
- Nodemailer
- Firebase Admin SDK

## Services

- MongoDB — application data and authentication records
- Gmail SMTP — registration OTP email delivery
- Firebase Authentication — Google identity verification

---

# Project structure

```text
.
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   └── firebase.js
│   ├── pages/
│   ├── services/
│   │   └── authApi.js
│   └── utils/
│       └── validation.js
│
├── server/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   └── utils/
│
├── .env.example
├── server/.env.example
├── README.md
└── SETUP.md
```

---

# Quick start

For a complete setup from a fresh clone, read [`SETUP.md`](SETUP.md).

The short version is:

```bash
git clone https://github.com/amansatya/lost-and-found.git
cd lost-and-found

npm install

cd server
npm install
```

Configure:

```text
.env
server/.env
```

Then run the backend and frontend in separate terminals.

### Backend

```bash
cd server
npm run dev
```

### Frontend

From the project root:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

---

# Environment variables

There are two environment files.

## Frontend: `.env`

Create it from:

```text
.env.example
```

Example:

```env
VITE_API_URL=http://localhost:4000

VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Only Firebase Web configuration belongs here.

## Backend: `server/.env`

Create it from:

```text
server/.env.example
```

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

Never commit either `.env` file.

Never put these backend secrets in the frontend environment:

```text
GMAIL_APP_PASSWORD
OTP_HASH_SECRET
AUTH_JWT_SECRET
FIREBASE_PRIVATE_KEY
```

---

# Generating application secrets

From the `server` directory, or anywhere with Node.js available:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate separate values for:

```text
OTP_HASH_SECRET
AUTH_JWT_SECRET
```

Do not reuse the same value for both.

---

# Firebase

Google login requires a Firebase project.

The setup consists of two separate configurations.

## Frontend Firebase configuration

Register a Web App in Firebase and copy its Web configuration into the root `.env` as the `VITE_FIREBASE_*` variables.

## Backend Firebase Admin configuration

Create a Firebase service account and configure:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

in `server/.env`.

The Firebase Admin private key must remain server-side.

Enable:

```text
Firebase Console
→ Authentication
→ Sign-in method
→ Google
```

For local development, make sure `localhost` is an authorized Firebase Authentication domain.

For production, add the actual frontend domain.

---

# Gmail OTP configuration

Registration OTPs are sent through Gmail SMTP.

Use a Google account with 2-Step Verification enabled and create a Google App Password.

Use the App Password as:

```env
GMAIL_APP_PASSWORD=...
```

Do not use the normal Gmail account password.

---

# MongoDB

The default local connection is:

```text
mongodb://localhost:27017/lost-and-found
```

Make sure MongoDB is running before starting the backend.

Alternatively, use a MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://...
```

The database name can remain:

```text
lost-and-found
```

---

# Initial demo data

The repository contains a seed script for the original demo listings.

Run it once after MongoDB is configured:

```bash
cd server
npm run seed:items
```

The script is safe to run repeatedly. If item records already exist, it does not insert duplicate seed data.

The seed data is only initialization data. Runtime Browse data comes from MongoDB.

---

# Authentication API

```text
POST /api/auth/signup
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/me
POST /api/auth/logout
```

The authentication cookie is HTTP-only and is never stored in `localStorage`.

---

# Item API

```text
GET  /api/items
GET  /api/items/:id
POST /api/items
POST /api/items/:id/close
```

Authenticated operations use the HTTP-only authentication cookie.

---

# Item lifecycle

A listing is active while:

```text
active: true
```

When the owner closes it:

```text
active: false
closedAt: <timestamp>
closedBy: <user>
```

The MongoDB record is not physically deleted.

Browse only returns active records.

The backend also enforces the maximum of 30 active notices. If a 31st active notice is created, the oldest active notice is soft-closed.

---

# Authentication security model

```text
Registration
    ↓
KIIT email + name + password
    ↓
Generate secure OTP
    ↓
Store only OTP hash in MongoDB
    ↓
Send OTP through Gmail
    ↓
Verify OTP
    ↓
Create verified User
    ↓
HTTP-only JWT cookie
```

Subsequent email login:

```text
KIIT email + password
    ↓
bcrypt password verification
    ↓
HTTP-only JWT cookie
```

Google login:

```text
Google
    ↓
Firebase Authentication
    ↓
Firebase ID token
    ↓
Backend Firebase Admin verification
    ↓
Require @kiit.ac.in
    ↓
Require existing verified account
    ↓
Create application session
```

Google is a login mechanism only. It does not create a new account.

---

# Rate limiting

Authentication endpoints use an in-process IP-based rate limiter.

This is separate from:

- the three incorrect OTP attempts
- the three OTP resend limit
- the resend cooldown

For a multi-instance production deployment, move rate-limit state to a shared store such as Redis so every backend instance enforces the same limits.

---

# Development commands

## Frontend

From the repository root:

```bash
npm install
npm run dev
```

## Backend

```bash
cd server
npm install
npm run dev
```

## Seed demo items

```bash
cd server
npm run seed:items
```

## Production frontend build

From the repository root:

```bash
npm run build
```

Preview the production frontend build with the script provided by the project's `package.json`.

---

# Troubleshooting

## Backend cannot connect to MongoDB

Check:

```text
MONGODB_URI
```

and confirm that MongoDB is running.

For local MongoDB, the default is:

```text
mongodb://localhost:27017/lost-and-found
```

## OTP email is not sent

Check:

```text
GMAIL_USER
GMAIL_APP_PASSWORD
```

Use a Google App Password, not the normal Gmail password.

## Google login fails

Check:

- Google provider is enabled in Firebase Authentication.
- `localhost` is an authorized domain during development.
- Frontend `VITE_FIREBASE_*` values belong to the same Firebase project.
- Backend Firebase Admin values belong to the same Firebase project.
- The Google account uses an `@kiit.ac.in` email.
- The corresponding verified KIIT account already exists.

## Authentication disappears after refresh

Check that:

```text
FRONTEND_URL
VITE_API_URL
```

match the actual frontend/backend addresses and that requests are sent with credentials.

## Browse has no items

Run:

```bash
cd server
npm run seed:items
```

and confirm that MongoDB contains active item records.

---

# Security checklist before deployment

- [ ] Rotate any credentials that may have been exposed during development.
- [ ] Do not commit `.env` files.
- [ ] Do not commit Firebase service-account JSON files.
- [ ] Use strong, unique `OTP_HASH_SECRET` and `AUTH_JWT_SECRET` values.
- [ ] Use HTTPS in production.
- [ ] Set production `FRONTEND_URL` correctly.
- [ ] Configure Firebase production authorized domains.
- [ ] Keep Firebase Admin credentials server-side.
- [ ] Keep Gmail credentials server-side.
- [ ] Use a shared rate-limit store for multiple backend instances.
- [ ] Verify MongoDB production access controls and credentials.

---

# Project status

The current implementation includes:

- KIIT-only authentication
- Email/password registration and login
- OTP verification
- Firebase Google login
- HTTP-only session authentication
- MongoDB-backed Lost & Found listings
- Search, filtering, and sorting
- Soft deletion/closing of listings
- Maximum 30 active listings
- Responsive UI and improved modal behavior
- Production-oriented security boundaries

For the detailed local setup procedure, see [`SETUP.md`](SETUP.md).
