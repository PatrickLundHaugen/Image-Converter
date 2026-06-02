import { writable } from 'svelte/store';
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
});