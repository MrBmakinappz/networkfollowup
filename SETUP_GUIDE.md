# NetworkFollowUp - Complete Setup Guide

## 🚀 DEPLOYMENT CHECKLIST

### ✅ **PHASE 1: Database Setup (Supabase)**

1. **Run Database Schema**
   - Go to: https://supabase.com/dashboard
   - Select your `networkfollowup` project
   - SQL Editor → New query
   - Copy entire `backend/database/schema.sql`
   - Run
   - Verify 10 tables created

2. **Load Default Templates**
   - SQL Editor → New query
   - Copy `backend/database/email_templates_default.sql`
   - Run
   - Verify 27 templates inserted (3 types x 9 languages)

3. **Load Country Mappings**
   - SQL Editor → New query
   - Copy `backend/database/country_mappings.sql`
   - Run
   - Verify country codes inserted

---

### ✅ **PHASE 2: Vercel Backend Setup**

1. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Complete backend with all integrations"
   git push origin main
   ```

2. **Set Environment Variables**
   
   Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
   
   **IMPORTANT:** Use the values from your **VERCEL_ENV_VARIABLES.md** file (in your local copy, NOT on GitHub!)
   
   Add ALL of these (replace with your actual values):
   
   ```
   DATABASE_URL=<your-supabase-session-pooler-url>
   JWT_SECRET=<generate-random-64-char-string>
   FRONTEND_URL=https://networkfollowup.netlify.app
   
   ANTHROPIC_API_KEY=<your-claude-api-key>
   
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   GOOGLE_REDIRECT_URI=https://networkfollowup-backend.vercel.app/api/emails/gmail-callback
   
   STRIPE_SECRET_KEY=<your-stripe-secret-key>
   STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
   STRIPE_STARTER_PRICE_ID=<your-starter-price-id>
   STRIPE_PRO_PRICE_ID=<your-pro-price-id>
   STRIPE_ENTERPRISE_PRICE_ID=<your-enterprise-price-id>
   STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
   
   ADMIN_EMAIL=<your-admin-email>
   NODE_ENV=production
   ```

3. **Generate JWT_SECRET**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy output and use as JWT_SECRET

4. **Redeploy**
   - Vercel auto-deploys on push
   - Or click "Redeploy" in dashboard

---

### ✅ **PHASE 3: Netlify Frontend Setup**

1. **Push Frontend**
   ```bash
   git add frontend/
   git commit -m "Updated frontend with Stripe integration"
   git push origin main
   ```

2. **Netlify Auto-Deploys**
   - Check: https://app.netlify.com/
   - Verify deployment successful

3. **Update Frontend API URL (if needed)**
   - In `dashboard.html` and `admin.html`, verify:
   ```javascript
   const API_URL = 'https://networkfollowup-backend.vercel.app/api';
   ```

---

### ✅ **PHASE 4: Testing**

#### **Test 1: Health Check**
```
https://networkfollowup-backend.vercel.app/health
```
Should return: `{"status":"OK"}`

#### **Test 2: Signup**
- Go to: https://networkfollowup.netlify.app
- Click "Start Free Trial"
- Signup with email
- Verify redirect to dashboard

#### **Test 3: Google Login**
- Click "Login with Google"
- Verify OAuth flow
- Check dashboard access

#### **Test 4: Screenshot Upload (OCR)**
- Dashboard → Follow-Up Machine
- Upload screenshot
- Verify customers extracted
- Check Claude API usage

#### **Test 5: Gmail Connection**
- Dashboard → Settings → Connect Gmail
- Complete OAuth
- Verify connection status

#### **Test 6: Stripe Checkout**
- Dashboard → Billing
- Click "Select Pro"
- Complete test checkout: `4242 4242 4242 4242`
- Verify subscription activated

#### **Test 7: Admin Dashboard**
- Login with your admin email
- Go to: https://networkfollowup.netlify.app/admin.html
- Verify admin stats load

---

### ✅ **PHASE 5: Production Checklist**

- [ ] All environment variables set
- [ ] Database schema loaded
- [ ] Templates loaded
- [ ] Country mappings loaded
- [ ] Google OAuth configured
- [ ] Stripe products created
- [ ] Stripe webhook configured
- [ ] Claude API key working
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Signup working
- [ ] Login working
- [ ] OCR extraction working
- [ ] Email sending working
- [ ] Stripe checkout working
- [ ] Admin dashboard accessible

---

## 🔧 **TROUBLESHOOTING**

### **Error: "Database connection failed"**
- Check DATABASE_URL in Vercel
- Verify Supabase Session Pooler URL (port 6543)
- Check Supabase project is not paused

### **Error: "Invalid token"**
- Regenerate JWT_SECRET
- Update in Vercel env
- Redeploy

### **Error: "Claude API rate limit"**
- Check Anthropic dashboard usage
- Upgrade plan if needed
- Check API key is valid

### **Error: "Stripe webhook failed"**
- Verify webhook secret in Vercel
- Check webhook URL in Stripe dashboard
- Test webhook with Stripe CLI

### **Error: "Gmail OAuth failed"**
- Verify redirect URIs in Google Console
- Check scopes are enabled
- Verify OAuth consent screen published

---

## 📊 **MONITORING**

### **Vercel Logs**
```
https://vercel.com/dashboard → Your Project → Logs
```

### **Supabase Logs**
```
https://supabase.com/dashboard → Your Project → Logs
```

### **Stripe Dashboard**
```
https://dashboard.stripe.com/test/dashboard
```

### **Anthropic Usage**
```
https://console.anthropic.com/settings/usage
```

---

## 🎯 **POST-LAUNCH**

1. **Monitor first 10 users**
2. **Check error logs daily**
3. **Test OCR accuracy**
4. **Verify email delivery rates**
5. **Track Stripe conversions**

---

## 🔑 **SECURITY NOTES**

- Never commit `.env` files to Git
- Keep `.env.production` file only on your local machine
- All API keys go in Vercel environment variables
- Use the separate VERCEL_ENV_VARIABLES.md file (keep it private!) for your actual credentials
- Rotate keys if accidentally exposed

---

## 📞 **SUPPORT**

If issues persist:
- Check GitHub Issues
- Review Vercel deployment logs
- Review this setup guide

---

**🚀 YOU'RE READY TO LAUNCH!**
