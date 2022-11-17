<!-- @component
    Renders a button with optional icon and text
 -->
 <script lang="ts">
    import type { IconName } from "./Icon.svelte";

    import Icon from "./Icon.svelte";

    type ButtonType = "borderless"
        | "danger"
        | "primary"
        | "reward"
        | "subdued-light"
        | "subdued-dark";

    export let type: ButtonType = "primary";
    export let size: "nano" | "mini" | "max" | "auto" = "auto";
    /**
     * The icon name
     */
    export let icon: IconName = "";
    /**
     * Disable the button and add class "disabled"
     */
    export let disabled = false;
    /**
     * A text for tooltip
     */
    export let hint: string | null = null;
</script>

<svelte:options immutable/>

<button on:click class="{type} {size}" {disabled} title={hint}>
    {#if icon}<Icon {icon} size="14px"/>{/if}
    {#if $$slots.default}<slot/>{/if}
</button>

<style>
    button {
        border: none;
        padding: 10px 15px;
        color: white;
        font-family: locator-web,Helvetica Neue,Helvetica,Arial,sans-serif;
        text-transform: uppercase;
        letter-spacing: .05em;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.2em;
        text-rendering: optimizeLegibility;
        border-radius: 4px;
        user-select: none;
        cursor: pointer;
        background: none;
        outline: none;
        box-shadow: inset 0 -1px 0 0 #0003;
        display: flex;
        align-items: center;
        gap: .5ch;
    }
    button.nano {
        padding: 7px;
    }
    button.mini {
        padding: 10px;
    }
    button.max {
        width: 100%;
        border-radius: 0;
        justify-content: center;
    }
    button:disabled {
        color: #786e83;
        background-color: #0002;
        cursor: default;
        pointer-events: none;
    }
    button:not(:disabled):hover {
        box-shadow: inset 0 0 0 30px #fff3, inset 0 -1px 0 0 #0003;
    }
    button:not(:disabled):active {
        box-shadow: inset 0 0 0 30px #fff3, inset 0 1px 0 0 #0003;
        position: relative;
        top: 1px;
    }
    .reward {
        background-color: #4BBBF5;
    }
    .primary {
        background-color: #C18BF2;
    }
    .danger {
        background-color: #E82C8E;
    }
    .subdued-dark {
        box-shadow: inset 0 0 0 1px #fff6;
    }
    .subdued-dark:not(:disabled):hover, .subdued-dark:not(:disabled):active {
        box-shadow: inset 0 0 0 30px #fff2, inset 0 0 0 1px #fffa;
    }
    .subdued-light {
        color: #39343E;
        box-shadow: inset 0 0 0 1px #0003;
    }
    .borderless, button.borderless:hover, button.borderless:active {
        color: #39343E;
        box-shadow: none;
        padding: 0;
    }
    button.subdued-light:active {
        box-shadow: inset 0 0 0 1px #0007, inset 0 1px 0 0 #0003;
    }
    button:not(:disabled).subdued-light:hover {
        box-shadow: inset 0 0 0 1px #0007, inset 0 -1px 0 0 #0003;
    }
</style>
