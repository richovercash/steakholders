import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// These tests require authentication
// Run with: TEST_PRODUCER_EMAIL=... TEST_PRODUCER_PASSWORD=... npx playwright test

const producerAuthFile = path.join(__dirname, '../playwright/.auth/producer.json')
const processorAuthFile = path.join(__dirname, '../playwright/.auth/processor.json')
const hasProducerAuth = fs.existsSync(producerAuthFile)
const hasProcessorAuth = fs.existsSync(processorAuthFile)

test.describe('Dashboard - Authenticated User', () => {
  test.skip(!hasProducerAuth, 'Requires auth state - run auth setup first')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should display dashboard with welcome message', async ({ page }) => {
    await page.goto('/dashboard')

    // Check welcome message (works for both producer and processor)
    await expect(page.locator('h1')).toContainText('Welcome back')

    // Check stats cards exist
    await expect(page.locator('text=Active Orders')).toBeVisible()
    await expect(page.locator('text=Unread Messages')).toBeVisible()
  })

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on Orders in navigation
    await page.click('a[href="/dashboard/orders"]')

    await expect(page).toHaveURL('/dashboard/orders')
    await expect(page.locator('h1')).toContainText('Orders')
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/dashboard')

    await page.click('a[href="/dashboard/settings"]')

    await expect(page).toHaveURL('/dashboard/settings')
    await expect(page.locator('h1')).toContainText('Settings')
  })

  test('should navigate to messages page', async ({ page }) => {
    await page.goto('/dashboard')

    await page.click('a[href="/dashboard/messages"]')

    await expect(page).toHaveURL('/dashboard/messages')
  })
})

test.describe('Dashboard - Processor', () => {
  test.skip(!hasProcessorAuth, 'Requires processor auth state - run auth setup first')

  test.use({ storageState: hasProcessorAuth ? processorAuthFile : undefined })

  test('should display processor dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Check welcome message
    await expect(page.locator('h1')).toContainText('Welcome back')

    // Check stats cards - processor sees "This Week" instead of "Livestock"
    await expect(page.locator('text=Active Orders')).toBeVisible()
    await expect(page.locator('text=This Week')).toBeVisible()
  })

  test('should navigate to calendar page', async ({ page }) => {
    await page.goto('/dashboard')

    await page.click('a[href="/dashboard/calendar"]')

    await expect(page).toHaveURL('/dashboard/calendar')
    await expect(page.locator('h1')).toContainText('Calendar')
  })

  test('should display pending orders section if orders exist', async ({ page }) => {
    await page.goto('/dashboard')

    // Check if pending orders section exists (may or may not have orders)
    const pendingSection = page.locator('text=Pending Orders')

    // This is conditional - only check structure if section exists
    if (await pendingSection.isVisible()) {
      await expect(page.locator('text=awaiting confirmation')).toBeVisible()
    }
  })

  test('should have processor settings available', async ({ page }) => {
    await page.goto('/dashboard/settings')

    // Check for processor-specific settings section
    await expect(page.locator('text=Processor Settings')).toBeVisible()
    await expect(page.locator('text=Services Offered')).toBeVisible()
    await expect(page.locator('text=Weekly Capacity')).toBeVisible()
  })
})

test.describe('Navigation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.goto('/login')

    // Check page is responsive
    await expect(page.locator('input[type="email"]')).toBeVisible()

    // Form should stack vertically on mobile
    const form = page.locator('form')
    await expect(form).toBeVisible()
  })
})
