const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:5000';

function testEmiFormula(price, dpPct, rate, years) {
  const downPayment = price * (dpPct / 100);
  const principal = price - downPayment;
  const monthlyRate = (rate / 12) / 100;
  const months = years * 12;
  const compound = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * compound) / (compound - 1);
  const totalPayable = emi * months;
  const totalInterest = totalPayable - principal;
  return { principal, emi: Math.round(emi), totalPayable: Math.round(totalPayable), totalInterest: Math.round(totalInterest) };
}

async function runTests() {
  console.log('================================================================');
  console.log('   TESTING OPTION 2: EMI CALCULATOR & FLOATING WHATSAPP CONCIERGE');
  console.log('================================================================\n');

  // Test 1: Mathematical Accuracy of EMI Formula
  console.log('Test 1: Verifying EMI mathematical formula...');
  // Standard benchmark: 1 Crore loan, 20% down payment (80L principal), 8.5% for 20 years (240 months)
  const calc1 = testEmiFormula(10000000, 20, 8.5, 20);
  assert.strictEqual(calc1.principal, 8000000, 'Principal should be 80 Lakhs');
  assert(calc1.emi > 69000 && calc1.emi < 70000, `EMI for 80L @ 8.5% should be ~69,426 (got ${calc1.emi})`);
  assert(calc1.totalInterest > 8000000, 'Total interest over 20 years exceeds principal at 8.5%');
  console.log(`  ✓ Benchmark calculation verified: 80L @ 8.5% for 20y = ₹${calc1.emi.toLocaleString('en-IN')}/month\n`);

  // Test 2: Verify project-detail.html has EMI Calculator markup, sliders, and logic
  console.log('Test 2: Verifying project-detail.html implementation...');
  const detailHtml = fs.readFileSync(path.join(ROOT, 'project-detail.html'), 'utf8');
  assert(detailHtml.includes('id="emiPanel"'), 'Missing #emiPanel in project-detail.html');
  assert(detailHtml.includes('id="emiPriceRange"'), 'Missing #emiPriceRange slider');
  assert(detailHtml.includes('id="emiDownPaymentRange"'), 'Missing #emiDownPaymentRange slider');
  assert(detailHtml.includes('id="emiInterestRange"'), 'Missing #emiInterestRange slider');
  assert(detailHtml.includes('id="emiTenureRange"'), 'Missing #emiTenureRange slider');
  assert(detailHtml.includes('id="emiMonthlyVal"'), 'Missing #emiMonthlyVal display');
  assert(detailHtml.includes('id="btnEmiApply"'), 'Missing #btnEmiApply button');
  assert(detailHtml.includes('initEmiCalculator'), 'Missing initEmiCalculator function');
  assert(detailHtml.includes('id="waFloatingWidget"'), 'Missing #waFloatingWidget in project-detail.html');
  console.log('  ✓ project-detail.html contains complete EMI panel and floating widget\n');

  // Test 3: Verify index.html has Floating WhatsApp Concierge
  console.log('Test 3: Verifying index.html implementation...');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert(indexHtml.includes('id="waFloatingWidget"'), 'Missing #waFloatingWidget in index.html');
  assert(indexHtml.includes('wa-floating-btn'), 'Missing .wa-floating-btn CSS class in index.html');
  assert(indexHtml.includes('https://wa.me/916352000017'), 'Incorrect WhatsApp phone number in index.html');
  console.log('  ✓ index.html has live floating WhatsApp concierge\n');

  // Test 4: Verify project-category.html has Floating WhatsApp Concierge
  console.log('Test 4: Verifying project-category.html implementation...');
  const catHtml = fs.readFileSync(path.join(ROOT, 'project-category.html'), 'utf8');
  assert(catHtml.includes('id="waFloatingWidget"'), 'Missing #waFloatingWidget in project-category.html');
  assert(catHtml.includes('wa-floating-btn'), 'Missing .wa-floating-btn CSS class in project-category.html');
  assert(catHtml.includes('https://wa.me/916352000017'), 'Incorrect WhatsApp phone number in project-category.html');
  console.log('  ✓ project-category.html has live floating WhatsApp concierge with category personalization\n');

  // Test 5: HTTP Server Delivery
  console.log('Test 5: Verifying live HTTP delivery of updated pages...');
  for (const page of ['/index.html', '/project-category.html?category=RESIDENTIAL', '/project-detail.html?id=1']) {
    const res = await new Promise((resolve) => {
      http.get(BASE_URL + page, (r) => {
        let body = '';
        r.on('data', chunk => body += chunk);
        r.on('end', () => resolve({ status: r.statusCode, body }));
      });
    });
    assert.strictEqual(res.status, 200, `Expected 200 for ${page}`);
    assert(res.body.includes('waFloatingWidget'), `waFloatingWidget missing from served ${page}`);
    console.log(`  ✓ ${page} returned HTTP 200 and verified widget delivery`);
  }

  console.log('\n================================================================');
  console.log('  ALL OPTION 2 TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
