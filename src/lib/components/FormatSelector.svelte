<script lang="ts">
    import type { Format } from '../types.js';

    interface Props {
        format: Format;
        onchange: (format: Format) => void;
    }

    let { format, onchange }: Props = $props();

    const formats: { value: Format; label: string; description: string }[] = [
        {
            value: 'image/png',
            label: 'PNG',
            description:
                'Lossless — every pixel is preserved exactly. Best for screenshots, UI graphics, logos, and anything with transparency. Produces larger files than JPEG or WebP.',
        },
        {
            value: 'image/jpeg',
            label: 'JPEG',
            description:
                'Lossy compression optimised for photographs. The most universally supported format. No transparency — transparent areas become white. Smaller files at the cost of some detail.',
        },
        {
            value: 'image/webp',
            label: 'WebP',
            description:
                'Modern format with excellent compression. Supports transparency. Noticeably smaller than JPEG or PNG at comparable quality. The best default choice for web use.',
        },
    ];

    const selectedFormat = $derived(formats.find((f) => f.value === format)!);

    let buttonEls: HTMLButtonElement[] = $state([]);
    let activeIndex = $derived(formats.findIndex((f) => f.value === format));
    let pillLeft = $derived(buttonEls[activeIndex]?.offsetLeft ?? 0);
    let pillWidth = $derived(buttonEls[activeIndex]?.offsetWidth ?? 0);
</script>

<div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
        <span class="text-sm text-neutral-600 dark:text-neutral-400 shrink-0">Convert to</span>
        <div class="relative flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 gap-0.5">
            {#if pillWidth}
        <span
                class="absolute top-1 bottom-1 rounded-sm bg-neutral-800 dark:bg-neutral-200
                 transition-[left,width] ease-in-out pointer-events-none"
                style="left: {pillLeft}px; width: {pillWidth}px;"
                aria-hidden="true"
        ></span>
            {/if}

            {#each formats as f, i}
                <button
                        bind:this={buttonEls[i]}
                        class="relative z-10 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer
                 {format === f.value
                   ? 'text-neutral-200 dark:text-neutral-800'
                   : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}"
                        onclick={() => onchange(f.value)}
                        aria-pressed={format === f.value}
                >
                    {f.label}
                </button>
            {/each}
        </div>
    </div>

    <p class="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {selectedFormat.description}
    </p>
</div>