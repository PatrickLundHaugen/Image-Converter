<script lang="ts">
    import { ChevronsLeftRight } from "@lucide/svelte";

    import { isDark } from '../stores/theme.js';
    import type { ImageItem, Format, CropOptions } from '../types.js';
    import { FORMAT_LABELS } from '../types.js';
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

    let panStart = { x: 0, y: 0, px: 0, py: 0 };

    let convertedUrl = $state('');

    const checkerBg = $derived.by(() => {
        const mid  = $isDark ? '#2a2a2a' : '#ccc';
        const base = $isDark ? '#1e1e1e' : '#e5e5e5';
        return [
            `background-color: ${base}`,
            `background-image:` +
            ` linear-gradient(45deg,  ${mid} 25%, transparent 25%),` +
            ` linear-gradient(-45deg, ${mid} 25%, transparent 25%),` +
            ` linear-gradient(45deg,  transparent 75%, ${mid} 75%),` +
            ` linear-gradient(-45deg, transparent 75%, ${mid} 75%)`,
            'background-size: 20px 20px',
            'background-position: 0 0, 0 10px, 10px -10px, -10px 0px',
        ].join('; ');
    });

    $effect(() => {
        const blob = item.convertedBlob;
        if (!blob) { if (!diffMode) convertedUrl = ''; return; }
        const url = URL.createObjectURL(blob);
        convertedUrl = url;
        return () => URL.revokeObjectURL(url);
    });

    $effect(() => {
        void item.id;
        zoom = 1; panX = 0; panY = 0; pos = 50;
    });

    $effect(() => {
        if (crop?.enabled) { zoom = 1; panX = 0; panY = 0; }
    });

    function onKeyDown(e: KeyboardEvent) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); pos = Math.max(2,  pos - 2); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); pos = Math.min(98, pos + 2); }
        else if (e.key === 'r' || e.key === 'R') resetView();
        else if (e.key === 'd' || e.key === 'D') diffMode = !diffMode;
    }

    $effect(() => {
        const el = outerEl;
        if (!el) return;
        function handler(e: WheelEvent) {
            e.preventDefault();
            if (crop?.enabled) return;
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
        if (crop?.enabled) return;
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
        } else if (dragMode === 'compare' && transformEl && outerEl) {
            const rect = transformEl.getBoundingClientRect();
            const cw = outerEl.clientWidth;
            const ch = outerEl.clientHeight;
            const scale = Math.min(cw / item.width, ch / item.height);
            const renderedW = item.width * scale;
            const leftPct = ((cw - renderedW) / 2 / cw) * 100;
            const rightPct = leftPct + (renderedW / cw) * 100;
            pos = Math.max(leftPct, Math.min(rightPct, ((e.clientX - rect.left) / rect.width) * 100));
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
        class="size-full relative overflow-hidden select-none {dragMode === 'pan' ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'}"
        style="{checkerBg}"
        onpointerdown={onContainerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
>
    <div
            bind:this={transformEl}
            class="absolute inset-0"
            style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 50% 50%; will-change: transform;"
    >
        {#if diffMode}
            <div class="absolute inset-0 isolate">
                {#if item.thumbnailUrl}
                    <img src={item.thumbnailUrl} alt="Original"
                         class="absolute inset-0 size-full object-contain pointer-events-none"
                         style="clip-path: inset(1px)"
                         draggable="false" />
                {/if}
                {#if convertedUrl}
                    <img src={convertedUrl} alt="Converted"
                         class="absolute inset-0 size-full object-contain pointer-events-none mix-blend-difference"
                         style="clip-path: inset(1px)"
                         draggable="false" />
                {/if}
            </div>
        {:else}
            {#if crop?.enabled}
                <img src={convertedUrl || item.thumbnailUrl} alt="Preview"
                     class="absolute inset-0 size-full object-contain pointer-events-none"
                     draggable="false" />
            {:else if item.thumbnailUrl}
                <img src={item.thumbnailUrl} alt="Original"
                     class="absolute inset-0 size-full object-contain pointer-events-none"
                     draggable="false" />
            {/if}

            {#if convertedUrl && !crop?.enabled && !item.converting}
                <img src={convertedUrl} alt="Converted"
                     class="absolute inset-0 size-full object-contain pointer-events-none transition-opacity"
                     style="clip-path: inset(0 0 0 {pos}%)"
                     draggable="false" />
            {/if}

            {#if !crop?.enabled}
                <div class="absolute top-0 bottom-0 w-px pointer-events-none bg-white/90"
                     style="left: {pos}%">
                </div>

                <button class="absolute top-1/2 -translate-1/2 size-9 rounded-full
                 bg-white shadow-lg flex items-center justify-center z-10 cursor-ew-resize touch-none"
                        style="left: {pos}%;"
                        onpointerdown={onHandleDown}
                        aria-label="Drag to compare"
                >
                    <ChevronsLeftRight class="size-4 text-neutral-600"/>
                </button>
            {/if}
        {/if}
    </div>

    {#if crop?.enabled && oncropchange}
        <CropFrame
                imageWidth={item.width}
                imageHeight={item.height}
                crop={{ x: crop.x, y: crop.y, width: crop.width, height: crop.height }}
                {lockAspect}
                onchange={oncropchange}
        />
    {/if}

    {#if pos > 15}
        <div class="absolute bottom-3 left-3 lg:left-[372px] bg-black/45 text-xs text-white rounded-full px-2.5 py-1 pointer-events-none z-10 backdrop-blur-xs">
            Original · {formatBytes(item.originalSize)}
        </div>
    {/if}

    {#if pos < 85}
        <div class="absolute bottom-3 right-3 bg-black/45 text-xs text-white rounded-full px-2.5 py-1 pointer-events-none z-10 transition-opacity backdrop-blur-xs class:opacity-50={item.converting}">
            {FORMAT_LABELS[format]} ·
            {item.convertedSize ? formatBytes(item.convertedSize) : '…'}
        </div>
    {/if}

    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/45 pointer-events-none text-xs text-white rounded-full px-3 py-1 flex items-center gap-2 backdrop-blur-xs">
        <span>{item.width} x {item.height}</span>
        {#if Math.round(zoom * 100) !== 100}
            <span class="opacity-50">·</span>
            <span>{Math.round(zoom * 100)}%</span>
        {/if}
    </div>

    <!-- Top-left controls: diff toggle — hidden in crop mode -->
    {#if !crop?.enabled}
        <div class="absolute top-3 left-3 lg:left-[372px] flex items-center gap-2 z-10">
            <button onclick={() => (diffMode = !diffMode)}
                    onpointerdown={(e) => e.stopPropagation()}
                    class="bg-black/45 text-xs text-white rounded-full px-3 py-1 cursor-pointer backdrop-blur-xs transition-opacity {diffMode ? 'opacity-100' : 'opacity-60 hover:opacity-100'}"
                    title="Toggle pixel difference view (D)">
                {diffMode ? 'Diff on' : 'Diff'}
            </button>
        </div>
    {/if}
    {#if zoom !== 1 || panX !== 0 || panY !== 0}
        <button onclick={resetView}
                onpointerdown={(e) => e.stopPropagation()}
                class="absolute top-3 right-3 bg-black/45 text-xs text-white rounded-full px-3 py-1 z-10 cursor-pointer backdrop-blur-xs opacity-70 hover:opacity-100 transition-opacity">
            Reset view
        </button>
    {/if}
</div>