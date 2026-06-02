<script lang="ts">
    import type { ImageItem, Format, CropOptions } from '../types.js';
    import { formatBytes } from '../utils/filesize.js';
    import CropFrame from './CropFrame.svelte';

    interface Props {
        item: ImageItem;
        format: Format;
        crop?: CropOptions;
        lockAspect?: boolean;
        oncropchange?: (c: { x: number; y: number; width: number; height: number }) => void;
    }

    let { item, format, crop, lockAspect = true, oncropchange }: Props = $props();

    let outerEl = $state<HTMLDivElement>();
    let transformEl = $state<HTMLDivElement>();

    let pos    = $state(50);
    let zoom   = $state(1);
    let panX   = $state(0);
    let panY   = $state(0);
    let dragMode = $state<'none' | 'compare' | 'pan'>('none');
    let diffMode = $state(false);
    let isDark   = $state(false);

    $effect(() => {
        isDark = document.documentElement.classList.contains('dark');
        const observer = new MutationObserver(() => {
            isDark = document.documentElement.classList.contains('dark');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    });

    // Mutable pan start — not reactive, only needed during a drag
    let panStart = { x: 0, y: 0, px: 0, py: 0 };

    let originalUrl  = $state('');
    let convertedUrl = $state('');

    const formatLabels: Record<Format, string> = {
        'image/png':  'PNG',
        'image/jpeg': 'JPEG',
        'image/webp': 'WebP',
    };

    const cursor = $derived(
        dragMode === 'pan' ? 'grabbing' :
            zoom > 1           ? 'grab'     :
                'default'
    );

    $effect(() => {
        const url = URL.createObjectURL(item.file);
        originalUrl = url;
        return () => URL.revokeObjectURL(url);
    });

    $effect(() => {
        const blob = item.convertedBlob;
        if (!blob) { convertedUrl = ''; return; }
        const url = URL.createObjectURL(blob);
        convertedUrl = url;
        return () => URL.revokeObjectURL(url);
    });

    // Reset view when switching images
    $effect(() => {
        void item.id;
        zoom = 1; panX = 0; panY = 0; pos = 50; diffMode = false;
    });

    // Reset zoom/pan when crop mode activates so imageRect calc is accurate
    $effect(() => {
        if (crop?.enabled) { zoom = 1; panX = 0; panY = 0; }
    });

    function onKeyDown(e: KeyboardEvent) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.key === 'ArrowLeft')             { e.preventDefault(); pos = Math.max(2,  pos - 2); }
        else if (e.key === 'ArrowRight')       { e.preventDefault(); pos = Math.min(98, pos + 2); }
        else if (e.key === 'r' || e.key === 'R') resetView();
        else if (e.key === 'd' || e.key === 'D') diffMode = !diffMode;
    }

    // Non-passive wheel listener so preventDefault works; disabled during crop
    $effect(() => {
        const el = outerEl;
        if (!el) return;
        function handler(e: WheelEvent) {
            e.preventDefault();
            if (crop?.enabled) return; // zoom disabled while crop frame is active
            const rect = el!.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width  / 2;
            const cy = e.clientY - rect.top  - rect.height / 2;
            const factor  = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const newZoom = Math.max(0.25, Math.min(10, zoom * factor));
            panX = cx - (cx - panX) * (newZoom / zoom);
            panY = cy - (cy - panY) * (newZoom / zoom);
            zoom = newZoom;
        }
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    });

    function onContainerDown(e: PointerEvent) {
        if (dragMode !== 'none') return;
        dragMode = 'pan';
        panStart = { x: e.clientX, y: e.clientY, px: panX, py: panY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onHandleDown(e: PointerEvent) {
        e.stopPropagation();
        dragMode = 'compare';
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
        if (dragMode === 'pan') {
            panX = panStart.px + (e.clientX - panStart.x);
            panY = panStart.py + (e.clientY - panStart.y);
        } else if (dragMode === 'compare' && transformEl) {
            const rect = transformEl.getBoundingClientRect();
            pos = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
        }
    }

    function onPointerUp() {
        dragMode = 'none';
    }

    function resetView() {
        zoom = 1; panX = 0; panY = 0;
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
        bind:this={outerEl}
        role="application"
        aria-label="Image comparison viewer"
        class="w-full h-full relative overflow-hidden select-none"
        style="cursor: {cursor};
         background-color: {diffMode ? '#000' : isDark ? '#1e1e1e' : '#e5e5e5'};
         background-image: {diffMode ? 'none' :
           `linear-gradient(45deg,  ${isDark ? '#2a2a2a' : '#ccc'} 25%, transparent 25%),
            linear-gradient(-45deg, ${isDark ? '#2a2a2a' : '#ccc'} 25%, transparent 25%),
            linear-gradient(45deg,  transparent 75%, ${isDark ? '#2a2a2a' : '#ccc'} 75%),
            linear-gradient(-45deg, transparent 75%, ${isDark ? '#2a2a2a' : '#ccc'} 75%)`};
         background-size: 20px 20px;
         background-position: 0 0, 0 10px, 10px -10px, -10px 0px;"
        onpointerdown={onContainerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
>
    <!-- Transform layer — zoom + pan applied here -->
    <div
            bind:this={transformEl}
            class="absolute inset-0"
            style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 50% 50%; will-change: transform;"
    >
        {#if diffMode}
            <!-- Difference mode: abs(converted − original) per channel. Black = identical, colour = changed. -->
            {#if originalUrl}
                <img src={originalUrl} alt="Original"
                     class="absolute inset-0 w-full h-full object-contain pointer-events-none"
                     draggable="false" />
            {/if}
            {#if convertedUrl}
                <img src={convertedUrl} alt="Converted"
                     class="absolute inset-0 w-full h-full object-contain pointer-events-none"
                     style="mix-blend-mode: difference"
                     draggable="false" />
            {/if}
        {:else}
            <!-- Normal compare mode -->
            <!-- Original (left side — base layer) -->
            {#if originalUrl}
                <img src={originalUrl} alt="Original"
                     class="absolute inset-0 w-full h-full object-contain pointer-events-none"
                     draggable="false" />
            {/if}

            <!-- Converted (right side — clipped from the left) — hidden in crop mode -->
            {#if convertedUrl && !crop?.enabled}
                <img src={convertedUrl} alt="Converted"
                     class="absolute inset-0 w-full h-full object-contain pointer-events-none"
                     style="clip-path: inset(0 0 0 {pos}%)"
                     draggable="false" />
            {/if}

            <!-- Divider line + handle — hidden in crop mode -->
            {#if !crop?.enabled}
                <div class="absolute top-0 bottom-0 w-px pointer-events-none"
                     style="left: {pos}%; background: rgba(255,255,255,0.9); box-shadow: 0 0 4px rgba(0,0,0,0.3);">
                </div>

                <button
                        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-9 rounded-full
                 bg-white shadow-lg flex items-center justify-center z-10"
                        style="left: {pos}%; touch-action: none; cursor: ew-resize;"
                        onpointerdown={onHandleDown}
                        aria-label="Drag to compare"
                >
                    <svg viewBox="0 0 16 16" class="size-4 fill-current text-neutral-600">
                        <path d="M5.5 3L2 8l3.5 5V3zm5 0v10L14 8l-3.5-5z"/>
                    </svg>
                </button>
            {/if}
        {/if}
    </div>

    <!-- Crop frame overlay — outside transformEl so it's unaffected by zoom/pan -->
    {#if crop?.enabled && oncropchange}
        <CropFrame
                imageWidth={item.width}
                imageHeight={item.height}
                crop={{ x: crop.x, y: crop.y, width: crop.width, height: crop.height }}
                {lockAspect}
                onchange={oncropchange}
        />
    {/if}

    <!-- Labels — hidden in diff mode and crop mode -->
    {#if !diffMode && !crop?.enabled}
        {#if pos > 15}
            <div class="absolute bottom-3 left-3 lg:left-[372px] text-xs text-white rounded-full px-2.5 py-1 pointer-events-none z-10"
                 style="background: rgba(0,0,0,0.45); backdrop-filter: blur(4px)">
                Original · {formatBytes(item.originalSize)}
            </div>
        {/if}

        {#if pos < 85}
            <div class="absolute bottom-3 right-3 text-xs text-white rounded-full px-2.5 py-1 pointer-events-none z-10"
                 style="background: rgba(0,0,0,0.45); backdrop-filter: blur(4px)">
                {formatLabels[format]} ·
                {#if item.converting}
                    <span class="opacity-60">converting…</span>
                {:else if item.convertedSize}
                    {formatBytes(item.convertedSize)}
                {:else}…{/if}
            </div>
        {/if}
    {/if}

    <!-- Resolution + zoom level -->
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none
              text-xs text-white rounded-full px-3 py-1 flex items-center gap-2"
         style="background: rgba(0,0,0,0.35); backdrop-filter: blur(4px)">
        <span class="font-mono tabular-nums">{item.width} × {item.height}</span>
        {#if Math.round(zoom * 100) !== 100}
            <span class="opacity-50">·</span>
            <span class="tabular-nums">{Math.round(zoom * 100)}%</span>
        {/if}
    </div>

    <!-- Top-left controls: diff toggle — hidden in crop mode -->
    {#if !crop?.enabled}
        <div class="absolute top-3 left-3 lg:left-[372px] flex items-center gap-2 z-10">
            <button
                    onclick={() => (diffMode = !diffMode)}
                    onpointerdown={(e) => e.stopPropagation()}
                    class="text-xs text-white rounded-full px-3 py-1 cursor-pointer transition-opacity
               {diffMode ? 'opacity-100' : 'opacity-60 hover:opacity-100'}"
                    style="background: rgba(0,0,0,0.45); backdrop-filter: blur(4px)"
                    title="Toggle pixel difference view (D)"
            >
                {diffMode ? 'Diff on' : 'Diff'}
            </button>
        </div>
    {/if}
    {#if zoom !== 1 || panX !== 0 || panY !== 0}
        <button
                onclick={resetView}
                onpointerdown={(e) => e.stopPropagation()}
                class="absolute top-3 right-3 text-xs text-white rounded-full px-3 py-1 z-10
             cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                style="background: rgba(0,0,0,0.45); backdrop-filter: blur(4px)"
        >
            Reset view
        </button>
    {/if}
</div>