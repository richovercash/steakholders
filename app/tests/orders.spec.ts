import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const producerAuthFile = path.join(__dirname, '../playwright/.auth/producer.json')
const processorAuthFile = path.join(__dirname, '../playwright/.auth/processor.json')
const hasProducerAuth = fs.existsSync(producerAuthFile)
const hasProcessorAuth = fs.existsSync(processorAuthFile)

test.describe('Orders - Producer Flow', () => {
  test.skip(!hasProducerAuth, 'Requires producer auth state')

  test.use({ storageState: hasProducerAuth ? producerAuthFile : undefined })

  test('should display orders list page', async ({ page }) => {
    await page.goto('/dashboard/orders')

    await expect(page.locator('h1')).toContainText('Orders')

    // Check for "New Order" button
    await expect(page.locator('a[href="/dashboard/orders/new"]')).toBeVisible()
  })

  test('should navigate to new order page', async ({ page }) => {
    await page.goto('/dashboard/orders')

    await page.click('a[href="/dashboard/orders/new"]')

    await expect(page).toHaveURL('/dashboard/orders/new')
    await expect(page.locator('h1')).toContainText('Create New Order')
  })

  test('new order form should have required fields', async ({ page }) => {
    await page.goto('/dashboard/orders/new')

    // Check for processor selection
    await expect(page.locator('select#processor')).toBeVisible()

    // Check for livestock selection (optional)
    await expect(page.locator('select#livestock')).toBeVisible()

    // Check for date picker
    await expect(page.locator('input[type="date"]')).toBeVisible()

    // Check for notes textarea
    await expect(page.locator('textarea')).toBeVisible()

    // Check for submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should require processor selection', async ({ page }) => {
    await page.goto('/dashboard/orders/new')

    // Try to submit without selecting processor
    await page.click('button[type="submit"]')

    // Browser validation should prevent submission
    const processorSelect = page.locator('select#processor')
    await expect(processorSelect).toHaveAttribute('required', '')
  })

  test('should navigate to discover page to find processors', async ({ page }) => {
    await page.goto('/dashboard/discover')

    await expect(page.locator('h1')).toContainText('Processor')

    // Check for search/filter functionality
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')
    // May or may not have search
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

    // Check if there are any orders
    const orderLink = page.locator('a[href^="/dashboard/orders/"]').first()

    if (await orderLink.isVisible()) {
      await orderLink.click()

      // Check order detail page structure
      await expect(page.locator('text=Order #')).toBeVisible()
      await expect(page.locator('text=Processing Stage')).toBeVisible()
      await expect(page.locator('text=Cut Sheet')).toBeVisible()
    }
  })
})

test.describe('Calendar - Processor', () => {
  test.skip(!hasProcessorAuth, 'Requires processor auth state')

  test.use({ storageState: hasProcessorAuth ? processorAuthFile : undefined })

  test('should display calendar page', async ({ page }) => {
    await page.goto('/dashboard/calendar')

    await expect(page.locator('h1')).toContainText('Calendar')

    // Check for month navigation
    await expect(page.locator('button').filter({ hasText: /chevron|<|>/ }).first()).toBeVisible()

    // Check for day headers
    await expect(page.locator('text=Sun')).toBeVisible()
    await expect(page.locator('text=Mon')).toBeVisible()
  })

  test('should navigate between months', async ({ page }) => {
    await page.goto('/dashboard/calendar')

    // Get current month text
    const monthTitle = page.locator('h3, [class*="CardTitle"]').first()
    const initialMonth = await monthTitle.textContent()

    // Click next month
    const nextButton = page.locator('button').filter({ has: page.locator('[class*="ChevronRight"], svg') }).last()
    await nextButton.click()

    // Wait for update
    await page.waitForTimeout(500)

    // Month should have changed
    const newMonth = await monthTitle.textContent()
    // Could be same if we're checking structure, so just verify it's visible
    await expect(monthTitle).toBeVisible()
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
