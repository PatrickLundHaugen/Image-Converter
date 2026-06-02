<script lang="ts">
    import type { Component } from "svelte";
    import { theme } from "../stores/theme.js";
    import type { Theme } from "../types.js";
    import { Sun, Moon } from "@lucide/svelte";

    const options: { value: Theme; label: string; icon?: Component }[] = [
        { value: "system", label: "System" },
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
    ];

    let buttonEls: HTMLButtonElement[] = $state([]);

    let activeIndex = $derived(options.findIndex((o) => o.value === $theme));
    let pillLeft = $derived(buttonEls[activeIndex]?.offsetLeft ?? 0);
    let pillWidth = $derived(buttonEls[activeIndex]?.offsetWidth ?? 0);
</script>

<div class="relative flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 p-1">
    {#if pillWidth}
        <span
                class="absolute top-1 bottom-1 rounded-md bg-neutral-800 dark:bg-neutral-200
                   transition-[left,width] ease-in-out"
                style="left: {pillLeft}px; width: {pillWidth}px;"
                aria-hidden="true"
        ></span>
    {/if}

    {#each options as option, i}
        <button
                bind:this={buttonEls[i]}
                class="relative z-10 px-3 py-1 rounded-sm text-xs font-medium cursor-pointer transition-colors
                   {$theme === option.value
                       ? 'bg-neutral-800 text-neutral-200 dark:bg-neutral-200 dark:text-neutral-800'
                       : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}"
                onclick={() => theme.set(option.value)}
                aria-label={`Set ${option.label} theme`}
                aria-pressed={$theme === option.value}
        >
            {#if option.icon}
                <option.icon size={16} />
            {:else}
                {option.label}
            {/if}
        </button>
    {/each}
</div>