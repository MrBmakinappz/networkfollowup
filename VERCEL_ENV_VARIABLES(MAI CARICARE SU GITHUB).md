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
your_anthropic_api_key_here
```
**Get from:** https://console.anthropic.com/ → API Keys → Create Key

---

### GOOGLE_CLIENT_ID
```
44537799358-7kirdsb998jdc6r2h1btgn9v2p3tc4sl.apps.googleusercontent.com
```

---

### GOOGLE_CLIENT_SECRET
```
your_google_client_secret_here
```
**Get from:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID

---

### GOOGLE_REDIRECT_URI
```
https://networkfollowup-backend.vercel.app/api/emails/gmail-callback
```

---

### STRIPE_SECRET_KEY
```
your_stripe_secret_key_here
```
**Get from:** Stripe Dashboard → Developers → API Keys → Secret key

---

### STRIPE_PUBLISHABLE_KEY
```
your_stripe_publishable_key_here
```
**Get from:** Stripe Dashboard → Developers → API Keys → Publishable key

---

### STRIPE_STARTER_PRICE_ID
```
your_stripe_starter_price_id_here
```
**Get from:** Stripe Dashboard → Products → Starter Plan → Pricing → Price ID

---

### STRIPE_PRO_PRICE_ID
```
your_stripe_pro_price_id_here
```
**Get from:** Stripe Dashboard → Products → Pro Plan → Pricing → Price ID

---

### STRIPE_ENTERPRISE_PRICE_ID
```
your_stripe_enterprise_price_id_here
```
**Get from:** Stripe Dashboard → Products → Enterprise Plan → Pricing → Price ID

---

### STRIPE_WEBHOOK_SECRET
```
your_stripe_webhook_secret_here
```
**Get from:** Stripe Dashboard → Developers → Webhooks → Endpoint → Signing secret

---

### ADMIN_EMAIL
```
alessandrobrozzi1@gmail.com
```

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
- [ ] ANTHROPIC_API_KEY is set (starts with `sk-ant-`)
- [ ] GOOGLE_CLIENT_ID is set (ends with `.apps.googleusercontent.com`)
- [ ] GOOGLE_CLIENT_SECRET is set (starts with `GOCSPX-`)
- [ ] STRIPE_SECRET_KEY is set (starts with `sk_test_` or `sk_live_`)
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

**Store these in a secure location:**
- Password manager (1Password, LastPass)
- Encrypted notes
- Never in public repos
- Never in frontend code

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
