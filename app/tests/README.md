# Steakholders E2E Tests

End-to-end tests using Playwright.

## Quick Start

```bash
# 1. Set up test accounts (first time only)
npm run test:setup

# 2. Run all tests
npm run test

# 3. View test report
npm run test:report
```

## Test Accounts

Tests use two accounts: a Producer and a Processor. These are created automatically by `test:setup`.

### Creating Test Accounts

```bash
npm run test:setup
```

This runs in headed mode so you can watch/debug if signup fails.

### Credentials

Test accounts use Gmail aliases (emails go to your main inbox):
- Producer: `your-email+testproducer@gmail.com`
- Processor: `your-email+testprocessor@gmail.com`

Update `tests/.env.test` with your email base.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run test` | Run all tests headlessly |
| `npm run test:ui` | Open Playwright UI for interactive testing |
| `npm run test:headed` | Run tests with visible browser |
| `npm run test:debug` | Run with Playwright inspector |
| `npm run test:setup` | Create/verify test accounts |
| `npm run test:report` | View HTML test report |

## Test Files

| File | Description |
|------|-------------|
| `auth.setup.ts` | Authentication setup (logs in before tests) |
| `auth.spec.ts` | Login/logout tests |
| `dashboard.spec.ts` | Dashboard functionality tests |
| `orders.spec.ts` | Order creation and management tests |
| `notifications.spec.ts` | Notification system tests |
| `create-test-accounts.spec.ts` | Utility to create test accounts |

## Configuration

### Environment Variables

Copy `.env.test.example` to `.env.test`:

```bash
cp tests/.env.test.example tests/.env.test
```

Edit with your test account credentials.

### Playwright Config

See `playwright.config.ts` for:
- Browser configurations (Chromium, Firefox, Mobile)
- Base URL settings
- Authentication state handling
- Retry and timeout settings

## Writing Tests

### Using Auth State

Tests that need authentication should depend on the setup project:

```typescript
// playwright.config.ts
{
  name: 'chromium',
  use: { ...devices['Desktop Chrome'] },
  dependencies: ['setup'],  // Runs auth.setup.ts first
}
```

### Using Saved Auth

```typescript
import { test } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/producer.json' })

test('producer can view dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  // Already logged in as producer
})
```

## CI/CD

In CI environments:
- Set `CI=true` to enable retries and single worker
- Provide test credentials via environment variables
- Consider using a dedicated test database

```yaml
# GitHub Actions example
env:
  TEST_PRODUCER_EMAIL: ${{ secrets.TEST_PRODUCER_EMAIL }}
  TEST_PRODUCER_PASSWORD: ${{ secrets.TEST_PRODUCER_PASSWORD }}
  TEST_PROCESSOR_EMAIL: ${{ secrets.TEST_PROCESSOR_EMAIL }}
  TEST_PROCESSOR_PASSWORD: ${{ secrets.TEST_PROCESSOR_PASSWORD }}
```
