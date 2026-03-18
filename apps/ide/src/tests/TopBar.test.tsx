import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderTopBar } from './helpers/renderHelpers'

afterEach(() => cleanup())

describe('TopBar', () => {
  it('renders project name', () => {
    renderTopBar({ projectName: 'My Story' })
    expect(screen.getByText('My Story')).toBeTruthy()
  })

  it('renders parse status pill with idle status', () => {
    renderTopBar({ parseStatus: 'idle' })
    expect(screen.getByText('Parse: idle')).toBeTruthy()
    expect(screen.getByText('Parse: idle').className).toContain('status-idle')
  })

  it('renders parse status pill with running status', () => {
    renderTopBar({ parseStatus: 'running' })
    expect(screen.getByText('Parse: running')).toBeTruthy()
    expect(screen.getByText('Parse: running').className).toContain('status-running')
  })

  it('renders parse status pill with error status', () => {
    renderTopBar({ parseStatus: 'error' })
    expect(screen.getByText('Parse: error')).toBeTruthy()
    expect(screen.getByText('Parse: error').className).toContain('status-error')
  })

  it('renders parse status pill with ok status', () => {
    renderTopBar({ parseStatus: 'ok' })
    expect(screen.getByText('Parse: ok')).toBeTruthy()
    expect(screen.getByText('Parse: ok').className).toContain('status-ok')
  })

  it('renders diagnostics count', () => {
    renderTopBar({ diagnosticsCount: 7 })
    expect(screen.getByText('Diagnostics: 7')).toBeTruthy()
  })

  it('New button fires onNewFile', () => {
    const onNewFile = vi.fn()
    renderTopBar({ onNewFile })
    fireEvent.click(screen.getByText('New'))
    expect(onNewFile).toHaveBeenCalledOnce()
  })

  it('Rename button fires onRenameFile', () => {
    const onRenameFile = vi.fn()
    renderTopBar({ onRenameFile })
    fireEvent.click(screen.getByText('Rename'))
    expect(onRenameFile).toHaveBeenCalledOnce()
  })

  it('Delete button fires onDeleteFile', () => {
    const onDeleteFile = vi.fn()
    renderTopBar({ onDeleteFile })
    fireEvent.click(screen.getByText('Delete'))
    expect(onDeleteFile).toHaveBeenCalledOnce()
  })

  it('Check button fires onRunCheck', () => {
    const onRunCheck = vi.fn()
    renderTopBar({ onRunCheck })
    fireEvent.click(screen.getByText('Check'))
    expect(onRunCheck).toHaveBeenCalledOnce()
  })

  it('Playtest button fires onPlaytest', () => {
    const onPlaytest = vi.fn()
    renderTopBar({ onPlaytest })
    fireEvent.click(screen.getByText('Playtest'))
    expect(onPlaytest).toHaveBeenCalledOnce()
  })

  it('Save button fires onSaveLocal', () => {
    const onSaveLocal = vi.fn()
    renderTopBar({ onSaveLocal })
    fireEvent.click(screen.getByText('Save'))
    expect(onSaveLocal).toHaveBeenCalledOnce()
  })

  it('Open Folder button fires onOpenFolder', () => {
    const onOpenFolder = vi.fn()
    renderTopBar({ onOpenFolder })
    fireEvent.click(screen.getByText('Open Folder'))
    expect(onOpenFolder).toHaveBeenCalledOnce()
  })

  it('Write Folder button fires onWriteFolder', () => {
    const onWriteFolder = vi.fn()
    renderTopBar({ onWriteFolder })
    fireEvent.click(screen.getByText('Write Folder'))
    expect(onWriteFolder).toHaveBeenCalledOnce()
  })

  it('Import button fires onImportBundle', () => {
    const onImportBundle = vi.fn()
    renderTopBar({ onImportBundle })
    fireEvent.click(screen.getByText('Import'))
    expect(onImportBundle).toHaveBeenCalledOnce()
  })

  it('Export button fires onExportBundle', () => {
    const onExportBundle = vi.fn()
    renderTopBar({ onExportBundle })
    fireEvent.click(screen.getByText('Export'))
    expect(onExportBundle).toHaveBeenCalledOnce()
  })

  it('Reset Layout button fires onResetLayout', () => {
    const onResetLayout = vi.fn()
    renderTopBar({ onResetLayout })
    fireEvent.click(screen.getByText('Reset Layout'))
    expect(onResetLayout).toHaveBeenCalledOnce()
  })

  it('Theme button fires onToggleTheme', () => {
    const onToggleTheme = vi.fn()
    renderTopBar({ onToggleTheme })
    fireEvent.click(screen.getByText('Theme'))
    expect(onToggleTheme).toHaveBeenCalledOnce()
  })

  it('Palette button fires onCommandPalette', () => {
    const onCommandPalette = vi.fn()
    renderTopBar({ onCommandPalette })
    fireEvent.click(screen.getByText('Palette'))
    expect(onCommandPalette).toHaveBeenCalledOnce()
  })

  it('Author mode toggle fires onToggleAuthorMode', () => {
    const onToggleAuthorMode = vi.fn()
    renderTopBar({ onToggleAuthorMode, authorMode: 'source' })
    fireEvent.click(screen.getByText('Graph Mode'))
    expect(onToggleAuthorMode).toHaveBeenCalledOnce()
  })

  it('shows Source Mode text when authorMode is graph', () => {
    renderTopBar({ authorMode: 'graph' })
    expect(screen.getByText('Source Mode')).toBeTruthy()
  })

  it('shows Graph Mode text when authorMode is source', () => {
    renderTopBar({ authorMode: 'source' })
    expect(screen.getByText('Graph Mode')).toBeTruthy()
  })

  it('renders panel toggle buttons with active class for visible panels', () => {
    renderTopBar({
      panelToggleItems: [
        { id: 'editor', label: 'Editor', visible: true },
        { id: 'preview', label: 'Preview', visible: false }
      ]
    })
    const editorBtn = screen.getByText('Editor')
    const previewBtn = screen.getByText('Preview')
    expect(editorBtn.className).toContain('active')
    expect(previewBtn.className).not.toContain('active')
  })

  it('panel toggle click calls onTogglePanel with correct id', () => {
    const onTogglePanel = vi.fn()
    renderTopBar({
      panelToggleItems: [{ id: 'editor', label: 'Editor', visible: true }],
      onTogglePanel
    })
    fireEvent.click(screen.getByText('Editor'))
    expect(onTogglePanel).toHaveBeenCalledWith('editor')
  })

  it('Show all button calls onShowAllPanels', () => {
    const onShowAllPanels = vi.fn()
    renderTopBar({
      panelToggleItems: [{ id: 'editor', label: 'Editor', visible: false }],
      onShowAllPanels
    })
    fireEvent.click(screen.getByText('Show all'))
    expect(onShowAllPanels).toHaveBeenCalledOnce()
  })

  it('hides panel toggles and Show all when panelToggleItems is empty', () => {
    renderTopBar({ panelToggleItems: [] })
    expect(screen.queryByText('Show all')).toBeNull()
    expect(screen.queryByText('Panels')).toBeNull()
  })
})
