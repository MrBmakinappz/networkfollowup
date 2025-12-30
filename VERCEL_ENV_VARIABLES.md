# VERCEL ENVIRONMENT VARIABLES - QUICK REFERENCE

## 🔥 COPY-PASTE READY FOR VERCEL DASHBOARD

Go to: https://vercel.com/dashboard → networkfollowup-backend → Settings → Environment Variables

---

## 📋 ADD THESE ONE BY ONE:

### DATABASE_URL
```
<paste-your-supabase-session-pooler-connection-string>
```
**Get from:** Supabase → Project Settings → Database → Session mode  
**Example:** `postgresql://postgres.abc123:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

---

### JWT_SECRET
```
<generate-with-command-below>
```
**Generate with:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
**Or use online:** https://generate-secret.vercel.app/64

---

### FRONTEND_URL
```
https://networkfollowup.netlify.app
```

---

### ANTHROPIC_API_KEY
```
<your-claude-api-key>
```
**Get from:** https://console.anthropic.com/

---

### GOOGLE_CLIENT_ID
```
<your-google-client-id>
```
**Get from:** https://console.cloud.google.com/apis/credentials

---

### GOOGLE_CLIENT_SECRET
```
<your-google-client-secret>
```
**Get from:** https://console.cloud.google.com/apis/credentials

---

### GOOGLE_REDIRECT_URI
```
https://networkfollowup-backend.vercel.app/api/emails/gmail-callback
```

---

### STRIPE_SECRET_KEY
```
<your-stripe-secret-key>
```
**Get from:** https://dashboard.stripe.com/test/apikeys

---

### STRIPE_PUBLISHABLE_KEY
```
<your-stripe-publishable-key>
```
**Get from:** https://dashboard.stripe.com/test/apikeys

---

### STRIPE_STARTER_PRICE_ID
```
<your-starter-price-id>
```
**Get from:** Stripe Products → Starter plan

---

### STRIPE_PRO_PRICE_ID
```
<your-pro-price-id>
```
**Get from:** Stripe Products → Professional plan

---

### STRIPE_ENTERPRISE_PRICE_ID
```
<your-enterprise-price-id>
```
**Get from:** Stripe Products → Enterprise plan

---

### STRIPE_WEBHOOK_SECRET
```
<your-webhook-signing-secret>
```
**Get from:** Stripe Webhooks → Your endpoint

---

### ADMIN_EMAIL
```
<your-admin-email>
```
**Example:** your-email@gmail.com

---

### NODE_ENV
```
production
```

---

## ✅ VERIFICATION CHECKLIST

After adding all variables:

- [ ] 15 environment variables total
- [ ] DATABASE_URL starts with `postgresql://`
- [ ] JWT_SECRET is 64+ characters
- [ ] ANTHROPIC_API_KEY starts with `sk-ant-`
- [ ] GOOGLE_CLIENT_ID ends with `.apps.googleusercontent.com`
- [ ] GOOGLE_CLIENT_SECRET starts with `GOCSPX-`
- [ ] STRIPE_SECRET_KEY starts with `sk_test_`
- [ ] All STRIPE_*_PRICE_ID start with `price_`
- [ ] STRIPE_WEBHOOK_SECRET starts with `whsec_`
- [ ] ADMIN_EMAIL is your email
- [ ] NODE_ENV is `production`

---

## 🔄 AFTER ADDING ALL VARIABLES

**REDEPLOY YOUR BACKEND:**

1. Go to: https://vercel.com/dashboard → networkfollowup-backend → Deployments
2. Click latest deployment → "⋯" menu → **Redeploy**
3. Wait 30-60 seconds
4. Test: https://networkfollowup-backend.vercel.app/health

Should return: `{"status":"OK","timestamp":"..."}`

---

## 🚨 IMPORTANT NOTES

### **Supabase Connection String**
- Use **Session mode** (port 6543) NOT Transaction mode
- Get from: Project Settings → Database → Connection String → Session

### **JWT Secret**
- NEVER commit to GitHub
- Generate new one for production
- Keep it secret!

### **Stripe Keys**
- Currently using TEST mode keys
- Switch to LIVE keys when ready for production
- Update webhook endpoint to production URL

### **Google OAuth**
- Redirect URIs must match exactly
- Already configured for production URL
- Test in development with localhost URLs added

---

## 📝 SAVE THIS INFO

**Store your actual API keys in a secure location:**
- Password manager (1Password, LastPass, Bitwarden)
- Encrypted notes app
- Never in public repos
- Never in frontend code

**Keep a private copy of this file with your actual values filled in!**

---

## 🎯 WHERE TO FIND YOUR ACTUAL VALUES

You have your actual API keys in the `.env.production` file that was provided separately.

**NEVER upload `.env.production` to GitHub!**

Use it only as a reference when adding environment variables to Vercel.

---

## 🎯 NEXT STEPS

After environment variables are set:

1. ✅ Run database migrations (schema.sql)
2. ✅ Load default templates (email_templates_default.sql)
3. ✅ Load country mappings (country_mappings.sql)
4. ✅ Test health endpoint
5. ✅ Test signup
6. ✅ Test OCR extraction
7. ✅ Test Stripe checkout
8. ✅ Launch! 🚀
