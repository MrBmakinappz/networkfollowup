[DEVELOPER_REFERENCE.md](https://github.com/user-attachments/files/24350300/DEVELOPER_REFERENCE.md)
# 🚀 DEVELOPER QUICK REFERENCE
## 3 Customer Types Implementation

---

## 📊 DATA MODEL

### Customer Type Detection
```javascript
// Frontend: Detect from member_type field
function detectCustomerType(memberType) {
    if (memberType.includes('Retail')) return 'retail';
    if (memberType.includes('Wholesale')) return 'wholesale';
    if (memberType.includes('Advocate') || memberType.includes('Wellness')) return 'advocate';
    return 'retail'; // default
}
```

### Database Queries

**Save all 3 templates on onboarding**:
```sql
-- Insert retail template
INSERT INTO email_templates (user_id, message_type, language, subject, body)
VALUES ($1, 'retail', 'English', $2, $3)
ON CONFLICT (user_id, message_type, language) 
DO UPDATE SET subject = $2, body = $3, last_edited_at = NOW();

-- Repeat for 'wholesale' and 'advocate'
```

**Get template for customer**:
```sql
SELECT subject, body 
FROM email_templates 
WHERE user_id = $1 
  AND message_type = $2 
  AND language = $3
LIMIT 1;
```

**Analytics by type**:
```sql
SELECT 
    message_type,
    COUNT(*) as emails_sent,
    AVG(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as open_rate
FROM email_sends
WHERE user_id = $1
  AND sent_at > NOW() - INTERVAL '30 days'
GROUP BY message_type;
```

---

## 🔄 EMAIL SENDING WORKFLOW

### Step-by-step Process

```javascript
// 1. User uploads screenshot
const screenshot = uploadFile();

// 2. Claude OCR extracts data
const customers = await extractWithClaude(screenshot);
// Returns: [{ name, email, memberType, country }, ...]

// 3. For each customer, determine type
customers.forEach(customer => {
    const type = detectCustomerType(customer.memberType);
    // type is 'retail', 'wholesale', or 'advocate'
    
    // 4. Get appropriate template
    const template = getTemplate(userId, type, customer.language);
    
    // 5. Replace variables
    const subject = replaceVars(template.subject, customer, userProfile);
    const body = replaceVars(template.body, customer, userProfile);
    
    // 6. Send via Gmail API
    sendEmail(customer.email, subject, body);
    
    // 7. Track in database
    logEmailSend(userId, customer.id, type, subject, body);
});
```

---

## 🎯 VARIABLE REPLACEMENT

### Available Variables

**Customer Data**:
- `[firstname]` → Customer's first name
- `[fullname]` → Customer's full name
- `[email]` → Customer's email
- `[country]` → Customer's country

**User Data** (from user_profiles):
- `[your-name]` → User's full name
- `[your-phone]` → User's phone number

### Implementation

```javascript
function replaceVars(text, customer, userProfile) {
    return text
        .replace(/\[firstname\]/g, customer.firstName)
        .replace(/\[fullname\]/g, customer.fullName)
        .replace(/\[email\]/g, customer.email)
        .replace(/\[country\]/g, customer.country)
        .replace(/\[your-name\]/g, userProfile.fullName)
        .replace(/\[your-phone\]/g, userProfile.phone);
}
```

---

## 📈 ANALYTICS ENDPOINTS

### GET /api/analytics/customer-types
```json
{
    "retail": {
        "total_customers": 120,
        "emails_sent": 85,
        "open_rate": 0.42,
        "avg_time_to_open": "4.2 hours"
    },
    "wholesale": {
        "total_customers": 45,
        "emails_sent": 38,
        "open_rate": 0.51,
        "avg_time_to_open": "2.8 hours"
    },
    "advocate": {
        "total_customers": 15,
        "emails_sent": 12,
        "open_rate": 0.67,
        "avg_time_to_open": "1.5 hours"
    }
}
```

### GET /api/templates/:userId
```json
{
    "retail": {
        "English": { "subject": "...", "body": "..." },
        "Italian": { "subject": "...", "body": "..." }
    },
    "wholesale": {
        "English": { "subject": "...", "body": "..." }
    },
    "advocate": {
        "English": { "subject": "...", "body": "..." }
    }
}
```

---

## ✅ VALIDATION RULES

### Onboarding Step 2
```javascript
function validateStep2() {
    // Must have all 3 types saved
    const hasRetail = savedMessages.retail.saved;
    const hasWholesale = savedMessages.wholesale.saved;
    const hasAdvocate = savedMessages.advocate.saved;
    
    if (!hasRetail || !hasWholesale || !hasAdvocate) {
        return {
            valid: false,
            error: 'Please save messages for all 3 customer types'
        };
    }
    
    // Each must have subject and body
    for (const type of ['retail', 'wholesale', 'advocate']) {
        if (!savedMessages[type].subject || !savedMessages[type].body) {
            return {
                valid: false,
                error: `${type} template is incomplete`
            };
        }
    }
    
    return { valid: true };
}
```

---

## 🎨 FRONTEND STATE MANAGEMENT

### Local Storage Structure
```javascript
{
    "onboarding": {
        "step": 2,
        "messages": {
            "retail": {
                "subject": "Save 25% on doTERRA",
                "body": "Hi [firstname]...",
                "saved": true
            },
            "wholesale": {
                "subject": "Unlock Free Products",
                "body": "Hey [firstname]...",
                "saved": true
            },
            "advocate": {
                "subject": "Let's Grow Together",
                "body": "Hi [firstname]...",
                "saved": false
            }
        }
    }
}
```

---

## 🔧 API INTEGRATION CHECKLIST

### Onboarding Completion (POST /api/onboarding/complete)
```javascript
{
    "user_id": "uuid",
    "templates": {
        "retail": {
            "subject": "...",
            "body": "...",
            "language": "English"
        },
        "wholesale": {
            "subject": "...",
            "body": "...",
            "language": "English"
        },
        "advocate": {
            "subject": "...",
            "body": "...",
            "language": "English"
        }
    },
    "profile": {
        "name": "...",
        "phone": "...",
        "website": "..."
    }
}
```

### Response
```javascript
{
    "success": true,
    "user_id": "uuid",
    "templates_created": 3,
    "next_step": "connect_gmail"
}
```

---

## 🐛 COMMON ISSUES & FIXES

### Issue: Templates not saving
**Check**:
1. Subject and body both filled?
2. SaveMessage() function called?
3. savedMessages[type].saved set to true?

### Issue: Wrong template sent to customer
**Check**:
1. detectCustomerType() logic correct?
2. memberType field in database accurate?
3. Template exists for that type?

### Issue: Variables not replacing
**Check**:
1. Variable names spelled correctly with brackets?
2. Customer data has those fields?
3. replaceVars() function called before sending?

---

## 📦 DEPLOYMENT

### Environment Variables
```bash
DATABASE_URL=postgresql://...
CLAUDE_API_KEY=sk-ant-...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
```

### Database Migrations
```bash
# Run schema updates
psql $DATABASE_URL < database-schema.sql

# Verify tables
psql $DATABASE_URL -c "SELECT message_type, COUNT(*) FROM email_templates GROUP BY message_type;"
```

---

## 🎯 TESTING

### Unit Tests
```javascript
// Test customer type detection
assert(detectCustomerType('Retail Customer') === 'retail');
assert(detectCustomerType('Wholesale Member') === 'wholesale');
assert(detectCustomerType('Wellness Advocate') === 'advocate');

// Test variable replacement
const result = replaceVars(
    'Hi [firstname], I am [your-name]',
    { firstName: 'Sarah' },
    { fullName: 'John Smith' }
);
assert(result === 'Hi Sarah, I am John Smith');
```

### Integration Tests
```javascript
// Test full flow
1. Upload screenshot
2. Extract 10 customers (3 retail, 5 wholesale, 2 advocates)
3. Verify correct template selected for each
4. Verify variables replaced correctly
5. Verify emails sent with right message_type
```

---

## 📝 CODE SNIPPETS

### Create Email Template (Node.js)
```javascript
async function createTemplate(userId, type, language, subject, body) {
    const query = `
        INSERT INTO email_templates (user_id, message_type, language, subject, body)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, message_type, language)
        DO UPDATE SET 
            subject = $4, 
            body = $5, 
            last_edited_at = NOW()
        RETURNING *;
    `;
    
    return await db.query(query, [userId, type, language, subject, body]);
}
```

### Send Email with Tracking
```javascript
async function sendCustomerEmail(customer, userId) {
    // Detect type
    const type = detectCustomerType(customer.memberType);
    
    // Get template
    const template = await getTemplate(userId, type, customer.language);
    
    // Replace variables
    const userProfile = await getUserProfile(userId);
    const subject = replaceVars(template.subject, customer, userProfile);
    const body = replaceVars(template.body, customer, userProfile);
    
    // Send via Gmail
    const result = await gmail.send(customer.email, subject, body);
    
    // Track in DB
    await db.query(`
        INSERT INTO email_sends 
        (user_id, customer_id, recipient_email, subject, body, language, message_type, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, customer.id, customer.email, subject, body, customer.language, type, 'sent']);
    
    return result;
}
```

---

**READY TO CODE!** 🚀
