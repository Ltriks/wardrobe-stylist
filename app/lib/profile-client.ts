'use client';

const STORAGE_KEY = 'wardrobe-active-profile';

export function selectedProfileId() {
  return window.sessionStorage.getItem(STORAGE_KEY) || 'default';
}

export function selectProfile(id: string) {
  window.sessionStorage.setItem(STORAGE_KEY, id);
  // Reload discards the previous member's forms and in-memory wardrobe data.
  window.location.assign('/');
}

export function wardrobeFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('X-Wardrobe-Profile', selectedProfileId());
  return fetch(input, { ...init, headers, cache: 'no-store' });
}
