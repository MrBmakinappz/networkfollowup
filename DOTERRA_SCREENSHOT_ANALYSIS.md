# doTERRA Screenshot Analysis & Optimized Prompt

## 📊 SCREENSHOT STRUCTURE ANALYSIS

Based on the actual doTERRA back office customer list screenshot:

### Table Columns (Left to Right):

1. **Customer Name** (Column 1)
   - Format: "Lastname, Firstname" or "Firstname, Lastname"
   - Examples: "Mladenov, Yordan", "Hacquard, Eric", "Limańska-Rydel,..."
   - Names are underlined (clickable links)
   - Some names are truncated with "..."

2. **Status Indicators** (Column 2)
   - Green "New" button
   - Envelope icon (email)
   - Crossed-out circle icon (status indicator)
   - Not needed for extraction

3. **Date** (Column 3)
   - Format: MM/DD/YYYY
   - Examples: "12/20/2025", "12/18/2025", "12/15/2025"
   - Not needed for extraction (we focus on customer data)

4. **Customer Type** (Column 4)
   - Values: "Retail Customer" or "Wholesale Customer"
   - This is CRITICAL for our extraction
   - Must map to: "retail" or "wholesale"

5. **Numerical Value 1** (Column 5)
   - Mostly empty
   - Only appears for Wholesale Customers
   - Not needed for extraction

6. **Numerical Value 2** (Column 6)
   - Contains values like "188.50^", "20.00^", "111.00"
   - Has caret symbol (^) and underlined
   - Not needed for extraction

7. **Numerical Value 3** (Column 7)
   - Mostly empty
   - Only for Wholesale Customers
   - Not needed for extraction

8. **Email Address** (Column 8)
   - Full email addresses
   - Examples: "yordan.mladenov96@gmail.com", "salutemcorpus@gmail.com"
   - CRITICAL for extraction

9. **Country Code** (Column 9)
   - 3-letter ISO codes
   - Examples: "BGR" (Bulgaria), "FRA" (France), "CAN" (Canada), "POL" (Poland), "AUT" (Austria), "DEU" (Germany), "HUN" (Hungary)
   - CRITICAL for extraction

### Key Observations:

1. **Customer Type Detection:**
   - "Retail Customer" → map to "retail"
   - "Wholesale Customer" → map to "wholesale"
   - No "Advocates" visible in this screenshot, but may exist in other screenshots

2. **Name Format:**
   - Can be "Lastname, Firstname" or "Firstname, Lastname"
   - May be truncated with "..."
   - Must extract FULL name (both parts)

3. **Country Code:**
   - Always 3-letter uppercase ISO codes
   - Directly visible in column 9

4. **Email:**
   - Always present in column 8
   - Standard email format

5. **Layout:**
   - Table format with clear columns
   - Alternating row colors (light blue/white)
   - Multiple rows visible (19+ customers)

## 🎯 OPTIMIZED PROMPT REQUIREMENTS

The prompt must:
1. Specifically mention the doTERRA table structure
2. Identify columns by position/header
3. Handle "Lastname, Firstname" format
4. Map "Retail Customer" → "retail", "Wholesale Customer" → "wholesale"
5. Extract country codes from column 9
6. Extract emails from column 8
7. Handle truncated names
8. Extract ALL visible rows






