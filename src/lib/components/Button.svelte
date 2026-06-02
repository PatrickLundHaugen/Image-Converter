<script module lang="ts">
    import { type VariantProps, tv } from "tailwind-variants";

    export const buttonVariants = tv({
        base:
            "inline-flex items-center justify-center shrink-0 whitespace-nowrap " +
            "rounded-md cursor-pointer transition-[colors, transform] select-none " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 " +
            "disabled:pointer-events-none disabled:opacity-50 " +
            "[&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4",
        variants: {
            variant: {
                primary: "bg-red-600 text-neutral-200 hover:bg-red-700",
                secondary: "bg-neutral-300/75 hover:bg-neutral-400/75 backdrop-blur-sm",
            },
            size: {
                default: "h-9 px-4 py-1.5 gap-0.5",
                icon: "size-9 p-0",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    });

    export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
    export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
</script>

<script lang="ts">
    import { cn } from "../utils.js";
    import type { HTMLButtonAttributes } from "svelte/elements";

    interface Props extends HTMLButtonAttributes {
        variant?: ButtonVariant;
        size?: ButtonSize;
        class?: string;
    }

    let {
        class: className,
        variant = "primary",
        size = "default",
        type = "button",
        disabled,
        children,
        ...restProps
    }: Props = $props();
</script>

<button
        data-slot="button"
        class={cn(buttonVariants({ variant, size }), className)}
        {type}
        {disabled}
        {...restProps}
>
    {@render children?.()}
</button>