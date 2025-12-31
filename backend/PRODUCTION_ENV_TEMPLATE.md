# Production Environment Variables Template
## For Vercel Deployment

Copy these values to Vercel → Settings → Environment Variables

---

## Required Variables (15 total)

```env
# Database
DATABASE_URL=postgresql://postgres.USERNAME:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# JWT Secret (generate new one for production)
JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

# Frontend URL
FRONTEND_URL=https://networkfollowup.netlify.app

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google OAuth
GOOGLE_CLIENT_ID=44537799358-7kirdsb998jdc6r2h1btgn9v2p3tc4sl.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/api/oauth/google/callback

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_STARTER_PRICE_ID=your_stripe_starter_price_id_here
STRIPE_PRO_PRICE_ID=your_stripe_pro_price_id_here
STRIPE_ENTERPRISE_PRICE_ID=your_stripe_enterprise_price_id_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Admin
ADMIN_EMAIL=alessandrobrozzi1@gmail.com

# Environment
NODE_ENV=production
```

---

## Important Notes

1. **JWT_SECRET**: Generate a NEW secret for production (don't use the same as development)
2. **DATABASE_URL**: Use Session mode connection string from Supabase
3. **GOOGLE_REDIRECT_URI**: Must match exactly what's in Google Cloud Console
4. **All variables**: Must be set in Vercel before deployment

---

## Verification

After setting all variables:
1. Redeploy backend in Vercel
2. Test: https://networkfollowup-backend-hm12cqp9v-brondors-projects.vercel.app/health
3. Should return: `{"status":"OK"}`

