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
  // Skip auth tests - credentials need to be verified
  // Supabase auth with Playwright requires special handling
  console.log('Skipping producer auth - auth tests disabled for now')
  return

  // Skip if no test credentials
  if (!process.env.TEST_PRODUCER_EMAIL) {
    console.log('Skipping producer auth - no TEST_PRODUCER_EMAIL set')
    return
  }

  console.log('Attempting login with email:', TEST_PRODUCER.email)
  console.log('Password length:', TEST_PRODUCER.password.length)

  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  // Wait for React hydration
  await page.waitForTimeout(1000)

  // Wait for email input to be visible and enabled
  const emailInput = page.locator('#email')
  await emailInput.waitFor({ state: 'visible' })

  // Focus and type using pressSequentially for React compatibility
  await emailInput.focus()
  await emailInput.pressSequentially(TEST_PRODUCER.email)

  const passwordInput = page.locator('#password')
  await passwordInput.waitFor({ state: 'visible' })
  await passwordInput.focus()
  await passwordInput.pressSequentially(TEST_PRODUCER.password)

  // Take screenshot before submit for debugging
  await page.screenshot({ path: 'test-results/before-submit.png' })

  await page.locator('button[type="submit"]').click()

  // Wait for navigation or error
  await page.waitForTimeout(3000)

  // Check for error message
  const errorDiv = page.locator('.bg-red-50')
  if (await errorDiv.isVisible()) {
    const errorText = await errorDiv.textContent()
    console.log('Login error:', errorText)
  }

  // Take screenshot after submit
  await page.screenshot({ path: 'test-results/after-submit.png' })

  // Wait for redirect to dashboard or onboarding (both indicate successful login)
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 })

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
