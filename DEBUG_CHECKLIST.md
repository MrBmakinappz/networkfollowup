# 🔍 COMPLETE DEBUG CHECKLIST

## ✅ Step 1: Verify Backend Deployment

### Test Backend Health
```bash
curl https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/health
```
**Expected:** `{"status":"OK","timestamp":"...","uptime":...,"environment":"production"}`

### Test API Root
```bash
curl https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/api
```
**Expected:** API info JSON

---

## ✅ Step 2: Verify OAuth Route

### Test OAuth Route Directly
Visit in browser:
```
https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/api/oauth/google
```
**Expected:** Redirect to Google OAuth consent page
**If 404:** Route not deployed correctly

### Check Vercel Logs
1. Go to Vercel Dashboard
2. Click your project
3. Click "Deployments" → Latest deployment
4. Click "Functions" tab
5. Look for errors related to `/api/oauth/google`

---

## ✅ Step 3: Verify Environment Variables

### In Vercel Dashboard → Settings → Environment Variables

**REQUIRED Variables:**
```
✅ GOOGLE_CLIENT_ID=44537799358-7kirdsb998jdc6r2h1btgn9v2p3tc4sl.apps.googleusercontent.com
✅ GOOGLE_CLIENT_SECRET=(your secret)
✅ GOOGLE_REDIRECT_URI=https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/api/oauth/google/callback
✅ DATABASE_URL=(your Supabase connection string)
✅ JWT_SECRET=(your secret)
✅ ANTHROPIC_API_KEY=(your Claude API key)
✅ NODE_ENV=production
```

**If ANY are missing:** Add them and redeploy

---

## ✅ Step 4: Verify Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", verify:
   ```
   https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/api/oauth/google/callback
   ```
4. If missing, ADD IT and save

---

## ✅ Step 5: Test Email/Password Login

1. Go to: https://networkfollowup.netlify.app/login.html
2. Enter email and password
3. Should redirect to dashboard
4. **Status:** ✅ Working (you confirmed this)

---

## ✅ Step 6: Test Google OAuth

1. Go to: https://networkfollowup.netlify.app/login.html
2. Click "Sign in with Google"
3. **Expected Flow:**
   - Redirects to backend OAuth endpoint
   - Backend redirects to Google consent page
   - User approves
   - Google redirects to callback
   - Backend creates/login user
   - Redirects to dashboard
4. **If fails at step 1:** OAuth route 404 (deployment issue)
5. **If fails at step 2:** Environment variables missing
6. **If fails at step 4:** Google Cloud Console redirect URI wrong

---

## ✅ Step 7: Test OCR/Screenshot Upload

1. Login to dashboard
2. Go to "Follow-Up Machine" section
3. Upload a screenshot
4. **Expected:** AI extracts customer data
5. **If fails:** Check ANTHROPIC_API_KEY in Vercel

---

## ✅ Step 8: Test Gmail Connection in Settings

1. Go to Settings section
2. Click "Connect Gmail"
3. **Expected:** Same OAuth flow as login
4. **If fails:** Same issues as OAuth login

---

## 🐛 Common Issues & Solutions

### Issue 1: OAuth Route 404
**Solution:**
1. Push code to GitHub
2. Redeploy on Vercel
3. Check deployment logs for errors

### Issue 2: OAuth Redirects to Vercel Login
**Solution:**
- Disable Deployment Protection in Vercel Settings

### Issue 3: Google OAuth "redirect_uri_mismatch"
**Solution:**
- Add redirect URI to Google Cloud Console (see Step 4)

### Issue 4: OCR Not Working
**Solution:**
- Check ANTHROPIC_API_KEY is set in Vercel
- Check Vercel logs for API errors

---

## 📝 After Debugging

Once you've checked all items, let me know:
1. Which tests passed ✅
2. Which tests failed ❌
3. Any error messages you see
4. Vercel log errors (if any)

Then I'll fix the specific issues!




