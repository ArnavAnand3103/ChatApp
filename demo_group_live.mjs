/**
 * Live demo: two users login, create group, chat (Antigravity-style browser run)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5001';
const APP = 'http://localhost:5173';
const USER_A = { name: 'TestA', email: 'testa@test.com', password: 'Password1' };
const USER_B = { name: 'TestB', email: 'testb@test.com', password: 'Password1' };
const GROUP_NAME = 'TestA & TestB Group';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(body ? {} : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function ensureUser({ name, email, password }) {
  const signup = await api('POST', '/signup', { name, email, password });
  if (signup?.message === 'Signup successful') {
    console.log(`✓ Signed up ${email}`);
  } else {
    console.log(`✓ ${email} ready (${signup?.message || 'exists'})`);
  }
}

async function loginInBrowser(page, { email, password }) {
  page.on('dialog', async (d) => { await d.accept(); });
  await page.goto(`${APP}/login`);
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/chat', { timeout: 20000 });
  await page.waitForSelector('.sidebar', { timeout: 10000 });
  console.log(`✓ Logged in as ${email}`);
}

async function createGroupInBrowser(page, groupName, memberLabel) {
  await page.click('button:has-text("Create Group")');
  await page.fill('input[placeholder="Group Name"]', groupName);
  const row = page.locator('div').filter({ has: page.locator(`span:text-is("${memberLabel}")`) }).last();
  await row.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForTimeout(800);
  console.log(`✓ Created group "${groupName}" with ${memberLabel}`);
}

async function openGroup(page, groupName) {
  const group = page.getByText(groupName, { exact: true }).first();
  await group.waitFor({ timeout: 15000 });
  await group.click();
  await page.waitForSelector('#msgInput', { timeout: 10000 });
  await page.waitForTimeout(400);
}

async function waitForGroupInSidebar(page, groupName) {
  await page.waitForFunction(
    (name) => [...document.querySelectorAll('.friend-name')].some(el => el.textContent === name),
    groupName,
    { timeout: 15000 }
  );
}

async function sendMessage(page, text) {
  await page.fill('#msgInput', text);
  await page.press('#msgInput', 'Enter');
  await page.waitForTimeout(600);
}

async function messageVisible(page, text) {
  return page.locator('.message').filter({ hasText: text }).first().isVisible();
}

async function run() {
  console.log('\n🚀 Group Chat Live Demo\n');

  await ensureUser(USER_A);
  await ensureUser(USER_B);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const contextA = await browser.newContext({ viewport: { width: 700, height: 800 } });
  const contextB = await browser.newContext({ viewport: { width: 700, height: 800 } });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.evaluate(() => window.moveTo(0, 0));
  await pageB.evaluate(() => window.moveTo(720, 0));

  await loginInBrowser(pageA, USER_A);

  await createGroupInBrowser(pageA, GROUP_NAME, USER_B.name);
  await waitForGroupInSidebar(pageA, GROUP_NAME);

  // Second browser opens after group exists — like Antigravity's second user window
  await loginInBrowser(pageB, USER_B);
  await waitForGroupInSidebar(pageB, GROUP_NAME);

  await openGroup(pageA, GROUP_NAME);
  await openGroup(pageB, GROUP_NAME);

  const msgFromA = `Hey TestB! Group chat works — ${new Date().toLocaleTimeString()}`;
  const msgFromB = `Hi TestA! I got it 👋`;

  await sendMessage(pageA, msgFromA);
  await pageB.waitForTimeout(1200);

  const bGotA = await messageVisible(pageB, msgFromA);
  console.log(bGotA ? '✓ TestB received TestA message' : '✗ TestB did NOT receive TestA message');

  await sendMessage(pageB, msgFromB);
  await pageA.waitForTimeout(1200);

  const aGotB = await messageVisible(pageA, msgFromB);
  console.log(aGotB ? '✓ TestA received TestB message' : '✗ TestA did NOT receive TestB message');

  await pageA.screenshot({ path: 'demo-alice-group.png' });
  await pageB.screenshot({ path: 'demo-bob-group.png' });
  console.log('✓ Screenshots saved: demo-alice-group.png, demo-bob-group.png');

  console.log('\n✅ Demo complete — two browser windows should be open.\n');
  console.log('   TestA: testa@test.com / Password1');
  console.log('   TestB: testb@test.com / Password1');
  console.log(`   Group: "${GROUP_NAME}"\n`);

  await pageA.waitForTimeout(8000);
  await browser.close();
}

run().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
