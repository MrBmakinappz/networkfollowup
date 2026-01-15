# 🚀 DEPLOYMENT INSTRUCTIONS - Follow-Up Machine

## ⚠️ CRITICAL: Why Changes Don't Appear

If you see "nothing changed" on the website, it's because:

1. **Files haven't been deployed to Netlify yet**
2. **Netlify CDN caching** (even with cache-busting headers)
3. **Browser caching** (need hard refresh)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Step 1: Commit and Push Changes

```bash
# Check what files changed
git status

# Add all changes
git add .

# Commit
git commit -m "Fix Follow-Up Machine: Add send-bulk endpoint and standalone page"

# Push to your repository
git push origin main
```

### Step 2: Deploy to Netlify

**Option A: Auto-deploy (if connected to Git)**
- Netlify should auto-deploy when you push
- Check Netlify dashboard for deployment status
- Wait for "Published" status

**Option B: Manual Deploy**
1. Go to Netlify dashboard
2. Click "Deploys" tab
3. Click "Trigger deploy" → "Deploy site"
4. Wait for build to complete

### Step 3: Clear Netlify Cache

1. Go to Netlify dashboard
2. Site settings → Build & deploy
3. Click "Clear cache and deploy site"
4. Wait for rebuild

### Step 4: Hard Refresh Browser

**Windows/Linux:**
- `Ctrl + Shift + R` or `Ctrl + F5`

**Mac:**
- `Cmd + Shift + R`

**Or:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

## ✅ VERIFICATION

### Check Version in Console

1. Open website: https://networkfollowup.netlify.app/dashboard.html
2. Press F12 (open DevTools)
3. Go to Console tab
4. You should see:
   ```
   === DASHBOARD LOADED - VERSION 2024-12-19-FOLLOWUP-MACHINE-FIXED-v3 ===
   ```

If you see an older version, the cache hasn't cleared yet.

### Test Follow-Up Machine

1. **Login** to dashboard
2. **Click "Follow-Up Machine"** in sidebar
3. **Upload a screenshot** (if Gmail connected)
4. **Select customers**
5. **Click "Send Emails"**
6. **Check console** for any errors

---

## 🔧 TROUBLESHOOTING

### Problem: Still seeing old version

**Solution:**
1. Clear Netlify cache (Step 3 above)
2. Hard refresh browser (Step 4 above)
3. Check Netlify deployment logs for errors

### Problem: Follow-Up Machine not working

**Check:**
1. Open browser console (F12)
2. Look for errors (red text)
3. Check Network tab for failed API calls
4. Verify Gmail is connected

### Problem: "Section not found" error

**Solution:**
- Hard refresh (Ctrl+Shift+R)
- Check console for section IDs
- Verify all sections exist in HTML

---

## 📁 FILES TO DEPLOY

Make sure these files are committed and pushed:

- ✅ `frontend/dashboard.html` (updated with send-bulk)
- ✅ `frontend/followup.html` (new standalone page)
- ✅ `backend/routes/emails.js` (added send-bulk endpoint)
- ✅ `backend/server.js` (routes already registered)

---

## 🎯 QUICK TEST

After deployment, test this URL directly:
```
https://networkfollowup.netlify.app/followup.html
```

This is the standalone Follow-Up Machine page we created.

---

## 📞 IF STILL NOT WORKING

1. **Check Netlify build logs** for errors
2. **Check browser console** (F12) for JavaScript errors
3. **Check Network tab** for failed API requests
4. **Verify backend is deployed** to Vercel
5. **Test API directly**: `https://networkfollowup-backend.vercel.app/api/health`

---

## ✅ SUCCESS INDICATORS

- ✅ Console shows version v3
- ✅ Follow-Up Machine section loads
- ✅ Upload button works
- ✅ Customers extracted after upload
- ✅ Send emails button works
- ✅ No errors in console

