# 🚀 NetworkFollowUp Backend - Installation Guide

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase recommended)
- Claude API key
- Gmail OAuth credentials (optional for now)

---

## 🔧 Installation Steps

### 1. Install Node.js

**Windows:**
1. Go to: https://nodejs.org
2. Download LTS version (18.x or higher)
3. Run installer → Next → Next → Finish
4. Open CMD and verify:
```bash
node --version
npm --version
```

---

### 2. Setup Database (Supabase - FREE!)

1. Go to: https://supabase.com
2. Sign up with GitHub
3. Click "New Project"
4. Fill in:
   - Name: `networkfollowup`
   - Database Password: (choose strong password)
   - Region: (closest to you)
5. Click "Create new project"
6. Wait 2 minutes for setup
7. Go to "Settings" → "Database"
8. Copy "Connection string" (URI mode)
9. Save it - you'll need it!

---

### 3. Run Database Schema

1. In Supabase, go to "SQL Editor"
2. Click "New query"
3. Open the file `database/schema.sql` from your project
4. Copy ALL the content
5. Paste into Supabase SQL Editor
6. Click "Run"
7. ✅ Tables created!

---

### 4. Get Claude API Key

1. Go to: https://console.anthropic.com
2. Sign up / Login
3. Go to "API Keys"
4. Click "Create Key"
5. Name: `NetworkFollowUp`
6. Copy the key (starts with `sk-ant-`)
7. Save it!

---

### 5. Install Backend

Open CMD in the `backend` folder:

```bash
cd path/to/networkfollowup/backend

# Install dependencies
npm install

# This will take 2-3 minutes
```

---

### 6. Configure Environment

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Open `.env` with Notepad
3. Fill in:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=https://networkfollowup.netlify.app

# Paste your Supabase connection string here:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Paste your Claude API key here:
CLAUDE_API_KEY=sk-ant-api03-xxxxx

# Generate JWT secret (run: openssl rand -base64 32)
# Or just use this for testing:
JWT_SECRET=your-super-secret-key-change-in-production

# Gmail (leave empty for now)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
```

---

### 7. Start Backend

```bash
npm run dev
```

You should see:
```
🚀 NetworkFollowUp Backend running on port 3000
📝 Environment: development
🌐 Frontend URL: https://networkfollowup.netlify.app
📊 Database: Connected
```

✅ **BACKEND IS RUNNING!**

---

### 8. Test It

Open another CMD window:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return: {"status":"OK",...}
```

---

## 🌐 Deploy to Vercel (Production)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login

```bash
vercel login
```

### 3. Deploy

```bash
cd backend
vercel

# Answer:
# Set up and deploy? Y
# Which scope? (your account)
# Link to existing project? N
# Project name? networkfollowup-backend
# Directory? ./
# Override settings? N
```

### 4. Add Environment Variables

In Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add all variables from `.env`:
   - DATABASE_URL
   - CLAUDE_API_KEY
   - JWT_SECRET
   - etc.

### 5. Redeploy

```bash
vercel --prod
```

✅ **BACKEND LIVE ON VERCEL!**

You'll get a URL like: `https://networkfollowup-backend.vercel.app`

---

## 🔗 Connect Frontend to Backend

Update `frontend/login.html`:

Find this line:
```javascript
const API_URL = 'https://your-backend.vercel.app/api';
```

Replace with your Vercel URL:
```javascript
const API_URL = 'https://networkfollowup-backend.vercel.app/api';
```

Save and push to GitHub → Netlify auto-deploys!

---

## ✅ Verification Checklist

- [ ] Node.js installed
- [ ] Supabase database created
- [ ] Database schema imported
- [ ] Claude API key obtained
- [ ] Backend npm install done
- [ ] .env file configured
- [ ] Backend runs locally (npm run dev)
- [ ] Health endpoint works
- [ ] Deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Frontend updated with backend URL

---

## 🐛 Troubleshooting

**"Cannot find module"**
→ Run: `npm install`

**"Database connection failed"**
→ Check DATABASE_URL in .env
→ Make sure Supabase project is running

**"CLAUDE_API_KEY not set"**
→ Add it to .env file

**Port 3000 already in use**
→ Change PORT in .env to 3001

---

## 📞 Need Help?

Check logs:
```bash
# Backend logs will show errors
npm run dev
```

Test endpoints:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}'
```

---

**DONE! Backend is ready!** 🎉
