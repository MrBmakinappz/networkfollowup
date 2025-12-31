# 🔐 Google Cloud Console - OAuth Redirect URI Setup

## 📋 Step-by-Step Instructions

### Step 1: Access Google Cloud Console
1. Go to: **https://console.cloud.google.com/**
2. Sign in with your Google account
3. Select the project that contains your OAuth credentials
   - If you don't see a project, create one or select the correct one

### Step 2: Navigate to OAuth Consent Screen
1. In the left sidebar, click **"APIs & Services"**
2. Click **"OAuth consent screen"**
3. Make sure your app is configured (if not, complete the setup first)

### Step 3: Navigate to Credentials
1. In the left sidebar, click **"Credentials"** (under APIs & Services)
2. You should see your OAuth 2.0 Client ID listed
3. Click on the **OAuth 2.0 Client ID** that matches:
   - **Client ID:** `44537799358-7kirdsb998jdc6r2h1btgn9v2p3tc4sl.apps.googleusercontent.com`

### Step 4: Add Authorized Redirect URIs
1. In the **"Authorized redirect URIs"** section, click **"+ ADD URI"**
2. Add the following URI exactly as shown:
   ```
   http://localhost:5000/api/oauth/google/callback
   ```
3. Click **"SAVE"** at the bottom of the page

### Step 5: Verify All Redirect URIs
Make sure you have **ALL** of these redirect URIs added:

**For Local Development:**
- `http://localhost:5000/api/oauth/google/callback`

**For Production (if using Vercel):**
- `https://networkfollowup-backend.vercel.app/api/oauth/google/callback`

**For Testing (if needed):**
- `http://127.0.0.1:5000/api/oauth/google/callback`

### Step 6: Update Your .env File
Make sure your `backend/.env` file contains:

```env
GOOGLE_CLIENT_ID=44537799358-7kirdsb998jdc6r2h1btgn9v2p3tc4sl.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/google/callback
```

### Step 7: Restart Your Backend Server
After updating the redirect URI:
1. Stop your backend server (Ctrl+C)
2. Restart it:
   ```bash
   cd backend
   npm start
   ```

### Step 8: Test the OAuth Flow
1. Open your frontend: `http://localhost:3000/login.html`
2. Click **"Sign in with Google"**
3. Complete the Google OAuth flow
4. You should be redirected back to your app successfully

---

## ⚠️ Important Notes

### Redirect URI Format
- **MUST** match exactly (case-sensitive, no trailing slashes)
- **MUST** include the full path: `/api/oauth/google/callback`
- **MUST** use `http://` for localhost (not `https://`)

### Common Mistakes to Avoid
❌ `http://localhost:5000/api/oauth/google/callback/` (trailing slash)
❌ `http://localhost:5000/oauth/google/callback` (missing `/api`)
❌ `https://localhost:5000/api/oauth/google/callback` (https instead of http)
❌ `http://127.0.0.1:5000/api/oauth/google/callback` (different hostname - add separately if needed)

✅ `http://localhost:5000/api/oauth/google/callback` (correct)

### If You Still Get Errors
1. **Clear browser cache** - OAuth redirects are cached
2. **Wait 5-10 minutes** - Google Cloud Console changes can take time to propagate
3. **Check the exact error message** - Google will tell you which URI it's expecting
4. **Verify the redirect URI in your code** matches exactly what's in Google Cloud Console

---

## 🔍 Quick Verification Checklist

- [ ] Redirect URI added in Google Cloud Console
- [ ] `.env` file updated with correct `GOOGLE_REDIRECT_URI`
- [ ] Backend server restarted
- [ ] No typos in the redirect URI (check both places)
- [ ] Using `http://` not `https://` for localhost
- [ ] Full path includes `/api/oauth/google/callback`

---

## 📸 Visual Guide

### Where to Find Credentials:
```
Google Cloud Console
└── APIs & Services
    ├── OAuth consent screen
    └── Credentials
        └── OAuth 2.0 Client IDs
            └── [Your Client ID]
                └── Authorized redirect URIs
                    └── [Add URI button here]
```

---

## 🆘 Still Having Issues?

If you're still getting redirect URI errors:

1. **Check the exact error message** from Google - it will show what URI it received
2. **Compare character-by-character** with what's in Google Cloud Console
3. **Try incognito/private browsing** to avoid cache issues
4. **Check browser console** for any additional error details

The error message from Google will look like:
```
Error 400: redirect_uri_mismatch
The redirect URI in the request: http://localhost:5000/api/oauth/google/callback 
does not match the ones authorized for the OAuth client.
```

This tells you exactly what URI Google received, so you can verify it matches what you added.

