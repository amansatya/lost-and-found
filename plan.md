# KIIT Auth E2E Plan

## Goal
Replace the current auth with a KIIT-only flow:
- first-time signup with `@kiit.ac.in` email + password
- OTP verification sent to KIIT mail
- OTP valid for 10 minutes
- max 3 OTP resends
- later login with email + password
- later login with Google sign-in, only for `@kiit.ac.in`

## Recommended architecture
- **Backend**: signup OTP, OTP verification, password auth, KIIT-domain enforcement
- **Firebase Auth**: Google sign-in
- **DB**: user profile and auth linkage by email

## End-to-end flow
1. User chooses **Sign Up**.
2. User enters name, `@kiit.ac.in` email, and password.
3. Frontend sends signup request to backend.
4. Backend validates KIIT email and password rules.
5. Backend checks email is not already registered.
6. Backend generates a 6-digit OTP.
7. Backend stores a pending signup record with hashed OTP and expiry = now + 10 minutes.
8. Backend sends OTP to the KIIT mailbox.
9. Frontend switches to OTP entry UI.
10. User enters OTP.
11. Backend verifies OTP against the pending record.
12. If valid, backend creates the user and marks them verified.
13. Later, user can log in with:
    - email + password
    - Google sign-in, if the Google account email is also `@kiit.ac.in`

## File-by-file plan

### Frontend

#### `src/components/LoginModal.jsx`
- add KIIT-only copy
- keep signup fields for name, email, password
- add a Google sign-in button in login mode
- show OTP step after signup starts
- show resend count / limit messaging

#### `src/hooks/useAuth.js`
- `startSignup()` -> backend signup-start endpoint
- `verifyOtp()` -> backend verify endpoint
- `login()` -> email/password endpoint
- `loginWithGoogle()` -> Firebase Auth Google sign-in
- client-side KIIT email validation
- persist user in localStorage

#### `src/hooks/AuthContext.jsx`
- expose `loginWithGoogle`
- expose pending signup state and OTP error state

#### `src/main.jsx`
- wrap app with any Firebase init/provider wiring if needed

#### New file: `src/lib/firebase.js` or `src/firebase.js`
- initialize Firebase app
- export auth
- export Google provider

#### Optional new file: `src/utils/validation.js`
- `isKiitEmail(email)`
- password helpers

### Backend

#### `server/index.js`
- refactor auth routes
- add KIIT-only validation
- enforce 10-minute OTP expiry
- enforce max 3 resends
- invalidate old OTP on resend

#### `server/models/User.js`
- store email, name, password hash, verified state, auth provider linkage

#### New file: `server/models/OtpChallenge.js`
- store pending OTP state if you want persistence instead of in-memory storage

#### New file: `server/utils/email.js`
- isolate Gmail/nodemailer OTP sending

#### New file: `server/utils/auth.js`
- shared helpers like email normalization, OTP generation, KIIT-domain check

### Env files

#### Root `.env`
- Firebase frontend config

#### `server/.env`
- Gmail config
- frontend URL
- OTP TTL / resend limits if desired

#### `server/.env.example`
- document backend settings

#### New root `.env.example`
- document Firebase settings

## Detailed backend steps
1. Add KIIT email validator.
2. Add OTP record storage.
3. Hash and store OTP.
4. Set OTP expiry to 10 minutes.
5. Track resend count.
6. Block resends after 3.
7. Invalidate old OTP on each resend.
8. Create the user only after OTP verification succeeds.
9. Allow login only for verified accounts.
10. Accept Google sign-in only for KIIT emails.

## Detailed frontend steps
1. Add Firebase dependency.
2. Create Firebase init module.
3. Add Google sign-in button.
4. Update signup/login copy to KIIT-only.
5. Add OTP step and resend limit UI.
6. Wire auth actions through context.
7. Keep localStorage session behavior.

## Testing checklist
1. Non-KIIT signup is rejected.
2. KIIT signup sends OTP.
3. OTP expires after 10 minutes.
4. OTP resend works up to 3 times.
5. Old OTP stops working after resend.
6. Correct OTP creates verified account.
7. Email/password login works afterward.
8. Google login works only with KIIT email.

## Recommended order
1. Decide OTP storage: persistent vs in-memory.
2. Implement backend KIIT/OTP logic.
3. Add Firebase Google sign-in.
4. Update modal UI.
5. Wire auth context/hooks.
6. Add env docs.
7. Test end to end.
