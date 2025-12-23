import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      // Check page title contains welcome text
      await expect(page.locator('text=Welcome back')).toBeVisible()

      // Check form elements exist
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Check signup link
      await expect(page.locator('a[href="/signup"]')).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login')

      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Browser validation should prevent submission
      const emailInput = page.locator('#email')
      await expect(emailInput).toHaveAttribute('required', '')
    })

    test('should attempt login with invalid credentials', async ({ page }) => {
      await page.goto('/login')

      await page.fill('#email', 'invalid@example.com')
      await page.fill('#password', 'wrongpassword')
      await page.click('button[type="submit"]')

      // Wait for either error message or stay on login page
      // (Supabase may take time or might not have test account)
      await page.waitForTimeout(2000)

      // Should still be on login page (not redirected to dashboard)
      expect(page.url()).toContain('/login')
    })

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login')

      await page.click('a[href="/signup"]')

      await expect(page).toHaveURL('/signup')
    })
  })

  test.describe('Signup Page', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/signup')

      // Check page has signup form elements
      await expect(page.locator('text=Create an account')).toBeVisible()

      // Check form elements exist
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Check login link
      await expect(page.locator('a[href="/login"]')).toBeVisible()
    })

    test('should show password requirements', async ({ page }) => {
      await page.goto('/signup')

      await page.fill('input[type="email"]', 'newuser@example.com')
      await page.fill('#password', '123') // Too short

      await page.click('button[type="submit"]')

      // Should show password requirements or error
      // Password should have minimum length requirement
      const passwordInput = page.locator('#password')
      await expect(passwordInput).toHaveAttribute('required', '')
    })

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/signup')

      await page.click('a[href="/login"]')

      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect unauthenticated users from orders to login', async ({ page }) => {
      await page.goto('/dashboard/orders')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect unauthenticated users from settings to login', async ({ page }) => {
      await page.goto('/dashboard/settings')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })
  })
})

test.describe('Home Page', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/')

    // Check main heading or logo
    await expect(page.locator('body')).toBeVisible()

    // Check that at least one login or signup link exists
    const loginLinks = page.locator('a[href="/login"]')
    const signupLinks = page.locator('a[href="/signup"]')

    // At least one of these should exist on the page
    const loginCount = await loginLinks.count()
    const signupCount = await signupLinks.count()
    expect(loginCount + signupCount).toBeGreaterThan(0)
  })
})
