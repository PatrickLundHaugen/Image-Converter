<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import { APP_CONTEXT_KEY, type AppContext } from './lib/context.js';
    import { theme } from './lib/stores/theme.js';
    import type { ImageItem, Format, CropOptions } from './lib/types.js';
    import { convertImage, getImageDimensions, isUnsupportedFormat } from './lib/utils/converter.js';
    import { downloadAllAsZip, downloadBlob, getOutputFilename } from './lib/utils/zip.js';
    import { formatBytes, savingsPercent } from './lib/utils/filesize.js';
    import DropZone from './lib/components/DropZone.svelte';
    import ComparisonViewer from './lib/components/ComparisonViewer.svelte';
    import Header from './lib/components/Header.svelte';
    import Sidebar from './lib/components/Sidebar.svelte';

    let items = $state<ImageItem[]>([]);
    let format = $state<Format>('image/webp');
    let quality = $state(85);
    let cropEnabled = $state(false);
    let cropLockAspect = $state(true);
    let crop = $state({ x: 0, y: 0, width: 0, height: 0 });
    let selectedId = $state<string | null>(null);
    let downloadingZip = $state(false);
    let copyState = $state<'idle' | 'copied' | 'error'>('idle');
    let toast = $state<string | null>(null);

    // Not reactive — just timer handles; declared near the functions that own them.
    let toastTimer: ReturnType<typeof setTimeout>;
    let debounceTimer: ReturnType<typeof setTimeout>;

    function showToast(msg: string) {
        toast = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (toast = null), 5000);
    }


    const selectedItem = $derived(
        (selectedId ? items.find((i) => i.id === selectedId) : null) ?? items[0] ?? null
    );

    onMount(() => {
        // Restore last used settings
        const savedFormat = localStorage.getItem('imgconv-format') as Format | null;
        const savedQuality = localStorage.getItem('imgconv-quality');
        if (savedFormat && ['image/png', 'image/jpeg', 'image/webp'].includes(savedFormat)) format = savedFormat;
        if (savedQuality) quality = Math.max(1, Math.min(100, Number(savedQuality)));

        // Keep dark class in sync when OS preference changes while theme is 'system'.
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onOsChange = () => {
            if ($theme === 'system') {
                document.documentElement.classList.toggle('dark', mq.matches);
            }
        };
        mq.addEventListener('change', onOsChange);

        return () => {
            mq.removeEventListener('change', onOsChange);
            clearTimeout(debounceTimer);
            clearTimeout(toastTimer);
        };
    });


    async function addFiles(files: File[]) {
        const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

        // Reject unsupported formats immediately with a toast; collect supported files.
        const supported: File[] = [];
        for (const file of files) {
            if (isUnsupportedFormat(file)) {
                showToast(`"${file.name}" is HEIC/HEIF — not supported by the browser. Convert to JPEG or PNG first.`);
                const item: ImageItem = {
                    id: crypto.randomUUID(), file, name: file.name,
                    originalSize: file.size, width: 0, height: 0,
                    unsupported: true, conversionId: 0, convertedBlob: null, convertedSize: null, thumbnailUrl: URL.createObjectURL(file),
                    converting: false, error: 'HEIC/HEIF not supported', lastSavings: null,
                };
                items.push(item);
                if (!selectedId) selectedId = item.id;
            } else {
                if (file.size > MAX_SIZE) {
                    showToast(`"${file.name}" is large (${formatBytes(file.size)}) — conversion may be slow`);
                }
                supported.push(file);
            }
        }

        // Read all dimensions in parallel rather than sequentially.
        const dims = await Promise.all(supported.map(getImageDimensions));

        for (let i = 0; i < supported.length; i++) {
            const file = supported[i];
            const { width, height } = dims[i];
            // Create the URL immediately before push so it's always reachable via items[] for cleanup.
            const thumbnailUrl = URL.createObjectURL(file);
            const item: ImageItem = {
                id: crypto.randomUUID(), file, name: file.name,
                originalSize: file.size, width, height,
                unsupported: false, conversionId: 0, convertedBlob: null, convertedSize: null, thumbnailUrl,
                converting: true, error: null, lastSavings: null,
            };
            items.push(item);
            if (!selectedId) selectedId = item.id;
            void convertItem(item.id);
        }
    }

    const currentCrop = $derived<CropOptions | undefined>(
        cropEnabled && crop.width && crop.height
            ? { enabled: true, ...crop }
            : undefined
    );

    async function convertItem(id: string) {
        const item = items.find((i) => i.id === id);
        if (!item) return;
        const generation = ++item.conversionId;
        item.converting = true;
        item.error = null;
        try {
            const blob = await convertImage(item.file, format, quality, currentCrop);
            // Discard result if a newer conversion started while this one was in flight
            if (item.conversionId !== generation) return;
            item.convertedBlob = blob;
            item.convertedSize = blob.size;
            item.lastSavings = savingsPercent(item.originalSize, blob.size);
        } catch {
            if (item.conversionId !== generation) return;
            item.error = 'Conversion failed';
        } finally {
            if (item.conversionId === generation) item.converting = false;
        }
    }

    function reconvertAll() {
        for (const item of items) {
            if (item.unsupported) continue; // permanent — browser can't decode this format
            void convertItem(item.id);
        }
    }

    // Persist format and quality to localStorage whenever they change.
    $effect(() => { localStorage.setItem('imgconv-format', format); });
    $effect(() => { localStorage.setItem('imgconv-quality', String(quality)); });

    function handleFormatChange(f: Format) {
        format = f;
        reconvertAll();
    }

    function debouncedReconvert() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(reconvertAll, 400);
    }

    function handleQualityChange(q: number) {
        quality = q;
        debouncedReconvert();
    }

    function handleCropToggle() {
        cropEnabled = !cropEnabled;
        if (cropEnabled && selectedItem) {
            crop = { x: 0, y: 0, width: selectedItem.width, height: selectedItem.height };
        } else if (selectedItem) {
            const isFullImage =
                crop.x === 0 && crop.y === 0 &&
                crop.width === selectedItem.width &&
                crop.height === selectedItem.height;
            if (!isFullImage) reconvertAll();
        }
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
        debouncedReconvert();
    }

    function handleCropFrameChange(c: { x: number; y: number; width: number; height: number }) {
        crop = c;
    }

    function removeItem(id: string) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx === -1) return;
        URL.revokeObjectURL(items[idx].thumbnailUrl);
        items.splice(idx, 1);
        if (selectedId === id) {
            // After splice: items[idx] is the next item (if any), items[idx-1] is the previous.
            // Prefer the next item so the selection moves forward; fall back to previous.
            selectedId = items[idx]?.id ?? items[idx - 1]?.id ?? null;
        }
    }

    function clearAll() {
        for (const item of items) URL.revokeObjectURL(item.thumbnailUrl);
        items = [];
        selectedId = null;
    }

    async function handleDownloadAll() {
        downloadingZip = true;
        await downloadAllAsZip(items, format);
        downloadingZip = false;
    }

    function downloadSelected() {
        // convertedBlob retains the last successful result during reconversion, so this
        // always downloads the most recent completed output even if converting is true.
        if (selectedItem?.convertedBlob)
            downloadBlob(selectedItem.convertedBlob, getOutputFilename(selectedItem.name, format));
    }

    async function copyToClipboard() {
        const blob = selectedItem?.convertedBlob;
        if (!blob) return;
        try {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            copyState = 'copied';
        } catch (err) {
            copyState = 'error';
            // ClipboardItem rejects for unsupported MIME types (e.g. WebP on Safari) or
            // when the page doesn't have clipboard-write permission.
            const isTypeError = err instanceof DOMException && err.name === 'NotAllowedError';
            const isWebP = blob.type === 'image/webp';
            if (isWebP && isTypeError) {
                showToast("Copy failed — your browser doesn't support copying WebP. Try JPEG or PNG.");
            } else if (isTypeError) {
                showToast('Clipboard access was denied. Check your browser permissions.');
            } else {
                showToast('Copy failed — your browser may not support this format.');
            }
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

    // Expose state and actions to child components via context.
    // Using a getter object so derived/state values remain reactive when read in children.
    setContext<AppContext>(APP_CONTEXT_KEY, {
        get items()          { return items; },
        get selectedItem()   { return selectedItem; },
        get format()         { return format; },
        get quality()        { return quality; },
        get copyState()      { return copyState; },
        get downloadingZip() { return downloadingZip; },
        get cropEnabled()    { return cropEnabled; },
        get crop()           { return crop; },
        get cropLockAspect() { return cropLockAspect; },
        addFiles,
        selectItem: (id) => { selectedId = id; },
        removeItem,
        handleFormatChange,
        handleQualityChange,
        handleCropToggle,
        handleCropLockToggle,
        handleCropChange,
        downloadSelected,
        copyToClipboard,
        handleDownloadAll,
        clearAll,
    });
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors">

    <Header />

    {#if items.length === 0}
        <main class="flex-1 flex items-center justify-center p-8">
            <div class="w-full max-w-lg flex flex-col gap-6">
                <div class="text-center flex flex-col gap-2">
                    <h2 class="font-display text-3xl font-semibold tracking-tight">Image Converter</h2>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400">
                        Convert and crop images to PNG, JPEG, or WebP right in your browser.
                    </p>
                </div>
                <DropZone onfiles={addFiles} />
                <p class="text-xs text-center text-neutral-400 dark:text-neutral-600">
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
                            crop={currentCrop}
                            lockAspect={cropLockAspect}
                            oncropchange={handleCropFrameChange}
                    />
                {/if}
            </div>

            <Sidebar />

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