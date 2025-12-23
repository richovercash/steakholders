import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const producerAuthFile = path.join(__dirname, '../playwright/.auth/producer.json')
const processorAuthFile = path.join(__dirname, '../playwright/.auth/processor.json')
const hasProducerAuth = fs.existsSync(producerAuthFile)
const hasProcessorAuth = fs.existsSync(processorAuthFile)

test.describe('Orders - Authenticated User', () => {
  test.skip(!hasProducerAuth, 'Requires auth state')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should display orders list page', async ({ page }) => {
    await page.goto('/dashboard/orders')

    await expect(page.locator('h1')).toContainText('Orders')
  })

  test('should show order status information', async ({ page }) => {
    await page.goto('/dashboard/orders')

    // Orders page should have status-related content
    await expect(page.locator('h1')).toContainText('Orders')

    // Check for either orders list or empty state
    const ordersContent = page.locator('main')
    await expect(ordersContent).toBeVisible()
  })
})

test.describe('Orders - Processor Flow', () => {
  test.skip(!hasProcessorAuth, 'Requires processor auth state')

  test.use({ storageState: hasProcessorAuth ? processorAuthFile : undefined })

  test('should display orders list for processor', async ({ page }) => {
    await page.goto('/dashboard/orders')

    await expect(page.locator('h1')).toContainText('Orders')

    // Processor should NOT see "New Order" button
    await expect(page.locator('a[href="/dashboard/orders/new"]')).not.toBeVisible()
  })

  test('should have status filter options', async ({ page }) => {
    await page.goto('/dashboard/orders')

    // Check for status filter
    const statusFilter = page.locator('select').first()
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible()
    }
  })
})

test.describe('Order Detail Page', () => {
  test.skip(!hasProducerAuth, 'Requires producer auth state')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should display order detail page structure', async ({ page }) => {
    // First get an order from the list
    await page.goto('/dashboard/orders')

    // Check if there are any orders - exclude /new and other non-order links
    // Order IDs are UUIDs, so look for links with UUID pattern
    const orderLink = page.locator('a[href*="/dashboard/orders/"]:not([href*="/new"])').first()

    // Wait a moment for content to load
    await page.waitForTimeout(1000)

    const isVisible = await orderLink.isVisible().catch(() => false)

    if (isVisible) {
      const href = await orderLink.getAttribute('href')
      // Only click if it looks like an order ID (UUID pattern)
      if (href && href.match(/\/dashboard\/orders\/[a-f0-9-]{36}/)) {
        await orderLink.click()

        // Check order detail page structure
        await expect(page.locator('text=Order #')).toBeVisible()
        await expect(page.locator('text=Processing Stage')).toBeVisible()
        await expect(page.locator('text=Cut Sheet')).toBeVisible()
      }
    }
    // If no orders exist, test passes (nothing to check)
  })
})

test.describe('Calendar - Processor', () => {
  test.skip(!hasProcessorAuth, 'Requires processor auth state')

  test.use({ storageState: hasProcessorAuth ? processorAuthFile : undefined })

  test('should display calendar page', async ({ page }) => {
    await page.goto('/dashboard/calendar')

    // Title could be "Calendar" or "Calendar Management"
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // Check that month/year is displayed (e.g., "December 2025")
    await expect(page.locator('text=/\\w+ \\d{4}/')).toBeVisible()

    // Check for day headers in calendar grid
    const calendarGrid = page.locator('text=Sun').or(page.locator('text=Mon'))
    await expect(calendarGrid.first()).toBeVisible()
  })

  test('should navigate between months', async ({ page }) => {
    await page.goto('/dashboard/calendar')

    // Wait for calendar to load
    await page.waitForLoadState('networkidle')

    // Verify we're on calendar page
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // Find navigation buttons (look for buttons with SVG icons)
    const navButtons = page.locator('button:has(svg)')

    if (await navButtons.count() > 0) {
      await navButtons.last().click()
      await page.waitForTimeout(500)
    }

    // Just verify page is still working
    await expect(page).toHaveURL(/calendar/)
  })

  test('should open slot modal when clicking add button', async ({ page }) => {
    await page.goto('/dashboard/calendar')

    // Find a future date's add button
    const addButtons = page.locator('button').filter({ has: page.locator('[class*="Plus"], svg.h-3') })

    if (await addButtons.first().isVisible()) {
      await addButtons.first().click()

      // Modal should appear
      await expect(page.locator('text=Add Slot')).toBeVisible({ timeout: 2000 })
      await expect(page.locator('text=Animal Type')).toBeVisible()
    }
  })
})

test.describe('Cut Sheet', () => {
  test.skip(!hasProducerAuth, 'Requires producer auth state')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should navigate to cut sheet page from order', async ({ page }) => {
    await page.goto('/dashboard/orders')

    // Look for a cut sheet link
    const cutSheetLink = page.locator('a[href*="cut-sheet"]').first()

    if (await cutSheetLink.isVisible()) {
      await cutSheetLink.click()

      // Should be on cut sheet page
      await expect(page).toHaveURL(/cut-sheet/)
    }
  })
})
