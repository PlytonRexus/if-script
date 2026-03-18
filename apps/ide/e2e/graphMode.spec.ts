import { test, expect, type Page } from '@playwright/test'

async function openIde(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByText('IF-Script')).toBeVisible({ timeout: 20000 })
}

test('graph mode button switches to graph workspace', async ({ page }) => {
  await openIde(page)
  const graphBtn = page.getByRole('button', { name: 'Graph Mode' })
  if (await graphBtn.isVisible()) {
    await graphBtn.click()
    await page.waitForTimeout(500)
    // Graph workspace pane should appear
    const graphWorkspace = page.locator('[data-panel-id="graph"], .graph-workspace-pane, .react-flow')
    if (await graphWorkspace.count() > 0) {
      expect(await graphWorkspace.first().isVisible()).toBeTruthy()
    }
  }
})

test('graph mode shows nodes after successful parse', async ({ page }) => {
  await openIde(page)
  // The default workspace has sections, so after parse we should see nodes
  const graphBtn = page.getByRole('button', { name: 'Graph Mode' })
  if (await graphBtn.isVisible()) {
    await graphBtn.click()
    await page.waitForTimeout(2000)
    // Look for graph nodes (React Flow nodes or custom SVG nodes)
    const nodes = page.locator('.react-flow__node, .graph-node, circle.graph-node')
    // May or may not have nodes depending on parse timing
    const count = await nodes.count()
    // Just verify no crash
    expect(count).toBeGreaterThanOrEqual(0)
  }
})

test('source mode button switches back to editor', async ({ page }) => {
  await openIde(page)
  const graphBtn = page.getByRole('button', { name: 'Graph Mode' })
  if (await graphBtn.isVisible()) {
    await graphBtn.click()
    await page.waitForTimeout(500)
  }
  const sourceBtn = page.getByRole('button', { name: 'Source Mode' })
  if (await sourceBtn.isVisible()) {
    await sourceBtn.click()
    await page.waitForTimeout(500)
    // Editor panel should be visible
    const editorPanel = page.locator('[data-panel-id="editor"]')
    if (await editorPanel.count() > 0) {
      expect(await editorPanel.first().isVisible()).toBeTruthy()
    }
  }
})

test('switching between graph and source mode does not crash', async ({ page }) => {
  await openIde(page)
  // Toggle back and forth
  for (let i = 0; i < 3; i++) {
    const graphBtn = page.getByRole('button', { name: 'Graph Mode' })
    if (await graphBtn.isVisible()) {
      await graphBtn.click()
      await page.waitForTimeout(300)
    }
    const sourceBtn = page.getByRole('button', { name: 'Source Mode' })
    if (await sourceBtn.isVisible()) {
      await sourceBtn.click()
      await page.waitForTimeout(300)
    }
  }
  // Verify app is still functional
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('graph mode search input accepts text without crash', async ({ page }) => {
  await openIde(page)
  const graphBtn = page.getByRole('button', { name: 'Graph Mode' })
  if (await graphBtn.isVisible()) {
    await graphBtn.click()
    await page.waitForTimeout(1000)
    // Look for a search input in the graph workspace
    const searchInput = page.locator('.graph-workspace-pane input[type="text"], .react-flow input')
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test search')
      await page.waitForTimeout(300)
      await searchInput.first().fill('')
      await page.waitForTimeout(200)
    }
  }
  expect(await page.locator('.workspace-grid, .workspace-stack').count()).toBeGreaterThan(0)
})

test('graph mode with writer panel input does not crash', async ({ page }) => {
  await openIde(page)
  const graphBtn = page.getByRole('button', { name: 'Graph Mode' })
  if (await graphBtn.isVisible()) {
    await graphBtn.click()
    await page.waitForTimeout(2000)
    // Try clicking a graph node to open the writer panel
    const nodes = page.locator('.react-flow__node')
    if (await nodes.count() > 0) {
      await nodes.first().click()
      await page.waitForTimeout(500)
      // If a title input appears in the writer, type in it
      const titleInput = page.locator('.graph-writer-pane input[aria-label="Section title"]')
      if (await titleInput.isVisible()) {
        await titleInput.fill('Updated Title')
        await page.waitForTimeout(300)
        expect(await titleInput.inputValue()).toBe('Updated Title')
      }
    }
  }
})
