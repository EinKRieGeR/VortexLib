/**
 * Unified import state management via Nitro Storage.
 * 
 * Storage keys:
 *   import:inProgress  — boolean, volatile (memory)
 *   import:progress    — { message, progress }, volatile (memory)
 */

export interface ImportProgress {
  message: string
  progress: number  // 0–100, or -1 on error
}

export async function setImportInProgress(value: boolean) {
  const s = useStorage('memory')
  await s.setItem<boolean>('import:inProgress', value)
}

export async function getImportInProgress(): Promise<boolean> {
  const s = useStorage('memory')
  return (await s.getItem<boolean>('import:inProgress')) ?? false
}

export async function setImportProgress(progress: ImportProgress) {
  const s = useStorage('memory')
  await s.setItem<ImportProgress>('import:progress', progress)
}

export async function getImportProgress(): Promise<ImportProgress> {
  const s = useStorage('memory')
  return (await s.getItem<ImportProgress>('import:progress')) ?? { message: '', progress: 0 }
}
