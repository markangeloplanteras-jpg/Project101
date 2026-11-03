import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push('CONSOLE ERROR: ' + message.text()); });
page.on('pageerror', (error) => errors.push('PAGE ERROR: ' + error.message));
await page.addInitScript((token) => { localStorage.setItem('lifeos.local.token', token); }, process.env.LIFEOS_TOKEN ?? '');

await page.goto('http://127.0.0.1:5174/tasks');
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'New task' }).first().click();
await page.waitForTimeout(1000);
await page.getByPlaceholder('e.g. Prepare quarterly review').fill('FINAL QA TASK');
await page.getByRole('button', { name: 'Create task' }).click();
await page.waitForTimeout(3500);
let text = await page.evaluate(() => document.body.innerText);
console.log('CREATED OK:', text.includes('FINAL QA TASK'));

const completeBtn = page.getByRole('button', { name: /Complete FINAL QA TASK/ }).first();
await completeBtn.click();
await page.waitForTimeout(3500);
text = await page.evaluate(() => document.body.innerText);
console.log('COMPLETED TOAST:', text.includes('Task completed.'));

const editBtn = page.getByRole('button', { name: /Edit FINAL QA TASK/ }).first();
await editBtn.click();
await page.waitForTimeout(1200);
const modalText = await page.evaluate(() => document.body.innerText);
console.log('EDIT MODAL SHOWS COMPLETED:', modalText.includes('Completed'));
await page.getByRole('button', { name: 'Save task' }).click();
await page.waitForTimeout(2500);

const deleteBtn = page.getByRole('button', { name: /Delete FINAL QA TASK/ }).first();
await deleteBtn.click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
await page.waitForTimeout(3000);
text = await page.evaluate(() => document.body.innerText);
console.log('TASK DELETED (no longer present):', !text.includes('FINAL QA TASK'));

console.log('ERRORS:\n', errors.length ? errors.join('\n---\n') : 'none');
await browser.close();
console.log('closed');
