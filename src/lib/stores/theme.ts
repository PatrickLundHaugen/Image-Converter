import { writable, derived } from 'svelte/store';
import type { Theme } from '../types.js';

const getInitial = (): Theme => {
    if (typeof localStorage === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) ?? 'system';
};

export const theme = writable<Theme>(getInitial());

theme.subscribe((value) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', value);
    }

    if (typeof document !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = value === 'dark' || (value === 'system' && prefersDark);
        document.documentElement.classList.toggle('dark', isDark);
    }
});

const prefersDark = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const isDark = derived(
    theme,
    ($theme) => $theme === 'dark' || ($theme === 'system' && prefersDark())
);