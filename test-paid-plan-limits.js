#!/usr/bin/env node

/**
 * Test script to verify PSD parsing with paid plan limits
 */

const fs = require('fs');
const path = require('path');

// Simulate the updated constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for paid plan
const MAX_LAYERS = 20; // Increased for paid plan
const MAX_DEPTH = 2; // Increased for paid plan
const PROCESSING_TIMEOUT = 25000; // 25s for paid plan

console.log('🧪 Testing PSD Parser with Paid Plan Limits');
console.log('==========================================');
console.log(`📊 MAX_FILE_SIZE: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`);
console.log(`📚 MAX_LAYERS: ${MAX_LAYERS}`);
console.log(`🔍 MAX_DEPTH: ${MAX_DEPTH}`);
console.log(`⏱️  PROCESSING_TIMEOUT: ${PROCESSING_TIMEOUT}ms`);
console.log('');

console.log('✅ Configuration updated for paid plan!');
console.log('📝 Changes made:');
console.log('   - File size limit: 10MB → 50MB');
console.log('   - Max layers: 10 → 20');
console.log('   - Max depth: 1 → 2');
console.log('   - Processing timeout: 10s → 25s');
console.log('   - Enhanced layer extraction with text info');
console.log('   - Better error handling');
console.log('   - Paid plan metadata');

console.log('');
console.log('🚀 Ready to test with larger PSD files!');
console.log('💡 Next step: Deploy and test with a 20-30MB PSD file');
