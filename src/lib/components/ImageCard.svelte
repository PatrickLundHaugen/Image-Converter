<script lang="ts">
    import type { ImageItem, Format } from '../types.js';
    import { formatBytes, savingsPercent } from '../utils/filesize.js';
    import { downloadBlob, getOutputFilename } from '../utils/zip.js';
    import Button from './Button.svelte';

    interface Props {
        item: ImageItem;
        format: Format;
        onremove: (id: string) => void;
    }

    let { item, format, onremove }: Props = $props();

    let thumbnailUrl = $state('');

    $effect(() => {
        const url = URL.createObjectURL(item.file);
        thumbnailUrl = url;
        return () => URL.revokeObjectURL(url);
    });

    const savings = $derived(
        item.convertedSize !== null
            ? savingsPercent(item.originalSize, item.convertedSize)
            : null
    );

    function handleDownload() {
        if (item.convertedBlob) {
            downloadBlob(item.convertedBlob, getOutputFilename(item.name, format));
        }
    }
</script>

<div class="flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
    <!-- Thumbnail -->
    <div class="size-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {#if thumbnailUrl}
            <img src={thumbnailUrl} alt={item.name} class="size-full object-cover" />
        {/if}
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate" title={item.name}>{item.name}</p>
        <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 font-mono">
            {item.width}×{item.height}
        </p>
        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
            <span class="text-xs text-neutral-500 tabular-nums">{formatBytes(item.originalSize)}</span>

            {#if item.converting}
                <span class="text-xs text-neutral-400">· converting...</span>
            {:else if item.error}
                <span class="text-xs text-red-500">· {item.error}</span>
            {:else if item.convertedSize !== null}
                <span class="text-neutral-300 dark:text-neutral-600 text-xs">→</span>
                <span class="text-xs text-neutral-500 tabular-nums">{formatBytes(item.convertedSize)}</span>
                {#if savings !== null && savings > 0}
                    <span class="text-xs text-green-600 dark:text-green-400 tabular-nums">−{savings}%</span>
                {:else if savings !== null && savings < 0}
                    <span class="text-xs text-amber-500 tabular-nums">+{Math.abs(savings)}%</span>
                {/if}
            {/if}
        </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0">
        <Button
                variant="primary"
                size="icon"
                disabled={!item.convertedBlob || item.converting}
                onclick={handleDownload}
                aria-label="Download converted image"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="fill-current">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
        </Button>

        <Button
                variant="secondary"
                size="icon"
                onclick={() => onremove(item.id)}
                aria-label="Remove image"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="fill-current">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
        </Button>
    </div>
</div>