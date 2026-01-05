// utils/claude.js
// Claude API integration for OCR extraction

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Extract customer data from screenshot using Claude Vision
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} mimeType - Image MIME type (image/jpeg, image/png)
 * @param {string} defaultLanguage - User's default language
 * @returns {Promise<Array>} - Array of extracted customers
 */
async function extractCustomersFromImage(imageBuffer, mimeType = 'image/jpeg', defaultLanguage = 'en') {
    try {
        // Convert buffer to base64
        const base64Image = imageBuffer.toString('base64');

        const prompt = `You are an expert at extracting customer data from doTERRA and MLM company back office screenshots.

TASK: Extract ALL customer information from this image and return it as a JSON array.

REQUIRED FIELDS for each customer:
- full_name: Full name (First + Last name)
- email: Email address
- customer_type: Must be one of: "retail", "wholesale", or "advocates"
- country_code: 3-letter country code (USA, DEU, ITA, ESP, FRA, etc.)
- language: 2-letter language code based on country (en, de, it, es, fr, etc.)

CUSTOMER TYPE RULES:
- "retail" = Retail Customer, PC (Preferred Customer), one-time buyer
- "wholesale" = Wholesale Customer, WC (Wholesale Customer), discount member
- "advocates" = Wellness Advocate, WA, Builder, Distributor, team member

COUNTRY & LANGUAGE MAPPING:
- If country is not clear, use "${defaultLanguage}" as language
- USA → en, DEU/Germany → de, ITA/Italy → it, ESP/Spain → es, FRA/France → fr
- UK/GBR → en, AUT/Austria → de, CHE/Switzerland → multiple (use context)

IMPORTANT:
- Extract ALL visible customers (even if 50+)
- If email is not visible, use placeholder: "no-email-{index}@placeholder.com"
- If name is partially visible, extract what you can see
- Return ONLY valid JSON array, no markdown, no explanation
- If NO customers found, return empty array: []

RESPONSE FORMAT:
[
  {
    "full_name": "John Smith",
    "email": "john.smith@email.com",
    "customer_type": "retail",
    "country_code": "USA",
    "language": "en"
  },
  {
    "full_name": "Maria Garcia",
    "email": "maria@email.com",
    "customer_type": "wholesale",
    "country_code": "ESP",
    "language": "es"
  }
]

NOW EXTRACT:`;

        const message = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 4096,
            messages: [{
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: mimeType,
                            data: base64Image,
                        }
                    },
                    {
                        type: "text",
                        text: prompt
                    }
                ]
            }]
        });

        // Parse Claude's response
        const responseText = message.content[0].text.trim();
        
        console.log('Claude raw response:', responseText);

        // Try to parse JSON
        let customers = [];
        
        try {
            // Remove markdown code blocks if present
            let jsonText = responseText;
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }
            
            customers = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response text:', responseText);
            
            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                customers = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse customers from Claude response');
            }
        }

        // Validate and clean data
        const validatedCustomers = customers
            .filter(c => c.full_name && c.email)
            .map((customer, index) => ({
                full_name: String(customer.full_name).trim(),
                email: String(customer.email).trim().toLowerCase(),
                customer_type: validateCustomerType(customer.customer_type),
                country_code: String(customer.country_code || 'USA').toUpperCase().substring(0, 3),
                language: String(customer.language || defaultLanguage).toLowerCase().substring(0, 5),
            }));

        console.log(`Extracted ${validatedCustomers.length} customers`);
        
        return validatedCustomers;

    } catch (error) {
        console.error('Claude OCR error:', error);
        throw new Error(`OCR extraction failed: ${error.message}`);
    }
}

/**
 * Validate customer type
 */
function validateCustomerType(type) {
    const validTypes = ['retail', 'wholesale', 'advocates'];
    const normalized = String(type).toLowerCase().trim();
    
    // Handle variations
    if (normalized.includes('retail') || normalized.includes('pc') || normalized === 'r') {
        return 'retail';
    }
    if (normalized.includes('wholesale') || normalized.includes('wc') || normalized === 'w') {
        return 'wholesale';
    }
    if (normalized.includes('advocate') || normalized.includes('wa') || normalized.includes('builder') || normalized === 'a') {
        return 'advocates';
    }
    
    // Default to retail if unclear
    return validTypes.includes(normalized) ? normalized : 'retail';
}

/**
 * Estimate token usage for image
 */
function estimateTokens(imageBuffer) {
    const sizeInMB = imageBuffer.length / (1024 * 1024);
    // Claude uses ~1,500 tokens per MB for images
    return Math.ceil(sizeInMB * 1500);
}

module.exports = {
    extractCustomersFromImage,
    estimateTokens
};
