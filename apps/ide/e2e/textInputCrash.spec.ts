import { test, expect, type Page } from '@playwright/test'

async function openIde(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByText('IF-Script')).toBeVisible({ timeout: 20000 })
}

function rapidChars(count: number): string {
  return 'abcdefghijklmnopqrstuvwxyz'.repeat(Math.ceil(count / 26)).slice(0, count)
}

test('rapid typing in Monaco editor does not crash', async ({ page }) => {
  await openIde(page)
  const editor = page.locator('.monaco-editor textarea').first()
  await expect(editor).toBeVisible({ timeout: 20000 })
  await editor.focus()
  // Type 50 characters rapidly
  await page.keyboard.type(rapidChars(50), { delay: 10 })
  await page.waitForTimeout(500)
  // App should still be functional
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('rapid typing in sidebar filter does not crash', async ({ page }) => {
  await openIde(page)
  const sectionsBtn = page.getByRole('button', { name: 'Sections' })
  if (await sectionsBtn.isVisible()) {
    await sectionsBtn.click()
    const filter = page.getByPlaceholder('Filter sections...')
    if (await filter.isVisible()) {
      await filter.type(rapidChars(30), { delay: 10 })
      await page.waitForTimeout(300)
    }
  }
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('rapid typing in command palette search does not crash', async ({ page }) => {
  await openIde(page)
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(500)
  const paletteInput = page.locator('.command-palette input')
  if (await paletteInput.isVisible()) {
    await paletteInput.type(rapidChars(30), { delay: 10 })
    await page.waitForTimeout(300)
  }
  await page.keyboard.press('Escape')
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('rapid typing in inspector text fields does not crash', async ({ page }) => {
  await openIde(page)
  // Switch to Source mode to get the inspector panel
  const sourceBtn = page.getByRole('button', { name: 'Source Mode' })
  if (await sourceBtn.isVisible()) {
    await sourceBtn.click()
    await page.waitForTimeout(500)
  }
  const inspectorPanel = page.locator('[data-panel-id="inspector"]')
  if (await inspectorPanel.count() > 0 && await inspectorPanel.isVisible()) {
    const inputs = inspectorPanel.locator('input[type="text"], input:not([type])')
    const count = await inputs.count()
    if (count > 0) {
      await inputs.first().focus()
      await page.keyboard.type(rapidChars(20), { delay: 10 })
      await page.waitForTimeout(200)
    }
  }
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('paste large text into Monaco editor does not crash', async ({ page }) => {
  await openIde(page)
  const editor = page.locator('.monaco-editor textarea').first()
  await expect(editor).toBeVisible({ timeout: 20000 })
  await editor.focus()
  // Select all and paste large text
  await page.keyboard.press('Control+a')
  const largeText = 'section "PasteTest"\n' + '  "Line of text for testing."\n'.repeat(50) + 'end\n'
  await page.keyboard.insertText(largeText)
  await page.waitForTimeout(1000)
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('type special characters into Monaco editor does not crash', async ({ page }) => {
  await openIde(page)
  const editor = page.locator('.monaco-editor textarea').first()
  await expect(editor).toBeVisible({ timeout: 20000 })
  await editor.focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.type('section "Test"\n  "Quotes: \' and \\""\n  "Backslash: \\\\"\nend\n', { delay: 20 })
  await page.waitForTimeout(500)
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('open command palette, type, close, reopen, type again: no crash', async ({ page }) => {
  await openIde(page)
  // First open
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(400)
  const paletteInput = page.locator('.command-palette input')
  if (await paletteInput.isVisible()) {
    await paletteInput.type('hello', { delay: 30 })
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // Second open
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(400)
  if (await paletteInput.isVisible()) {
    await paletteInput.type('world', { delay: 30 })
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('rapid variable override input typing does not crash', async ({ page }) => {
  await openIde(page)
  // Look for the preview pane with variable override inputs
  const previewPanel = page.locator('[data-panel-id="preview"]')
  if (await previewPanel.count() > 0 && await previewPanel.isVisible()) {
    const overrideInputs = previewPanel.locator('input[type="text"], input:not([type])')
    const count = await overrideInputs.count()
    if (count > 0) {
      await overrideInputs.first().focus()
      await page.keyboard.type(rapidChars(20), { delay: 10 })
      await page.waitForTimeout(200)
    }
  }
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})
