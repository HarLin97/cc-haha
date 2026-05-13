import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { MarkdownRenderer } from '../components/markdown/MarkdownRenderer'
import { useTranslation } from '../i18n'
import { formatBytes } from '../lib/formatBytes'
import { useMemoryStore } from '../stores/memoryStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import type { MemoryFile, MemoryProject } from '../types/memory'

const DEFAULT_MEMORY_PATH = 'MEMORY.md'

export function MemorySettings() {
  const t = useTranslation()
  const {
    projects,
    files,
    selectedProjectId,
    selectedFile,
    draftContent,
    isLoadingProjects,
    isLoadingFiles,
    isLoadingFile,
    isSaving,
    error,
    lastSavedAt,
    fetchProjects,
    selectProject,
    fetchFiles,
    openFile,
    updateDraft,
    saveFile,
    createFile,
  } = useMemoryStore()
  const sessions = useSessionStore((s) => s.sessions)
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const pendingMemoryPath = useUIStore((s) => s.pendingMemoryPath)
  const setPendingMemoryPath = useUIStore((s) => s.setPendingMemoryPath)
  const [newPath, setNewPath] = useState('')
  const [newPathError, setNewPathError] = useState<string | null>(null)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  )
  const activeCwd = activeSession?.workDir || activeSession?.projectPath || undefined
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const isDirty = Boolean(selectedFile && draftContent !== selectedFile.content)

  useEffect(() => {
    void fetchProjects(activeCwd)
  }, [activeCwd, fetchProjects])

  useEffect(() => {
    if (!selectedProjectId) return
    void fetchFiles(selectedProjectId)
  }, [fetchFiles, selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId || selectedFile || isLoadingFiles || isLoadingFile) return
    if (pendingMemoryPath) return
    const firstFile = files[0]
    if (firstFile) {
      void openFile(selectedProjectId, firstFile.path)
    }
  }, [files, isLoadingFile, isLoadingFiles, openFile, pendingMemoryPath, selectedFile, selectedProjectId])

  useEffect(() => {
    if (!pendingMemoryPath || isLoadingProjects || projects.length === 0) return
    const target = resolveMemoryFileTarget(projects, pendingMemoryPath)
    if (!target) {
      setPendingMemoryPath(null)
      return
    }
    if (selectedProjectId !== target.projectId) {
      selectProject(target.projectId)
      return
    }
    if (selectedFile?.path === target.path && !isLoadingFile) {
      setPendingMemoryPath(null)
      return
    }
    void openFile(target.projectId, target.path).then(() => {
      setPendingMemoryPath(null)
    })
  }, [
    isLoadingFile,
    isLoadingProjects,
    openFile,
    pendingMemoryPath,
    projects,
    selectProject,
    selectedFile?.path,
    selectedProjectId,
    setPendingMemoryPath,
  ])

  const handleRefresh = () => {
    void fetchProjects(activeCwd)
    if (selectedProjectId) {
      void fetchFiles(selectedProjectId)
    }
  }

  const handleProjectSelect = (projectId: string) => {
    if (projectId === selectedProjectId) return
    selectProject(projectId)
  }

  const handleFileOpen = (file: MemoryFile) => {
    if (!selectedProjectId || file.path === selectedFile?.path) return
    void openFile(selectedProjectId, file.path)
  }

  const handleCreate = () => {
    if (!selectedProjectId) return
    const path = normalizeMemoryPath(newPath || DEFAULT_MEMORY_PATH)
    if (!isValidMemoryPath(path)) {
      setNewPathError(t('settings.memory.invalidPath'))
      return
    }
    if (files.some((file) => file.path === path)) {
      setNewPathError(t('settings.memory.fileExists'))
      return
    }
    setNewPath('')
    setNewPathError(null)
    void createFile(selectedProjectId, path, buildMemoryTemplate(path))
  }

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-5">
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {t('settings.memory.title')}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
            {t('settings.memory.description')}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={isLoadingProjects || isLoadingFiles}
          icon={<span className="material-symbols-outlined text-[16px]">refresh</span>}
        >
          {t('settings.memory.refresh')}
        </Button>
      </header>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="grid min-h-0 content-start gap-4">
          <section className="min-h-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)]">
            <PanelHeader
              title={t('settings.memory.projects')}
              meta={isLoadingProjects ? t('common.loading') : String(projects.length)}
            />
            <div className="max-h-[240px] overflow-y-auto p-2">
              {projects.length === 0 && !isLoadingProjects ? (
                <EmptyState text={t('settings.memory.emptyProjects')} />
              ) : (
                projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    active={project.id === selectedProjectId}
                    onSelect={() => handleProjectSelect(project.id)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)]">
            <PanelHeader
              title={t('settings.memory.files')}
              meta={isLoadingFiles ? t('common.loading') : `${files.length}`}
            />
            <div className="border-b border-[var(--color-border)] p-3">
              <div className="flex gap-2">
                <Input
                  value={newPath}
                  onChange={(event) => {
                    setNewPath(event.target.value)
                    setNewPathError(null)
                  }}
                  placeholder={t('settings.memory.newPathPlaceholder')}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!selectedProjectId}
                  loading={isSaving && !selectedFile}
                  onClick={handleCreate}
                  icon={<span className="material-symbols-outlined text-[16px]">add</span>}
                >
                  {t('settings.memory.newFile')}
                </Button>
              </div>
              {newPathError && (
                <p className="mt-2 text-xs text-[var(--color-error)]">{newPathError}</p>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {files.length === 0 && !isLoadingFiles ? (
                <EmptyState text={t('settings.memory.emptyFiles')} />
              ) : (
                files.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    active={file.path === selectedFile?.path}
                    onSelect={() => handleFileOpen(file)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <section className="min-h-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {selectedFile?.path ?? t('settings.memory.noFileSelected')}
                </h3>
                {isDirty && <Badge>{t('settings.memory.unsaved')}</Badge>}
                {lastSavedAt && !isDirty && <Badge>{t('settings.memory.saved')}</Badge>}
              </div>
              <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">
                {selectedProject?.memoryDir ?? t('settings.memory.selectProject')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!selectedFile || !isDirty || isSaving}
                onClick={() => selectedFile && updateDraft(selectedFile.content)}
              >
                {t('settings.memory.revert')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedFile || !isDirty}
                loading={isSaving}
                onClick={() => void saveFile()}
                icon={<span className="material-symbols-outlined text-[16px]">save</span>}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>

          {selectedFile ? (
            <div className="grid min-h-[520px] grid-rows-[minmax(300px,1fr)_minmax(240px,0.85fr)] 2xl:grid-cols-2 2xl:grid-rows-1">
              <div className="min-h-0 border-b border-[var(--color-border)] 2xl:border-b-0 2xl:border-r">
                <div className="flex h-9 items-center justify-between border-b border-[var(--color-border)] px-3 text-xs font-medium uppercase tracking-normal text-[var(--color-text-tertiary)]">
                  <span>{t('settings.memory.editor')}</span>
                  <span>{formatBytes(selectedFile.bytes)}</span>
                </div>
                <textarea
                  aria-label={t('settings.memory.editor')}
                  value={draftContent}
                  onChange={(event) => updateDraft(event.target.value)}
                  spellCheck={false}
                  className="h-[calc(100%-36px)] w-full resize-none overflow-auto bg-transparent p-4 font-mono text-[13px] leading-6 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
                />
              </div>
              <div className="min-h-0 overflow-y-auto">
                <div className="flex h-9 items-center justify-between border-b border-[var(--color-border)] px-3 text-xs font-medium uppercase tracking-normal text-[var(--color-text-tertiary)]">
                  <span>{t('settings.memory.preview')}</span>
                  <span>{selectedFile.updatedAt ? formatDate(selectedFile.updatedAt) : ''}</span>
                </div>
                <div className="p-4">
                  <MarkdownRenderer content={draftContent || ' '} variant="document" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center p-8">
              <EmptyState text={isLoadingFile ? t('common.loading') : t('settings.memory.selectFile')} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-3">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <span className="text-xs text-[var(--color-text-tertiary)]">{meta}</span>
    </div>
  )
}

function ProjectRow({
  project,
  active,
  onSelect,
}: {
  project: MemoryProject
  active: boolean
  onSelect: () => void
}) {
  const t = useTranslation()
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mb-1 w-full rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors ${
        active
          ? 'bg-[var(--color-surface-selected)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{project.label}</span>
        {project.isCurrent && <Badge>{t('settings.memory.current')}</Badge>}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
        <span>{t('settings.memory.fileCount', { count: project.fileCount })}</span>
      </div>
    </button>
  )
}

function FileRow({
  file,
  active,
  onSelect,
}: {
  file: MemoryFile
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mb-1 w-full rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors ${
        active
          ? 'bg-[var(--color-surface-selected)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{file.title}</span>
        {file.type && <Badge>{file.type}</Badge>}
      </div>
      <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">{file.path}</p>
      {file.description && (
        <p className="mt-1 truncate text-xs leading-5 text-[var(--color-text-secondary)]">
          {file.description}
        </p>
      )}
    </button>
  )
}

function Badge({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
      {children}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-3 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
      {text}
    </div>
  )
}

function normalizeMemoryPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\/+/, '')
}

function normalizeFsPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+$/, '')
}

function resolveMemoryFileTarget(projects: MemoryProject[], absolutePath: string): { projectId: string; path: string } | null {
  const target = normalizeFsPath(absolutePath)
  for (const project of projects) {
    const memoryDir = normalizeFsPath(project.memoryDir)
    if (!memoryDir) continue
    if (target === memoryDir) {
      return { projectId: project.id, path: DEFAULT_MEMORY_PATH }
    }
    if (target.startsWith(`${memoryDir}/`)) {
      return {
        projectId: project.id,
        path: target.slice(memoryDir.length + 1),
      }
    }
  }
  return null
}

function isValidMemoryPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.endsWith('.md') &&
    !path.includes('\0') &&
    !path.split('/').some((part) => part === '' || part === '.' || part === '..')
  )
}

function buildMemoryTemplate(path: string): string {
  const parts = path.split('/')
  const title = parts[parts.length - 1]?.replace(/\.md$/, '') || 'Memory'
  return `---
type: project
description: Manually curated project memory.
---

# ${title}

`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
