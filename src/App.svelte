<script lang="ts">
    import { onMount } from 'svelte';
    import { theme } from './lib/stores/theme.js';
    import type { ImageItem, Format, CropOptions } from './lib/types.js';
    import { convertImage, getImageDimensions, isUnsupportedFormat } from './lib/utils/converter.js';
    import { downloadAllAsZip, downloadBlob, getOutputFilename } from './lib/utils/zip.js';
    import { formatBytes, savingsPercent } from './lib/utils/filesize.js';
    import DropZone from './lib/components/DropZone.svelte';
    import ComparisonViewer from './lib/components/ComparisonViewer.svelte';
    import FormatSelector from './lib/components/FormatSelector.svelte';
    import QualitySlider from './lib/components/QualitySlider.svelte';
    import ResizeControl from './lib/components/ResizeControl.svelte';
    import ThemeToggle from './lib/components/ThemeToggle.svelte';
    import Button from './lib/components/Button.svelte';

    let items = $state<ImageItem[]>([]);
    let format = $state<Format>('image/webp');
    let quality = $state(85);
    let cropEnabled    = $state(false);
    let cropLockAspect = $state(true);
    let crop = $state({ x: 0, y: 0, width: 0, height: 0 });
    let selectedId = $state<string | null>(null);
    let downloadingZip = $state(false);
    let copyState = $state<'idle' | 'copied' | 'error'>('idle');
    let debounceTimer: ReturnType<typeof setTimeout>;
    let toast = $state<string | null>(null);
    let toastTimer: ReturnType<typeof setTimeout>;

    function showToast(msg: string) {
        toast = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (toast = null), 5000);
    }
    let addMoreInput = $state<HTMLInputElement>();

    const selectedItem = $derived(
        (selectedId ? items.find((i) => i.id === selectedId) : null) ?? items[0] ?? null
    );

    $effect(() => {
        const t = $theme;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = t === 'dark' || (t === 'system' && prefersDark);
        document.documentElement.classList.toggle('dark', isDark);
    });

    onMount(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if ($theme === 'system') document.documentElement.classList.toggle('dark', mq.matches);
        };
        mq.addEventListener('change', handler);

        // Restore last used settings
        const savedFormat = localStorage.getItem('imgconv-format') as Format | null;
        const savedQuality = localStorage.getItem('imgconv-quality');
        if (savedFormat && ['image/png', 'image/jpeg', 'image/webp'].includes(savedFormat)) format = savedFormat;
        if (savedQuality) quality = Math.max(1, Math.min(100, Number(savedQuality)));

        return () => mq.removeEventListener('change', handler);
    });

    const FORMAT_LABELS: Record<string, string> = {
        'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WebP',
    };

    async function addFiles(files: File[]) {
        const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
        for (const file of files) {
            if (isUnsupportedFormat(file)) {
                showToast(`"${file.name}" is HEIC/HEIF — not supported by the browser. Convert to JPEG or PNG first.`);
                const item: ImageItem = {
                    id: crypto.randomUUID(), file, name: file.name,
                    originalSize: file.size, width: 0, height: 0,
                    convertedBlob: null, convertedSize: null,
                    converting: false, error: 'HEIC/HEIF not supported',
                };
                items.push(item);
                if (!selectedId) selectedId = item.id;
                continue;
            }
            if (file.size > MAX_SIZE) {
                showToast(`"${file.name}" is large (${formatBytes(file.size)}) — conversion may be slow`);
            }
            const { width, height } = await getImageDimensions(file);
            const item: ImageItem = {
                id: crypto.randomUUID(), file, name: file.name,
                originalSize: file.size, width, height,
                convertedBlob: null, convertedSize: null,
                converting: true, error: null,
            };
            items.push(item);
            if (!selectedId) selectedId = item.id;
            void convertItem(item.id);
        }
    }

    function buildCrop(): CropOptions | undefined {
        if (!cropEnabled || !crop.width || !crop.height) return undefined;
        return { enabled: true, ...crop };
    }

    async function convertItem(id: string) {
        const item = items.find((i) => i.id === id);
        if (!item) return;
        item.converting = true;
        item.error = null;
        try {
            const blob = await convertImage(item.file, format, quality, buildCrop());
            item.convertedBlob = blob;
            item.convertedSize = blob.size;
        } catch {
            item.error = 'Conversion failed';
        } finally {
            item.converting = false;
        }
    }

    function reconvertAll() {
        for (const item of items) {
            if (item.error) continue;
            void convertItem(item.id);
        }
    }

    function handleFormatChange(f: Format) {
        format = f;
        localStorage.setItem('imgconv-format', f);
        reconvertAll();
    }

    function handleQualityChange(q: number) {
        quality = q;
        localStorage.setItem('imgconv-quality', String(q));
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(reconvertAll, 400);
    }

    function handleCropToggle() {
        cropEnabled = !cropEnabled;
        if (cropEnabled && selectedItem) {
            crop = { x: 0, y: 0, width: selectedItem.width, height: selectedItem.height };
        }
        reconvertAll();
    }

    function handleCropLockToggle() {
        cropLockAspect = !cropLockAspect;
    }

    function handleCropChange(opts: { width: number; height: number }) {
        const w = Math.min(opts.width,  selectedItem?.width  ?? opts.width);
        const h = Math.min(opts.height, selectedItem?.height ?? opts.height);
        // Keep crop centred; clamp so it stays within the image
        const x = Math.min(crop.x, (selectedItem?.width  ?? w) - w);
        const y = Math.min(crop.y, (selectedItem?.height ?? h) - h);
        crop = { x: Math.max(0, x), y: Math.max(0, y), width: w, height: h };
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(reconvertAll, 400);
    }

    function handleCropFrameChange(c: { x: number; y: number; width: number; height: number }) {
        crop = c;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(reconvertAll, 400);
    }

    function removeItem(id: string) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx === -1) return;
        items.splice(idx, 1);
        if (selectedId === id) selectedId = items[idx]?.id ?? items[idx - 1]?.id ?? null;
    }

    function clearAll() { items = []; selectedId = null; }

    async function handleDownloadAll() {
        downloadingZip = true;
        await downloadAllAsZip(items, format);
        downloadingZip = false;
    }

    function downloadSelected() {
        if (selectedItem?.convertedBlob)
            downloadBlob(selectedItem.convertedBlob, getOutputFilename(selectedItem.name, format));
    }

    function handleAddMoreInput(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files) return;
        const files = Array.from(target.files).filter((f) => f.type.startsWith('image/'));
        if (files.length) void addFiles(files);
        target.value = '';
    }

    async function copyToClipboard() {
        if (!selectedItem?.convertedBlob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ [selectedItem.convertedBlob.type]: selectedItem.convertedBlob }),
            ]);
            copyState = 'copied';
        } catch {
            copyState = 'error';
        }
        setTimeout(() => (copyState = 'idle'), 2000);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (!items.length) return;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const idx = items.findIndex((i) => i.id === selectedId);
            if (e.key === 'ArrowUp' && idx > 0) selectedId = items[idx - 1].id;
            if (e.key === 'ArrowDown' && idx < items.length - 1) selectedId = items[idx + 1].id;
        }
    }

    const savings = $derived(
        selectedItem?.convertedSize != null
            ? savingsPercent(selectedItem.originalSize, selectedItem.convertedSize)
            : null
    );
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors">

    <!-- Header -->
    <header class="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0 z-30 relative bg-white dark:bg-neutral-900">
        <h1 class="font-display text-lg font-semibold tracking-tight">imgconv</h1>
        <ThemeToggle />
    </header>

    {#if items.length === 0}
        <main class="flex-1 flex items-center justify-center p-8">
            <div class="w-full max-w-lg flex flex-col gap-6">
                <div class="text-center flex flex-col gap-2">
                    <h2 class="font-display text-3xl font-semibold tracking-tight">imgconv</h2>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400">
                        Convert and crop images to PNG, JPEG, or WebP — right in your browser.
                    </p>
                </div>
                <DropZone onfiles={addFiles} />
                <p class="text-xs text-center text-neutral-400 dark:text-neutral-600">
                    Drop · click · or paste &nbsp;·&nbsp; nothing leaves your device
                </p>
                <p class="text-xs text-center text-neutral-300 dark:text-neutral-700">
                    JPEG · PNG · WebP · GIF · SVG · AVIF · BMP
                </p>
            </div>
        </main>

    {:else}
        <!-- Layout: viewer fills all, sidebar overlays on left -->
        <div class="flex-1 relative overflow-hidden">

            <!-- Full-width viewer -->
            <div class="absolute inset-0">
                {#if selectedItem}
                    <ComparisonViewer
                            item={selectedItem}
                            {format}
                            crop={cropEnabled ? { enabled: true, ...crop } : undefined}
                            lockAspect={cropLockAspect}
                            oncropchange={handleCropFrameChange}
                    />
                {/if}
            </div>

            <!-- Sidebar overlay -->
            <aside class="absolute top-0 left-0 bottom-0 z-20 flex flex-col
                     w-full lg:w-[360px]
                     bg-white dark:bg-neutral-900
                     border-r border-neutral-200 dark:border-neutral-800
                     lg:border lg:top-2 lg:left-2 lg:bottom-2
                     lg:rounded-2xl lg:shadow-2xl
                     overflow-hidden
                     lg:max-h-full max-h-[50%]">

                <!-- Add more -->
                <div class="px-3 pt-3 pb-2 shrink-0 border-b border-neutral-100 dark:border-neutral-800">
                    <button
                            onclick={() => addMoreInput?.click()}
                            class="w-full text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200
                   border border-dashed border-neutral-300 dark:border-neutral-700
                   hover:border-neutral-500 dark:hover:border-neutral-500
                   rounded-lg py-2 transition-colors cursor-pointer"
                    >
                        + Add more images
                    </button>
                    <input bind:this={addMoreInput} type="file" accept="image/*" multiple class="sr-only" oninput={handleAddMoreInput} />
                </div>

                <!-- Scrollable body: image list + controls -->
                <div class="flex-1 min-h-0 overflow-y-auto">

                    <!-- Image list -->
                    <div class="p-2 flex flex-col gap-1">
                        {#each items as item (item.id)}
                            {@const isSelected = selectedItem?.id === item.id}
                            {@const thumbSavings = item.convertedSize !== null ? savingsPercent(item.originalSize, item.convertedSize) : null}
                            {@const thumbUrl = URL.createObjectURL(item.file)}
                            <!-- svelte-ignore a11y_interactive_supports_focus -->
                            <div
                                    role="button"
                                    tabindex="0"
                                    onclick={() => (selectedId = item.id)}
                                    onkeydown={(e) => e.key === 'Enter' && (selectedId = item.id)}
                                    class="group flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer
                       {isSelected
                         ? 'bg-neutral-100 dark:bg-neutral-800'
                         : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}"
                            >
                                <div class="size-10 shrink-0 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                                    <img src={thumbUrl} alt="" class="size-full object-cover" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-medium truncate leading-tight">{item.name}</p>
                                    {#if item.error}
                                        <p class="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate">{item.error}</p>
                                    {:else}
                                        <p class="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums mt-0.5">
                                            {formatBytes(item.originalSize)}
                                            {#if !item.converting && thumbSavings !== null && thumbSavings > 0}
                                                <span class="text-green-600 dark:text-green-400">−{thumbSavings}%</span>
                                            {:else if !item.converting && thumbSavings !== null && thumbSavings < 0}
                                                <span class="text-amber-500">+{Math.abs(thumbSavings)}%</span>
                                            {/if}
                                            <span class="text-neutral-300 dark:text-neutral-600">·</span>
                                            <span>{FORMAT_LABELS[format]}</span>
                                        </p>
                                    {/if}
                                </div>
                                <button
                                        onclick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                        class="size-5 rounded flex items-center justify-center shrink-0
                         text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200
                         opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        aria-label="Remove {item.name}"
                                >
                                    <svg viewBox="0 0 16 16" class="size-3 fill-current">
                                        <path d="M4.22 4.22a.75.75 0 011.06 0L8 6.94l2.72-2.72a.75.75 0 011.06 1.06L9.06 8l2.72 2.72a.75.75 0 01-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 01-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 010-1.06z"/>
                                    </svg>
                                </button>
                            </div>
                        {/each}
                    </div>

                    <!-- Controls -->
                    <div class="px-4 pt-2 pb-4 flex flex-col gap-4 border-t border-neutral-100 dark:border-neutral-800">
                        <FormatSelector {format} onchange={handleFormatChange} />
                        <div class="border-t border-neutral-100 dark:border-neutral-800"></div>
                        <QualitySlider {quality} onchange={handleQualityChange} disabled={format === 'image/png'} />
                        {#if format !== 'image/png'}
                            <div class="border-t border-neutral-100 dark:border-neutral-800"></div>
                        {/if}
                        {#if selectedItem}
                            <ResizeControl
                                    enabled={cropEnabled}
                                    width={crop.width || selectedItem.width}
                                    height={crop.height || selectedItem.height}
                                    lockAspect={cropLockAspect}
                                    originalWidth={selectedItem.width}
                                    originalHeight={selectedItem.height}
                                    ontoggle={handleCropToggle}
                                    ontogglelock={handleCropLockToggle}
                                    onchange={handleCropChange}
                            />
                        {/if}
                    </div>
                </div>

                <!-- Footer: download + batch -->
                <div class="shrink-0 p-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
                    <div class="flex gap-2">
                        <Button
                                onclick={downloadSelected}
                                disabled={!selectedItem?.convertedBlob || selectedItem?.converting}
                                class="flex-1"
                        >
                            {selectedItem?.converting ? 'Converting…' : 'Download'}
                            {#if selectedItem && !selectedItem.converting && savings !== null && savings > 0}
                                <span class="opacity-70 text-xs ml-1">−{savings}%</span>
                            {/if}
                        </Button>
                        <button
                                onclick={copyToClipboard}
                                disabled={!selectedItem?.convertedBlob || selectedItem?.converting}
                                class="px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed
                     {copyState === 'copied'
                       ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
                       : copyState === 'error'
                       ? 'border-red-400 text-red-500'
                       : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'}"
                                title="Copy to clipboard"
                        >
                            {copyState === 'copied' ? '✓ Copied' : copyState === 'error' ? 'Failed' : 'Copy'}
                        </button>
                    </div>
                    {#if items.length > 1}
                        <div class="flex gap-2">
                            <Button onclick={handleDownloadAll} disabled={downloadingZip} class="flex-1 text-xs">
                                {downloadingZip ? 'Zipping…' : `All (${items.length})`}
                            </Button>
                            <Button variant="secondary" onclick={clearAll} class="flex-1 text-xs">Clear</Button>
                        </div>
                    {:else}
                        <Button variant="secondary" onclick={clearAll} class="w-full text-xs">Clear all</Button>
                    {/if}

                    <!-- Keyboard hints -->
                    <p class="text-center text-neutral-400 dark:text-neutral-600" style="font-size: 10px; line-height: 1.5;">
                        ←→ divider · ↑↓ image · R reset · D diff
                    </p>
                </div>
            </aside>

        </div>
    {/if}

    <!-- Toast notification -->
    {#if toast}
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div class="text-sm text-white px-4 py-2.5 rounded-xl shadow-lg"
                 style="background: rgba(20,20,20,0.88); backdrop-filter: blur(8px)">
                {toast}
            </div>
        </div>
    {/if}
</div>