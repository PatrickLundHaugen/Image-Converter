<script lang="ts">
    const MIN_PX = 8;

    interface Crop { x: number; y: number; width: number; height: number; }
    type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

    interface Props {
        imageWidth: number;
        imageHeight: number;
        crop: Crop;
        lockAspect: boolean;
        onchange: (crop: Crop) => void;
    }

    let { imageWidth, imageHeight, crop, lockAspect, onchange }: Props = $props();

    let el: HTMLDivElement;
    let containerW = $state(0);
    let containerH = $state(0);

    // Drag state — plain vars, not reactive (only needed during a pointer gesture)
    let dragHandle: Handle | null = null;
    let dragStartClientX = 0;
    let dragStartClientY = 0;
    let dragStartCrop: Crop = { x: 0, y: 0, width: 0, height: 0 };

    $effect(() => {
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            containerW = entry.contentRect.width;
            containerH = entry.contentRect.height;
        });
        ro.observe(el);
        return () => ro.disconnect();
    });

    // Pixel rectangle where the image actually renders (object-contain letterboxing)
    const imageRect = $derived((() => {
        if (!containerW || !containerH) return { x: 0, y: 0, width: containerW, height: containerH };
        const cRatio = containerW / containerH;
        const iRatio = imageWidth / imageHeight;
        let w: number, h: number;
        if (iRatio > cRatio) { w = containerW; h = containerW / iRatio; }
        else                  { w = containerH * iRatio; h = containerH; }
        return { x: (containerW - w) / 2, y: (containerH - h) / 2, width: w, height: h };
    })());

    // Screen pixels per image pixel
    const scaleX = $derived(containerW ? imageRect.width / imageWidth   : 1);
    const scaleY = $derived(containerH ? imageRect.height / imageHeight : 1);

    // Crop in screen coordinates
    const frame = $derived({
        x:      imageRect.x + crop.x      * scaleX,
        y:      imageRect.y + crop.y      * scaleY,
        width:  crop.width  * scaleX,
        height: crop.height * scaleY,
    });

    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

    function startDrag(e: PointerEvent, handle: Handle) {
        e.preventDefault();
        e.stopPropagation();
        dragHandle       = handle;
        dragStartClientX = e.clientX;
        dragStartClientY = e.clientY;
        dragStartCrop    = { ...crop };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragHandle) return;

        // Delta in image pixel space
        const dx = (e.clientX - dragStartClientX) / scaleX;
        const dy = (e.clientY - dragStartClientY) / scaleY;
        const sc = dragStartCrop;

        let x = sc.x, y = sc.y, width = sc.width, height = sc.height;

        if (dragHandle === 'move') {
            x = clamp(sc.x + dx, 0, imageWidth  - sc.width);
            y = clamp(sc.y + dy, 0, imageHeight - sc.height);
        } else {
            let left   = sc.x;
            let right  = sc.x + sc.width;
            let top    = sc.y;
            let bottom = sc.y + sc.height;

            if (dragHandle.includes('w')) left   = clamp(sc.x + dx,            0,           right  - MIN_PX);
            if (dragHandle.includes('e')) right  = clamp(sc.x + sc.width  + dx, left  + MIN_PX, imageWidth);
            if (dragHandle.includes('n')) top    = clamp(sc.y + dy,            0,           bottom - MIN_PX);
            if (dragHandle.includes('s')) bottom = clamp(sc.y + sc.height + dy, top   + MIN_PX, imageHeight);

            // Aspect lock only on corners
            if (lockAspect && dragHandle.length === 2) {
                const ratio  = sc.width / sc.height;
                const newW   = right - left;
                const newH   = bottom - top;
                if (newW / ratio <= newH) {
                    // Width is the tighter constraint — derive height
                    const adjH = clamp(newW / ratio, MIN_PX, imageHeight);
                    if (dragHandle.includes('s')) bottom = top  + adjH;
                    else                          top    = bottom - adjH;
                } else {
                    // Height is tighter — derive width
                    const adjW = clamp(newH * ratio, MIN_PX, imageWidth);
                    if (dragHandle.includes('e')) right = left + adjW;
                    else                          left  = right - adjW;
                }
            }

            x = left; y = top; width = right - left; height = bottom - top;
        }

        onchange({
            x:      Math.round(x),
            y:      Math.round(y),
            width:  Math.round(width),
            height: Math.round(height),
        });
    }

    function stopDrag() { dragHandle = null; }

    const labelAbove = $derived(frame.y + frame.height > containerH - 28);

    const corners: { id: Handle; tw: string; cursor: string }[] = [
        { id: 'nw', tw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nw-resize' },
        { id: 'ne', tw: 'top-0 right-0  translate-x-1/2 -translate-y-1/2', cursor: 'ne-resize' },
        { id: 'sw', tw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'sw-resize' },
        { id: 'se', tw: 'bottom-0 right-0  translate-x-1/2  translate-y-1/2', cursor: 'se-resize' },
    ];

    const edges: { id: Handle; tw: string; cursor: string }[] = [
        { id: 'n', tw: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'n-resize' },
        { id: 's', tw: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 's-resize' },
        { id: 'w', tw: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'w-resize' },
        { id: 'e', tw: 'top-1/2 right-0  translate-x-1/2 -translate-y-1/2', cursor: 'e-resize' },
    ];
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={stopDrag} />

<div bind:this={el} class="absolute inset-0 overflow-hidden">

    <!-- Dark mask: four strips around the frame -->
    <div class="absolute inset-x-0 top-0 bg-black/55 pointer-events-none"
         style="height: {frame.y}px"></div>
    <div class="absolute inset-x-0 bottom-0 bg-black/55 pointer-events-none"
         style="top: {frame.y + frame.height}px"></div>
    <div class="absolute bg-black/55 pointer-events-none"
         style="top:{frame.y}px; height:{frame.height}px; left:0; width:{frame.x}px"></div>
    <div class="absolute bg-black/55 pointer-events-none"
         style="top:{frame.y}px; height:{frame.height}px; left:{frame.x + frame.width}px; right:0"></div>

    <!-- Frame -->
    <div
            role="group"
            aria-label="Crop frame — drag to move"
            class="absolute border border-white/90 select-none"
            style="left:{frame.x}px; top:{frame.y}px; width:{frame.width}px; height:{frame.height}px;
           cursor:move; touch-action:none; box-shadow: 0 0 0 1px rgba(0,0,0,0.4);"
            onpointerdown={(e) => startDrag(e, 'move')}
    >
        <!-- Rule-of-thirds grid -->
        <div class="absolute inset-0 pointer-events-none" style="opacity:0.3">
            <div class="absolute top-0 bottom-0 border-l border-white" style="left:33.33%"></div>
            <div class="absolute top-0 bottom-0 border-l border-white" style="left:66.66%"></div>
            <div class="absolute left-0 right-0 border-t border-white" style="top:33.33%"></div>
            <div class="absolute left-0 right-0 border-t border-white" style="top:66.66%"></div>
        </div>

        <!-- Corner handles -->
        {#each corners as h}
            <button
                    class="absolute size-3 bg-white rounded-sm border border-neutral-300 shadow-sm {h.tw}"
                    style="touch-action:none; cursor:{h.cursor};"
                    aria-label="Resize {h.id}"
                    onpointerdown={(e) => startDrag(e, h.id)}
            ></button>
        {/each}

        <!-- Edge handles -->
        {#each edges as h}
            <button
                    class="absolute size-2.5 bg-white/80 rounded-sm {h.tw}"
                    style="touch-action:none; cursor:{h.cursor};"
                    aria-label="Resize {h.id}"
                    onpointerdown={(e) => startDrag(e, h.id)}
            ></button>
        {/each}
    </div>

    <!-- Dimension label — below frame, or above if close to bottom -->
    <div
            class="absolute pointer-events-none text-xs text-white tabular-nums px-2 py-0.5 rounded"
            style="left:{frame.x}px;
           {labelAbove ? `top:${frame.y - 24}px` : `top:${frame.y + frame.height + 6}px`};
           background:rgba(0,0,0,0.55);"
    >
        {crop.width} × {crop.height}
    </div>
</div>