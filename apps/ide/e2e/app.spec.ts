import { test, expect, type Page } from '@playwright/test'

async function openIde(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByText('IF-Script')).toBeVisible({ timeout: 20000 })
}

test('loads ide shell', async ({ page }) => {
  await openIde(page)
})

test('desktop graph mode focuses on workspace, editor, and playtest panels', async ({ page }) => {
  await openIde(page)
  await expect(page.locator('.workspace-grid')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.workspace-grid [data-panel-id]')).toHaveCount(3)

  const workspaceBox = await page.locator('.workspace-grid [data-panel-id="workspace"]').boundingBox()
  const editorBox = await page.locator('.workspace-grid [data-panel-id="editor"]').boundingBox()
  const previewBox = await page.locator('.workspace-grid [data-panel-id="preview"]').boundingBox()
  expect(previewBox).not.toBeNull()
  expect(workspaceBox).not.toBeNull()
  expect(editorBox).not.toBeNull()
  await expect(page.locator('.workspace-grid [data-panel-id="graph"]')).toHaveCount(0)
  await expect(page.locator('.workspace-grid [data-panel-id="diagnostics"]')).toHaveCount(0)
  await expect(page.locator('.workspace-grid [data-panel-id="runtime"]')).toHaveCount(0)
  await expect(page.locator('.workspace-grid [data-panel-id="timings"]')).toHaveCount(0)
  await expect(page.locator('.workspace-grid [data-panel-id="inspector"]')).toHaveCount(0)
  expect(editorBox?.width ?? 0).toBeGreaterThan(previewBox?.width ?? 0)
  expect(previewBox?.x ?? 0).toBeGreaterThan((editorBox?.x ?? 0) + (editorBox?.width ?? 0) - 10)
})

test('layout changes persist across reload and reset restores default', async ({ page }) => {
  await openIde(page)
  await page.getByRole('button', { name: 'Source Mode' }).click()
  const graphTile = page.locator('.workspace-grid [data-panel-id="graph"]')
  await expect(graphTile).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Reset Layout' }).click()
  await page.waitForTimeout(100)

  const beforeMove = await graphTile.boundingBox()
  expect(beforeMove).not.toBeNull()

  const resizeHandle = graphTile.locator('.react-resizable-handle-se')
  await expect(resizeHandle).toBeVisible()
  const resizeBox = await resizeHandle.boundingBox()
  expect(resizeBox).not.toBeNull()
  await page.mouse.move((resizeBox?.x ?? 0) + (resizeBox?.width ?? 0) / 2, (resizeBox?.y ?? 0) + (resizeBox?.height ?? 0) / 2)
  await page.mouse.down()
  await page.mouse.move((resizeBox?.x ?? 0) + (resizeBox?.width ?? 0) / 2 + 120, (resizeBox?.y ?? 0) + (resizeBox?.height ?? 0) / 2 + 80, { steps: 10 })
  await page.mouse.up()

  const changedBeforeReload = await graphTile.boundingBox()
  expect(changedBeforeReload).not.toBeNull()
  const resized = Math.abs((changedBeforeReload?.width ?? 0) - (beforeMove?.width ?? 0)) > 20
    || Math.abs((changedBeforeReload?.height ?? 0) - (beforeMove?.height ?? 0)) > 20
  expect(resized).toBeTruthy()

  await page.waitForTimeout(450)
  await page.reload()
  await expect(graphTile).toBeVisible()

  const afterReload = await graphTile.boundingBox()
  expect(afterReload).not.toBeNull()
  expect(Math.abs((afterReload?.width ?? 0) - (changedBeforeReload?.width ?? 0))).toBeLessThan(30)
  expect(Math.abs((afterReload?.height ?? 0) - (changedBeforeReload?.height ?? 0))).toBeLessThan(30)

  await page.getByRole('button', { name: 'Reset Layout' }).click()
  await page.waitForTimeout(100)
  const afterReset = await graphTile.boundingBox()
  expect(afterReset).not.toBeNull()
  expect(Math.abs((afterReset?.width ?? 0) - (beforeMove?.width ?? 0))).toBeLessThan(30)
  const resetChangedLayout = Math.abs((afterReset?.width ?? 0) - (changedBeforeReload?.width ?? 0)) > 20
    || Math.abs((afterReset?.height ?? 0) - (changedBeforeReload?.height ?? 0)) > 20
  expect(resetChangedLayout).toBeTruthy()
})

test('mobile viewport keeps stacked static layout', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 })
  await openIde(page)
  await expect(page.locator('.workspace-stack')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.workspace-grid')).toHaveCount(0)
  await expect(page.locator('.workspace-stack [data-panel-id]')).toHaveCount(3)
})

test('preview auto-follow toggle defaults on and persists per workspace', async ({ page }) => {
  await openIde(page)
  const toggle = page.getByLabel('Auto-follow')
  await expect(toggle).toBeVisible({ timeout: 20000 })
  await expect(toggle).toBeChecked()

  await toggle.uncheck()
  await expect(toggle).not.toBeChecked()
  await page.waitForTimeout(450)
  await page.reload()

  const toggleAfterReload = page.getByLabel('Auto-follow')
  await expect(toggleAfterReload).not.toBeChecked()
})
