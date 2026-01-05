/**
 * Test Anthropic API Key
 * Run: node backend/test-api-key.js
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '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'
});

async function testKey() {
  console.log('🔵 Testing Anthropic API Key...');
  console.log('🔵 API Key:', process.env.ANTHROPIC_API_KEY ? 'SET (from env)' : 'USING FALLBACK');
  console.log('🔵 Key prefix:', (process.env.ANTHROPIC_API_KEY || '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').substring(0, 20) + '...');
  
  try {
    console.log('🔵 Testing with model: claude-3-opus-20240229');
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: "Say hello"
      }]
    });
    console.log('✅ API KEY WORKS!');
    console.log('✅ Response:', message.content[0].text);
    console.log('✅ Model:', message.model);
    console.log('✅ Usage:', message.usage);
  } catch (error) {
    console.error('❌ API KEY ERROR:', error.message);
    console.error('❌ Error code:', error.status);
    console.error('❌ Error type:', error.type);
    console.error('❌ Full error:', error);
    
    if (error.status === 401) {
      console.error('\n❌ INVALID API KEY - Check your ANTHROPIC_API_KEY');
    } else if (error.status === 404) {
      console.error('\n❌ MODEL NOT FOUND - Try different model or check API access');
    } else if (error.status === 429) {
      console.error('\n❌ RATE LIMIT - Too many requests');
    } else {
      console.error('\n❌ UNKNOWN ERROR - Check API key and network connection');
    }
  }
}

// Test multiple models
async function testAllModels() {
  const models = [
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ];
  
  console.log('\n🔵 Testing all available models...\n');
  
  for (const model of models) {
    try {
      console.log(`🔵 Testing ${model}...`);
      const message = await anthropic.messages.create({
        model: model,
        max_tokens: 50,
        messages: [{
          role: "user",
          content: "Hi"
        }]
      });
      console.log(`✅ ${model} WORKS!`);
      console.log(`   Response: ${message.content[0].text.substring(0, 50)}...\n`);
    } catch (error) {
      console.error(`❌ ${model} FAILED: ${error.message}\n`);
    }
  }
}

// Run tests
async function runTests() {
  await testKey();
  await testAllModels();
}

runTests();

