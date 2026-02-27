import { test, expect } from '@playwright/test'

test('loads ide shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('IF-Script IDE')).toBeVisible()
})
