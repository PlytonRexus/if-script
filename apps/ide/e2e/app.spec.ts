import { test, expect, type Page } from '@playwright/test'

async function openIde(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByText('IF-Script')).toBeVisible({ timeout: 20000 })
}

test('loads ide shell', async ({ page }) => {
  await openIde(page)
})

test('desktop uses draggable grid with full-width preview at the bottom', async ({ page }) => {
  await openIde(page)
  await expect(page.locator('.workspace-grid')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.workspace-grid [data-panel-id]')).toHaveCount(7)

  const previewBox = await page.locator('.workspace-grid [data-panel-id="preview"]').boundingBox()
  const graphBox = await page.locator('.workspace-grid [data-panel-id="graph"]').boundingBox()
  const diagnosticsBox = await page.locator('.workspace-grid [data-panel-id="diagnostics"]').boundingBox()
  const timingsBox = await page.locator('.workspace-grid [data-panel-id="timings"]').boundingBox()
  expect(previewBox).not.toBeNull()
  expect(graphBox).not.toBeNull()
  expect(diagnosticsBox).not.toBeNull()
  expect(timingsBox).not.toBeNull()
  expect(previewBox?.width ?? 0).toBeGreaterThan((graphBox?.width ?? 0) * 2)
  expect(previewBox?.y ?? 0).toBeGreaterThanOrEqual((timingsBox?.y ?? 0) + (timingsBox?.height ?? 0) - 10)
  expect((graphBox?.width ?? 0) * (graphBox?.height ?? 0)).toBeGreaterThan((diagnosticsBox?.width ?? 0) * (diagnosticsBox?.height ?? 0))
})

test('layout changes persist across reload and reset restores default', async ({ page }) => {
  await openIde(page)
  const graphTile = page.locator('.workspace-grid [data-panel-id="graph"]')
  await expect(graphTile).toBeVisible({ timeout: 20000 })

  const beforeMove = await graphTile.boundingBox()
  expect(beforeMove).not.toBeNull()

  const header = graphTile.locator('.panel-header')
  await expect(header).toBeVisible()
  await header.dragTo(page.locator('.workspace-grid [data-panel-id="editor"] .panel-header'))

  const resizeHandle = graphTile.locator('.react-resizable-handle-se')
  await expect(resizeHandle).toBeVisible()
  const resizeBox = await resizeHandle.boundingBox()
  expect(resizeBox).not.toBeNull()

  const changedBeforeReload = await graphTile.boundingBox()
  expect(changedBeforeReload).not.toBeNull()
  const moved = Math.abs((changedBeforeReload?.x ?? 0) - (beforeMove?.x ?? 0)) > 5
    || Math.abs((changedBeforeReload?.y ?? 0) - (beforeMove?.y ?? 0)) > 5
  expect(moved).toBeTruthy()

  await page.waitForTimeout(450)
  await page.reload()
  await expect(graphTile).toBeVisible()

  const afterReload = await graphTile.boundingBox()
  expect(afterReload).not.toBeNull()
  expect(Math.abs((afterReload?.x ?? 0) - (changedBeforeReload?.x ?? 0))).toBeLessThan(25)
  expect(Math.abs((afterReload?.y ?? 0) - (changedBeforeReload?.y ?? 0))).toBeLessThan(25)
  expect(Math.abs((afterReload?.height ?? 0) - (changedBeforeReload?.height ?? 0))).toBeLessThan(30)

  await page.getByRole('button', { name: 'Reset Layout' }).click()
  await page.waitForTimeout(100)
  const afterReset = await graphTile.boundingBox()
  expect(afterReset).not.toBeNull()
  expect(Math.abs((afterReset?.y ?? 0) - (beforeMove?.y ?? 0))).toBeLessThan(25)
})

test('mobile viewport keeps stacked static layout', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 })
  await openIde(page)
  await expect(page.locator('.workspace-stack')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.workspace-grid')).toHaveCount(0)
  await expect(page.locator('.workspace-stack [data-panel-id]')).toHaveCount(7)
})
