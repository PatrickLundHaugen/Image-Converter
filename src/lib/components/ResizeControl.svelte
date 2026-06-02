<script lang="ts">
    interface Props {
        enabled: boolean;
        width: number;
        height: number;
        lockAspect: boolean;
        originalWidth: number;
        originalHeight: number;
        ontoggle: () => void;
        ontogglelock: () => void;
        onchange: (opts: { width: number; height: number }) => void;
    }

    let { enabled, width, height, lockAspect, originalWidth, originalHeight, ontoggle, ontogglelock, onchange }: Props = $props();

    // lockedRatio is set in toggleLock() before first use — initial value doesn't matter
    let lockedRatio = $state(1);

    function emit(w: number, h: number) {
        onchange({
            width:  Math.max(1, Math.min(originalWidth,  Math.round(w))),
            height: Math.max(1, Math.min(originalHeight, Math.round(h))),
        });
    }

    function handleWidth(e: Event) {
        const w = Number((e.target as HTMLInputElement).value);
        if (!w) return;
        emit(w, lockAspect ? w * lockedRatio : height);
    }

    function handleHeight(e: Event) {
        const h = Number((e.target as HTMLInputElement).value);
        if (!h) return;
        emit(lockAspect ? h / lockedRatio : width, h);
    }

    function toggleLock() {
        // Capture current ratio before the prop flips
        if (!lockAspect) lockedRatio = height / width || 1;
        ontogglelock();
    }

    function reset() {
        lockedRatio = originalHeight / originalWidth || 1;
        emit(originalWidth, originalHeight);
    }
</script>

<div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
        <span class="text-sm text-neutral-600 dark:text-neutral-400">Crop</span>
        <button
                onclick={ontoggle}
                class="text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer font-medium
             {enabled
               ? 'border-neutral-800 dark:border-neutral-200 bg-neutral-800 dark:bg-neutral-200 text-neutral-100 dark:text-neutral-800'
               : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-500'}"
                aria-pressed={enabled}
        >
            {enabled ? 'On' : 'Off'}
        </button>
    </div>

    {#if enabled}
        <div class="flex items-end gap-2">
            <!-- Width -->
            <div class="flex flex-col gap-1">
                <label for="crop-w" class="text-xs text-neutral-400 dark:text-neutral-500">W</label>
                <input
                        id="crop-w"
                        type="number" min="1" max={originalWidth} value={width}
                        oninput={handleWidth}
                        class="w-20 text-sm text-center tabular-nums rounded-md px-2 py-1.5
                 bg-neutral-50 dark:bg-neutral-800
                 border border-neutral-200 dark:border-neutral-700
                 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500
                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
            </div>

            <!-- Aspect lock -->
            <button
                    onclick={toggleLock}
                    title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                    class="mb-1.5 size-7 flex items-center justify-center rounded-md border transition-colors cursor-pointer
               {lockAspect
                 ? 'border-neutral-800 dark:border-neutral-300 text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800'
                 : 'border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-400'}"
            >
                {#if lockAspect}
                    <svg viewBox="0 0 16 16" class="size-3.5 fill-current">
                        <path d="M11 6V5a3 3 0 10-6 0v1H3v8h10V6h-2zM6 5a2 2 0 114 0v1H6V5z"/>
                    </svg>
                {:else}
                    <svg viewBox="0 0 16 16" class="size-3.5 fill-current">
                        <path d="M11 1a3 3 0 00-3 3v2H3v8h10V6H7V4a2 2 0 114 0V5h1V4a3 3 0 00-3-3z"/>
                    </svg>
                {/if}
            </button>

            <!-- Height -->
            <div class="flex flex-col gap-1">
                <label for="crop-h" class="text-xs text-neutral-400 dark:text-neutral-500">H</label>
                <input
                        id="crop-h"
                        type="number" min="1" max={originalHeight} value={height}
                        oninput={handleHeight}
                        class="w-20 text-sm text-center tabular-nums rounded-md px-2 py-1.5
                 bg-neutral-50 dark:bg-neutral-800
                 border border-neutral-200 dark:border-neutral-700
                 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500
                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
            </div>

            <!-- Reset -->
            <button
                    onclick={reset}
                    title="Reset to full image"
                    class="mb-1.5 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200
               transition-colors cursor-pointer px-1"
            >↺</button>
        </div>

        <p class="text-xs text-neutral-400 dark:text-neutral-500">
            Drag the frame in the viewer to reposition
        </p>
    {/if}
</div>