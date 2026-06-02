<script lang="ts">
    interface Props {
        quality: number;
        onchange: (quality: number) => void;
        disabled?: boolean;
    }

    let { quality, onchange, disabled = false }: Props = $props();

    function handleInput(e: Event) {
        onchange(Number((e.target as HTMLInputElement).value));
    }
</script>

{#if !disabled}
    <div class="flex items-center gap-3">
        <span class="text-sm text-neutral-500 dark:text-neutral-400 select-none">Quality</span>
        <div class="relative flex items-center w-28">
            <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    oninput={handleInput}
                    class="slider w-full"
                    aria-label="Conversion quality"
                    style="--pct: {(quality - 1) / 99 * 100}%"
            />
        </div>
        <span class="text-sm font-medium tabular-nums w-7 text-right text-neutral-600 dark:text-neutral-400">{quality}</span>
    </div>
{/if}

<style>
    .slider {
        -webkit-appearance: none;
        appearance: none;
        height: 2px;
        border-radius: 1px;
        outline: none;
        cursor: pointer;
        background: linear-gradient(
                to right,
                #dc2626 0%,
                #dc2626 var(--pct, 0%),
                #e5e5e5 var(--pct, 0%),
                #e5e5e5 100%
        );
    }

    @media (prefers-color-scheme: dark) {
        .slider {
            background: linear-gradient(
                    to right,
                    #dc2626 0%,
                    #dc2626 var(--pct, 0%),
                    #404040 var(--pct, 0%),
                    #404040 100%
            );
        }
    }

    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #dc2626;
        cursor: grab;
        transition: transform 0.12s ease, box-shadow 0.12s ease;
    }

    .slider:active::-webkit-slider-thumb {
        cursor: grabbing;
        transform: scale(1.15);
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
    }

    .slider::-moz-range-track {
        height: 2px;
        background: transparent;
        border: none;
    }

    .slider::-moz-range-progress {
        height: 2px;
        background: #dc2626;
        border-radius: 1px;
    }

    .slider::-moz-range-thumb {
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #dc2626;
        border: none;
        cursor: grab;
        transition: transform 0.12s ease, box-shadow 0.12s ease;
    }

    .slider:active::-moz-range-thumb {
        cursor: grabbing;
        transform: scale(1.15);
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
    }
</style>