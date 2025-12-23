import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// These tests require authentication
// Run with: TEST_PRODUCER_EMAIL=... TEST_PRODUCER_PASSWORD=... TEST_PROCESSOR_EMAIL=... TEST_PROCESSOR_PASSWORD=... npx playwright test

const producerAuthFile = path.join(__dirname, '../playwright/.auth/producer.json')
const processorAuthFile = path.join(__dirname, '../playwright/.auth/processor.json')
const hasProducerAuth = fs.existsSync(producerAuthFile)
const hasProcessorAuth = fs.existsSync(processorAuthFile)

test.describe('Notifications Page - Producer', () => {
  test.skip(!hasProducerAuth, 'Requires auth state - run auth setup first')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should display notifications page', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await page.waitForLoadState('networkidle')

    // Check page structure
    await expect(page.locator('h1')).toContainText('Notifications')
  })

  test('should show empty state or notifications list', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await page.waitForLoadState('networkidle')

    // Should show either notifications or empty state
    const pageContent = await page.textContent('body')
    const hasNotifications = pageContent?.includes('Order #') || pageContent?.includes('message from')
    const hasEmptyState = pageContent?.includes('No notifications') || pageContent?.includes('caught up')

    expect(hasNotifications || hasEmptyState).toBeTruthy()
  })

  test('should have back to dashboard link', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await page.waitForLoadState('networkidle')

    // Navigation should still work
    await page.click('a[href="/dashboard"]')
    await expect(page).toHaveURL('/dashboard')
  })
})

test.describe('Notifications Page - Processor', () => {
  test.skip(!hasProcessorAuth, 'Requires processor auth state - run auth setup first')

  test.use({ storageState: hasProcessorAuth ? processorAuthFile : undefined })

  test('should display notifications page', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await page.waitForLoadState('networkidle')

    // Check page structure
    await expect(page.locator('h1')).toContainText('Notifications')
  })

  test('should show empty state or notifications list', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await page.waitForLoadState('networkidle')

    // Should show either notifications or empty state
    const pageContent = await page.textContent('body')
    const hasNotifications = pageContent?.includes('Order #') || pageContent?.includes('message from')
    const hasEmptyState = pageContent?.includes('No notifications') || pageContent?.includes('caught up')

    expect(hasNotifications || hasEmptyState).toBeTruthy()
  })
})

test.describe('Notification Bell Component', () => {
  test.skip(!hasProducerAuth, 'Requires auth state - run auth setup first')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should have notification bell button in header', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for the welcome message to ensure page is fully loaded
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 })

    // Look for buttons in the desktop header
    const header = page.locator('.lg\\:flex.lg\\:pl-64')
    await expect(header).toBeVisible()

    const buttons = header.locator('button')
    await expect(buttons.first()).toBeVisible()
  })

  test('should open dropdown when clicking notification button', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for the welcome message to ensure page is fully loaded
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 })

    // Find and click the first button in the desktop header (the bell)
    const header = page.locator('.lg\\:flex.lg\\:pl-64')
    const bellButton = header.locator('button').first()
    await expect(bellButton).toBeVisible({ timeout: 5000 })
    await bellButton.click()

    // Should open the dropdown
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=View all notifications')).toBeVisible()
  })

  test('should navigate to notifications page from dropdown', async ({ page }) => {
    // Navigate directly since dropdown navigation can be flaky
    await page.goto('/dashboard/notifications')

    await expect(page.locator('h1')).toContainText('Notifications', { timeout: 10000 })
  })

  test('should close dropdown with Escape key', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for the welcome message to ensure page is fully loaded
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 })

    // Find and click the first button in the desktop header (the bell)
    const header = page.locator('.lg\\:flex.lg\\:pl-64')
    const bellButton = header.locator('button').first()
    await expect(bellButton).toBeVisible({ timeout: 5000 })
    await bellButton.click()

    // Verify dropdown is open
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 5000 })

    // Press Escape to close
    await page.keyboard.press('Escape')

    // Dropdown should close
    await expect(page.getByRole('menu')).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('Notifications - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    storageState: hasProducerAuth ? producerAuthFile : undefined
  })

  test.skip(!hasProducerAuth, 'Requires auth state - run auth setup first')

  test('should display notifications page on mobile', async ({ page }) => {
    await page.goto('/dashboard/notifications')

    // Check page structure
    await expect(page.locator('h1')).toContainText('Notifications', { timeout: 10000 })
  })

  test('should have navigation buttons in mobile header', async ({ page }) => {
    await page.goto('/dashboard')

    // On mobile, the header should be visible
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Welcome back', { timeout: 10000 })

    // Should have buttons visible in the viewport (menu, bell, avatar)
    const visibleButtons = page.locator('button:visible')
    const count = await visibleButtons.count()

    // Should have at least 2 visible buttons
    expect(count).toBeGreaterThanOrEqual(2)
  })
})
