<script lang="ts">
    import { onMount } from "svelte";
    import { Upload } from "@lucide/svelte";

    interface Props {
        onfiles: (files: File[]) => void;
    }

    let { onfiles }: Props = $props();

    let dragOver = $state(false);
    let inputEl: HTMLInputElement;

    function filterImages(files: File[]): File[] {
        return files.filter((f) => f.type.startsWith("image/"));
    }

    function handleFiles(raw: FileList | File[]) {
        const images = filterImages(Array.from(raw));
        if (images.length) onfiles(images);
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragOver = false;
        if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        dragOver = true;
    }

    function handleDragLeave(e: DragEvent) {
        // Only clear if leaving the drop zone itself, not a child element
        if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) {
            dragOver = false;
        }
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files) handleFiles(target.files);
        target.value = "";
    }

    onMount(() => {
        function handlePaste(e: ClipboardEvent) {
            const files = Array.from(e.clipboardData?.items ?? [])
                .filter((i) => i.type.startsWith("image/"))
                .map((i) => i.getAsFile())
                .filter((f): f is File => f !== null);

            if (files.length) onfiles(files);
        }

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    });
</script>

<div
        class="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
         py-10 px-6 cursor-pointer transition-colors
         {dragOver
           ? 'border-red-600 bg-red-600/10'
           : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500'}"
        role="button"
        tabindex="0"
        aria-label="Drop zone: drop images, click to browse, or paste from clipboard"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        onclick={() => inputEl.click()}
        onkeydown={(e) => e.key === "Enter" && inputEl.click()}
>
    <Upload class="size-6 text-neutral-500" />

    <p class="text-sm text-neutral-500 text-center select-none">
        Drop images here, click to browse, or paste from clipboard
    </p>

    <input
            bind:this={inputEl}
            type="file"
            accept="image/*"
            multiple
            class="sr-only"
            oninput={handleInput}
    />
</div>