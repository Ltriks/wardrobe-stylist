import { AsyncLocalStorage } from 'node:async_hooks';

const globalForProfiles = globalThis as typeof globalThis & {
  wardrobeProfileContext?: AsyncLocalStorage<string>;
};

const profileContext = globalForProfiles.wardrobeProfileContext ?? new AsyncLocalStorage<string>();
globalForProfiles.wardrobeProfileContext = profileContext;

export function runWithProfile<T>(profileId: string, operation: () => T): T {
  return profileContext.run(profileId, operation);
}

export function currentProfileId(): string {
  const profileId = profileContext.getStore();
  if (!profileId) throw new Error('请先选择成员衣柜。');
  return profileId;
}
