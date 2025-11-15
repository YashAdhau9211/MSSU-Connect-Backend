/**
 * Performance Load Test Script
 * 
 * This script tests the performance of core authentication operations
 * to ensure they meet the requirement of 95th percentile < 500ms
 * 
 * To run: node tests/performance/load-test.js
 */

import { hashPassword, verifyPassword } from '../../src/services/passwordService.js';
import { generateTokens, verifyToken } from '../../src/services/tokenService.js';
import { generateOTP } from '../../src/services/otpService.js';

// Performance measurement utility
class PerformanceTest {
  constructor(name) {
    this.name = name;
    this.measurements = [];
  }

  async measure(fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    const duration = end - start;
    this.measurements.push(duration);
    return duration;
  }

  getStats() {
    if (this.measurements.length === 0) {
      return null;
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  printStats() {
    const stats = this.getStats();
    if (!stats) {
      console.log(`${this.name}: No measurements`);
      return;
    }

    console.log(`\n${this.name}:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Min: ${stats.min.toFixed(2)}ms`);
    console.log(`  Max: ${stats.max.toFixed(2)}ms`);
    console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
    console.log(`  Median: ${stats.median.toFixed(2)}ms`);
    console.log(`  95th percentile: ${stats.p95.toFixed(2)}ms`);
    console.log(`  99th percentile: ${stats.p99.toFixed(2)}ms`);
    
    // Check if meets requirement (95th percentile < 500ms)
    if (stats.p95 < 500) {
      console.log(`  ✓ PASS: 95th percentile is under 500ms`);
    } else {
      console.log(`  ✗ FAIL: 95th percentile exceeds 500ms`);
    }
  }
}

// Test password hashing performance
async function testPasswordHashing(iterations = 100) {
  const test = new PerformanceTest('Password Hashing');
  const password = 'TestPassword123';

  console.log(`\nTesting password hashing (${iterations} iterations)...`);
  
  for (let i = 0; i < iterations; i++) {
    await test.measure(async () => {
      await hashPassword(password);
    });
  }

  test.printStats();
  return test.getStats();
}

// Test password verification performance
async function testPasswordVerification(iterations = 100) {
  const test = new PerformanceTest('Password Verification');
  const password = 'TestPassword123';
  const hash = await hashPassword(password);

  console.log(`\nTesting password verification (${iterations} iterations)...`);
  
  for (let i = 0; i < iterations; i++) {
    await test.measure(async () => {
      await verifyPassword(password, hash);
    });
  }

  test.printStats();
  return test.getStats();
}

// Test token generation performance
async function testTokenGeneration(iterations = 1000) {
  const test = new PerformanceTest('Token Generation');
  const payload = {
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'Student',
    campus_id: '123e4567-e89b-12d3-a456-426614174001',
    token_version: 0
  };

  console.log(`\nTesting token generation (${iterations} iterations)...`);
  
  for (let i = 0; i < iterations; i++) {
    await test.measure(async () => {
      generateTokens(payload);
    });
  }

  test.printStats();
  return test.getStats();
}

// Test token verification performance
async function testTokenVerification(iterations = 1000) {
  const test = new PerformanceTest('Token Verification');
  const payload = {
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'Student',
    campus_id: '123e4567-e89b-12d3-a456-426614174001',
    token_version: 0
  };
  const { accessToken } = generateTokens(payload);

  console.log(`\nTesting token verification (${iterations} iterations)...`);
  
  for (let i = 0; i < iterations; i++) {
    await test.measure(async () => {
      verifyToken(accessToken);
    });
  }

  test.printStats();
  return test.getStats();
}

// Test OTP generation performance
async function testOTPGeneration(iterations = 1000) {
  const test = new PerformanceTest('OTP Generation');

  console.log(`\nTesting OTP generation (${iterations} iterations)...`);
  
  for (let i = 0; i < iterations; i++) {
    await test.measure(async () => {
      generateOTP();
    });
  }

  test.printStats();
  return test.getStats();
}

// Run all performance tests
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('PERFORMANCE TEST SUITE');
  console.log('Target: 95th percentile < 500ms for all operations');
  console.log('='.repeat(60));

  const results = {
    passwordHashing: await testPasswordHashing(50), // Fewer iterations for slow operations
    passwordVerification: await testPasswordVerification(50),
    tokenGeneration: await testTokenGeneration(1000),
    tokenVerification: await testTokenVerification(1000),
    otpGeneration: await testOTPGeneration(1000)
  };

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  let allPassed = true;
  for (const [name, stats] of Object.entries(results)) {
    const passed = stats.p95 < 500;
    const status = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${name}: ${stats.p95.toFixed(2)}ms (95th percentile)`);
    if (!passed) allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✓ ALL TESTS PASSED');
  } else {
    console.log('✗ SOME TESTS FAILED');
  }
  console.log('='.repeat(60));

  return allPassed;
}

// Run tests if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runAllTests()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Error running performance tests:', error);
      process.exit(1);
    });
}

export { runAllTests, testPasswordHashing, testPasswordVerification, testTokenGeneration, testTokenVerification, testOTPGeneration };
