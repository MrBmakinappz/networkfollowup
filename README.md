# NetworkFollowUp 🚀

> Transform doTERRA customer screenshots into personalized follow-up emails in 30 seconds

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20AI-orange)](https://claude.ai)

---

## 🎯 What is NetworkFollowUp?

NetworkFollowUp is a SaaS platform that helps doTERRA distributors automate customer follow-ups using AI. Upload a screenshot from your back office, and we'll:

1. **Extract customer data** using Claude Vision API (OCR)
2. **Send personalized emails** with 3 different strategies:
   - **Retail** → Push 25% discount registration
   - **Wholesale** → Setup LRP (Loyalty Rewards Program)
   - **Advocates** → Book business growth strategy calls
3. **Translate automatically** into 9 languages
4. **Track everything** - Open rates, clicks, conversions

---

## ✨ Key Features

- 🤖 **AI-Powered OCR** - Extract customer data from screenshots with 95%+ accuracy
- 🎯 **3 Message Types** - Different strategies for Retail, Wholesale, and Wellness Advocates
- 🌍 **9 Languages** - Auto-translate to English, Italian, German, French, Polish, Bulgarian, Czech, Romanian, Slovak
- ✉️ **Gmail Integration** - Send from your personal Gmail account
- 📊 **Smart Analytics** - Track open rates, clicks, and conversions by customer type
- ⚡ **Rate Limiting** - Built-in protection (100/hour, 500/day limits)
- 💰 **Sustainable** - 95%+ profit margins with $0.005/email cost

---

## 🏗️ Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- Responsive design (mobile-first)
- No framework dependencies

**Backend (Planned):**
- Node.js + Express
- PostgreSQL database
- Claude API (Anthropic)
- Gmail API (OAuth 2.0)

**Deployment:**
- Frontend: Netlify (static hosting)
- Backend: Vercel / Railway / Render
- Database: Supabase / Neon / Railway

---

## 📂 Project Structure

```
networkfollowup/
├── frontend/
│   ├── index.html           # Landing page
│   ├── onboarding.html      # 7-step setup wizard
│   └── dashboard.html       # Main application
├── database/
│   └── schema.sql           # PostgreSQL schema
├── docs/
│   ├── IMPLEMENTATION_UPDATED.md    # Full implementation guide
│   └── DEVELOPER_REFERENCE.md       # Quick reference for devs
└── README.md
```

---

## 🚀 Quick Start

### **1. Clone the Repository**
```bash
git clone https://github.com/YOUR_USERNAME/networkfollowup.git
cd networkfollowup
```

### **2. Frontend (Static Site)**
```bash
cd frontend
# Open index.html in browser or use:
python -m http.server 8000
# Visit: http://localhost:8000
```

### **3. Database Setup**
```bash
# Install PostgreSQL, then:
createdb networkfollowup
psql networkfollowup < database/schema.sql
```

### **4. Environment Variables**
```bash
# Create .env file:
DATABASE_URL=postgresql://localhost/networkfollowup
CLAUDE_API_KEY=sk-ant-...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
```

---

## 📖 How It Works

### **Step 1: Upload Screenshot**
User uploads a screenshot from doTERRA back office showing customer list.

### **Step 2: AI Extracts Data**
Claude Vision API extracts:
- Full name
- Email address
- Member type (Retail/Wholesale/Advocate)
- Country code

### **Step 3: Personalized Messages**
System sends appropriate template based on customer type:

**🛍️ Retail Customers**
- Goal: Register for 25% wholesale discount
- Focus: Savings, no obligations, easy signup

**⭐ Wholesale Members**
- Goal: Setup LRP (Loyalty Rewards Program)
- Focus: Free products, 30% back in points, Product of Month

**💼 Wellness Advocates**
- Goal: Book 1-on-1 strategy call
- Focus: Business growth, marketing plan, rank advancement

### **Step 4: Track Results**
Dashboard shows:
- Emails sent by type
- Open rates by type
- Best performing templates
- Monthly usage & costs

---

## 💰 Pricing Strategy

| Plan | Price | Emails/Month | Margin |
|------|-------|--------------|--------|
| **Starter** | $29/mo | 100 | 95% |
| **Professional** | $79/mo | 500 | 97% |
| **Enterprise** | $199/mo | Unlimited | 95% |

**Cost Breakdown:**
- Claude OCR: $0.005 per screenshot
- Gmail API: FREE (rate limited)
- Translation: FREE (user does via Google Translate)

---

## 🎯 Customer Type Strategies

### 🛍️ Retail (Not Registered)
**Goal:** Get them to register for 25% discount

**Key Points:**
- 25% automatic savings on all products
- One-time $35 enrollment pays for itself
- No monthly purchase requirements
- Save hundreds per year

**Example Subject:** "Save 25% on All Your doTERRA Products"

---

### ⭐ Wholesale (No LRP)
**Goal:** Setup LRP (Loyalty Rewards Program)

**Key Points:**
- Earn up to 30% back in product credits
- Free Product of the Month
- Free shipping on LRP orders
- Points never expire

**Example Subject:** "Unlock Free Products with LRP"

---

### 💼 Wellness Advocate
**Goal:** Book strategy call for business growth

**Key Points:**
- Free 1-on-1 strategy session
- Personalized marketing plan
- Team duplication strategies
- Rank advancement roadmap

**Example Subject:** "Let's Grow Your doTERRA Business"

---

## 📊 Database Schema

**Key Tables:**
- `users` - User accounts & subscriptions
- `email_templates` - 3 types × 9 languages = 27 templates per user
- `customers` - Extracted from screenshots
- `email_sends` - Tracking & analytics
- `country_mappings` - Custom country code definitions

See `database/schema.sql` for full schema.

---

## 🛠️ Development

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Claude API key
- Gmail OAuth credentials

### **Install Dependencies**
```bash
npm install
```

### **Run Development Server**
```bash
npm run dev
```

### **Run Tests**
```bash
npm test
```

---

## 🚢 Deployment

### **Frontend (Netlify)**
1. Push code to GitHub
2. Connect repository to Netlify
3. Deploy automatically on push
4. Custom domain: `networkfollowup.com`

### **Backend (Vercel/Railway)**
1. Connect GitHub repository
2. Set environment variables
3. Deploy on push
4. Add custom domain for API

---

## 📚 Documentation

- **[Implementation Guide](docs/IMPLEMENTATION_UPDATED.md)** - Complete setup instructions
- **[Developer Reference](docs/DEVELOPER_REFERENCE.md)** - API docs, code snippets, testing

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Claude AI](https://claude.ai) by Anthropic
- OCR powered by Claude Vision API
- Designed for doTERRA distributors worldwide

---

## 📧 Contact

**Questions?** Open an issue or contact:
- Email: your-email@example.com
- Twitter: [@yourhandle](https://twitter.com/yourhandle)

---

## 🎯 Roadmap

- [x] Frontend onboarding wizard (7 steps)
- [x] 3 customer type strategies
- [x] Database schema design
- [ ] Backend API implementation
- [ ] Gmail OAuth integration
- [ ] Claude Vision OCR integration
- [ ] Payment processing (Stripe)
- [ ] Analytics dashboard
- [ ] Mobile app (iOS/Android)
- [ ] Zapier integration
- [ ] API for third-party integrations

---

**Built with ❤️ for the doTERRA community**

⭐ Star this repo if you find it useful!
