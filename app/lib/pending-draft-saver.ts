import type { PendingItem } from '../types';

type Patch = Partial<PendingItem>;

// Merge edits and serialize requests. Server responses never replace the local draft.
export function createPendingDraftSaver(
  save: (id: string, patch: Patch) => Promise<unknown>,
  onError: (error: unknown) => void,
  onSaved: () => void,
  delay = 400,
) {
  const pending = new Map<string, Patch>();
  const composing = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> | undefined;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { void flush().catch(onError); }, delay);
  };

  function flush(): Promise<void> {
    clearTimeout(timer);
    if (active) return active;
    active = (async () => {
      while (true) {
        const next = Array.from(pending).find(([id]) => !composing.has(id));
        if (!next) return;
        const [id, patch] = next;
        pending.delete(id);
        try {
          await save(id, patch);
          onSaved();
        } catch (error) {
          // Keep failed edits, with newer keystrokes winning on every field.
          pending.set(id, { ...patch, ...pending.get(id) });
          throw error;
        }
      }
    })().finally(() => { active = undefined; });
    return active;
  }

  return {
    edit(id: string, patch: Patch) {
      pending.set(id, { ...pending.get(id), ...patch });
      schedule();
    },
    composition(id: string, value: boolean) {
      if (value) composing.add(id);
      else { composing.delete(id); schedule(); }
    },
    flush,
    hasUnsaved: () => pending.size > 0 || Boolean(active),
    isComposing: () => composing.size > 0,
    dispose: () => clearTimeout(timer),
  };
}
