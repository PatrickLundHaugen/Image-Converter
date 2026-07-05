<script lang="ts">
    import { X, ArrowLeftRight, ArrowDownUp } from "@lucide/svelte";

    import { getContext } from 'svelte';
    import { APP_CONTEXT_KEY, type AppContext } from '../context.js';
    import { FORMAT_LABELS } from '../types.js';
    import { formatBytes, itemSavings } from '../utils/filesize.js';
    import DropZone from './DropZone.svelte';
    import FormatSelector from './FormatSelector.svelte';
    import QualitySlider from './QualitySlider.svelte';
    import CropControl from './CropControl.svelte';
    import Button from './Button.svelte';

    const ctx = getContext<AppContext>(APP_CONTEXT_KEY);
</script>

<aside class="absolute top-0 left-0 bottom-0 z-20 flex flex-col w-full lg:w-[360px] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 lg:border lg:top-2 lg:left-2 lg:bottom-2 lg:rounded-2xl lg:shadow-2xl overflow-hidden lg:max-h-full max-h-[50%]">
    <div class="p-2 shrink-0 border-b border-neutral-100 dark:border-neutral-800">
        <DropZone compact onfiles={ctx.addFiles} />
    </div>

    <!-- Scrollable body: image list + controls -->
    <div class="flex-1 min-h-0 overflow-y-auto">

        <!-- Image list -->
        <div class="p-2 flex flex-col gap-1">
            {#each ctx.items as item (item.id)}
                {@const isSelected = ctx.selectedItem?.id === item.id}
                {@const thumbSavings = itemSavings(item)}
                <div
                        role="button"
                        tabindex="0"
                        onclick={() => ctx.selectItem(item.id)}
                        onkeydown={(e) => e.key === 'Enter' && ctx.selectItem(item.id)}
                        class="group flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer
                   {isSelected
                     ? 'bg-neutral-100 dark:bg-neutral-800'
                     : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}"
                >
                    <div class="size-10 shrink-0 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                        <img src={item.thumbnailUrl} alt="" class="size-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium truncate leading-tight">{item.name}</p>
                        {#if item.error}
                            <p class="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate">{item.error}</p>
                        {:else}
                            <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                                {formatBytes(item.originalSize)}
                                {#if thumbSavings !== null && thumbSavings > 0}
                                    <span class="text-green-600 dark:text-green-500 transition-opacity class:opacity-40={item.converting}">−{thumbSavings}%</span>
                                {:else if thumbSavings !== null && thumbSavings < 0}
                                    <span class="text-amber-500 transition-opacity class:opacity-40={item.converting}">+{Math.abs(thumbSavings)}%</span>
                                {/if}
                                <span>·</span>
                                <span>{FORMAT_LABELS[ctx.format]}</span>
                            </p>
                        {/if}
                    </div>
                    <button
                            onclick={(e) => { e.stopPropagation(); ctx.removeItem(item.id); }}
                            class="size-5 rounded flex items-center justify-center shrink-0
                     text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200
                     opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label="Remove {item.name}"
                    >
                        <X class="size-4"/>
                    </button>
                </div>
            {/each}
        </div>

        <!-- Controls -->
        <div class="px-4 py-2 flex flex-col gap-4 border-t border-neutral-100 dark:border-neutral-800">
            <FormatSelector format={ctx.format} onchange={ctx.handleFormatChange} />
            {#if ctx.format !== 'image/png'}
                <div class="border-t border-neutral-100 dark:border-neutral-800"></div>
                <QualitySlider quality={ctx.quality} onchange={ctx.handleQualityChange} />
                <div class="border-t border-neutral-100 dark:border-neutral-800"></div>
            {/if}
            {#if ctx.selectedItem}
                <CropControl
                        enabled={ctx.cropEnabled}
                        width={ctx.crop.width || ctx.selectedItem.width}
                        height={ctx.crop.height || ctx.selectedItem.height}
                        lockAspect={ctx.cropLockAspect}
                        originalWidth={ctx.selectedItem.width}
                        originalHeight={ctx.selectedItem.height}
                        ontoggle={ctx.handleCropToggle}
                        ontogglelock={ctx.handleCropLockToggle}
                        onchange={ctx.handleCropChange}
                />
            {/if}
        </div>
    </div>

    <!-- Footer: download + batch -->
    <div class="shrink-0 p-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
        <div class="flex gap-2">
            <Button
                    onclick={ctx.downloadSelected}
                    disabled={!ctx.selectedItem?.convertedBlob && ctx.selectedItem?.lastSavings === null}
                    class="flex-1"
            >
                Download
                {#if ctx.selectedItem}
                    {@const selectedSavings = itemSavings(ctx.selectedItem)}
                    {#if selectedSavings !== null && selectedSavings > 0}
                        <span class="opacity-70 text-xs ml-1 transition-opacity class:opacity-30={ctx.selectedItem.converting}">−{selectedSavings}%</span>
                    {/if}
                {/if}
            </Button>
            <button
                    onclick={ctx.copyToClipboard}
                    disabled={!ctx.selectedItem?.convertedBlob && ctx.selectedItem?.lastSavings === null}
                    class="px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed
                 {ctx.copyState === 'copied'
                   ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
                   : ctx.copyState === 'error'
                   ? 'border-red-400 text-red-500'
                   : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'}"
                    title="Copy to clipboard"
            >
                {ctx.copyState === 'copied' ? '✓ Copied' : ctx.copyState === 'error' ? 'Failed' : 'Copy'}
            </button>
        </div>
        {#if ctx.items.length > 1}
            <div class="flex gap-2">
                <Button onclick={ctx.handleDownloadAll} disabled={ctx.downloadingZip} class="flex-1 text-xs">
                    {ctx.downloadingZip ? 'Zipping…' : `All (${ctx.items.length})`}
                </Button>
                <Button variant="secondary" onclick={ctx.clearAll} class="flex-1 text-xs">Clear</Button>
            </div>
        {:else}
            <Button variant="secondary" onclick={ctx.clearAll} class="w-full text-xs">Clear all</Button>
        {/if}

        <!-- Keyboard hints -->
        <p class="flex items-center justify-center text-xs text-neutral-400 dark:text-neutral-600 py-2 gap-1 *:size-3">
            <ArrowLeftRight /> divider ·
            <ArrowDownUp /> image ·
            <kbd class="flex items-center justify-center text-[10px] rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 leading-none">R</kbd> reset ·
            <kbd class="flex items-center justify-center text-[10px] rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 leading-none">D</kbd> diff
        </p>
    </div>
</aside>