import { test as setup, expect } from '@playwright/test'

const PRODUCER_FILE = 'playwright/.auth/producer.json'
const PROCESSOR_FILE = 'playwright/.auth/processor.json'

// Test credentials - these should be test accounts in your Supabase
const TEST_PRODUCER = {
  email: process.env.TEST_PRODUCER_EMAIL || 'test-producer@example.com',
  password: process.env.TEST_PRODUCER_PASSWORD || 'testpassword123',
}

const TEST_PROCESSOR = {
  email: process.env.TEST_PROCESSOR_EMAIL || 'test-processor@example.com',
  password: process.env.TEST_PROCESSOR_PASSWORD || 'testpassword123',
}

setup('authenticate as producer', async ({ page }) => {
  // Skip if no test credentials
  if (!process.env.TEST_PRODUCER_EMAIL) {
    console.log('Skipping producer auth - no TEST_PRODUCER_EMAIL set')
    return
  }

  await page.goto('/login')

  await page.fill('input[type="email"]', TEST_PRODUCER.email)
  await page.fill('input[type="password"]', TEST_PRODUCER.password)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

  // Save authentication state
  await page.context().storageState({ path: PRODUCER_FILE })
})

setup('authenticate as processor', async ({ page }) => {
  // Skip if no test credentials
  if (!process.env.TEST_PROCESSOR_EMAIL) {
    console.log('Skipping processor auth - no TEST_PROCESSOR_EMAIL set')
    return
  }

  await page.goto('/login')

  await page.fill('input[type="email"]', TEST_PROCESSOR.email)
  await page.fill('input[type="password"]', TEST_PROCESSOR.password)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

  // Save authentication state
  await page.context().storageState({ path: PROCESSOR_FILE })
})
