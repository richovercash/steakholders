import { test, expect } from '@playwright/test'

// Test account credentials - use Gmail + aliases of your email
// These will all go to the same inbox but be treated as different accounts
const TEST_PRODUCER = {
  email: process.env.TEST_NEW_PRODUCER_EMAIL || 'richovercash+testproducer@gmail.com',
  password: 'TestProducer123!',
  fullName: 'Test Producer',
  orgName: 'Test Farm LLC',
  farmName: 'Green Pastures',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  phone: '(512) 555-0101',
}

const TEST_PROCESSOR = {
  email: process.env.TEST_NEW_PROCESSOR_EMAIL || 'richovercash+testprocessor@gmail.com',
  password: 'TestProcessor123!',
  fullName: 'Test Processor',
  orgName: 'Test Meat Processing',
  licenseNumber: 'USDA-12345',
  licenseType: 'usda',
  capacity: '20',
  city: 'Dallas',
  state: 'TX',
  zip: '75201',
  phone: '(214) 555-0202',
}

async function tryLogin(page: import('@playwright/test').Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Wait for navigation
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 })
    return true
  } catch {
    return false
  }
}

async function createAccount(
  page: import('@playwright/test').Page,
  account: typeof TEST_PRODUCER | typeof TEST_PROCESSOR,
  type: 'producer' | 'processor'
): Promise<void> {
  await page.goto('/signup')
  await page.waitForLoadState('networkidle')

  // Fill signup form
  await page.locator('#fullName').fill(account.fullName)
  await page.locator('#email').fill(account.email)
  await page.locator('#password').fill(account.password)
  await page.locator('#confirmPassword').fill(account.password)

  // Submit
  await page.locator('button[type="submit"]').click()

  // Wait for navigation to onboarding
  await page.waitForURL('**/onboarding', { timeout: 15000 })

  // Select account type
  await page.locator(`text=${type === 'producer' ? 'Producer' : 'Processor'}`).first().click()

  // Wait for form to appear
  await page.waitForSelector('#orgName')

  // Fill organization details
  await page.locator('#orgName').fill(account.orgName)

  if (type === 'producer') {
    const producer = account as typeof TEST_PRODUCER
    await page.locator('#farmName').fill(producer.farmName)
  } else {
    const processor = account as typeof TEST_PROCESSOR
    await page.locator('#licenseNumber').fill(processor.licenseNumber)
    await page.locator('#licenseType').selectOption(processor.licenseType)
    await page.locator('#capacityPerWeek').fill(processor.capacity)
  }

  await page.locator('#email').fill(account.email)
  await page.locator('#phone').fill(account.phone)
  await page.locator('#city').fill(account.city)
  await page.locator('#state').fill(account.state)
  await page.locator('#zip').fill(account.zip)

  // Submit
  await page.locator('button[type="submit"]').click()

  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe.serial('Create Test Accounts', () => {
  test('create or login producer test account', async ({ page }) => {
    // First try to login
    console.log(`Trying to login as producer: ${TEST_PRODUCER.email}`)

    const loginSucceeded = await tryLogin(page, TEST_PRODUCER.email, TEST_PRODUCER.password)

    if (loginSucceeded) {
      console.log('Producer account exists, logged in successfully')
    } else {
      console.log('Producer account does not exist, creating...')
      await createAccount(page, TEST_PRODUCER, 'producer')
      console.log('Producer account created successfully')
    }

    await expect(page.locator('h1')).toContainText('Welcome')

    // Save auth state
    await page.context().storageState({ path: 'playwright/.auth/producer.json' })
    console.log('Producer auth state saved to playwright/.auth/producer.json')
  })

  test('create or login processor test account', async ({ page }) => {
    // First try to login
    console.log(`Trying to login as processor: ${TEST_PROCESSOR.email}`)

    const loginSucceeded = await tryLogin(page, TEST_PROCESSOR.email, TEST_PROCESSOR.password)

    if (loginSucceeded) {
      console.log('Processor account exists, logged in successfully')
    } else {
      console.log('Processor account does not exist, creating...')
      await createAccount(page, TEST_PROCESSOR, 'processor')
      console.log('Processor account created successfully')
    }

    await expect(page.locator('h1')).toContainText('Welcome')

    // Save auth state
    await page.context().storageState({ path: 'playwright/.auth/processor.json' })
    console.log('Processor auth state saved to playwright/.auth/processor.json')
  })
})

// Print account info at the end
test('print test account credentials', async () => {
  console.log('\n=== Test Account Credentials ===')
  console.log('\nPRODUCER:')
  console.log(`  Email: ${TEST_PRODUCER.email}`)
  console.log(`  Password: ${TEST_PRODUCER.password}`)
  console.log('\nPROCESSOR:')
  console.log(`  Email: ${TEST_PROCESSOR.email}`)
  console.log(`  Password: ${TEST_PROCESSOR.password}`)
  console.log('\nTo run all tests with these accounts:')
  console.log(`TEST_PRODUCER_EMAIL='${TEST_PRODUCER.email}' \\`)
  console.log(`TEST_PRODUCER_PASSWORD='${TEST_PRODUCER.password}' \\`)
  console.log(`TEST_PROCESSOR_EMAIL='${TEST_PROCESSOR.email}' \\`)
  console.log(`TEST_PROCESSOR_PASSWORD='${TEST_PROCESSOR.password}' \\`)
  console.log('npx playwright test')
  console.log('================================\n')
})
