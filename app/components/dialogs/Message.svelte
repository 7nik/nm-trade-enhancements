<!-- @component
    A dialog window to display a simple messages
 -->
<script lang="ts">
    import type { IconName } from "../elements/Icon.svelte";

    import DialogWindow from "./DialogWindow.svelte";
    import Button from "../elements/Button.svelte";
    import Icon from "../elements/Icon.svelte";

    /**
     * The title of the message
     */
    export let title: string;
    /**
     * The message description
     */
    export let text = "";
    /**
     * Buttons labels
     */
     export let buttons = ["OK"];
    /**
     * The message's icon
     */
    export let icon: IconName = "warning";
    /**
     * Blur the background
     */
    // export let blurry = false;

    let close: (reason: string | null) => void;

    interface $$Events {
        closed: CustomEvent<string | null>
    }
</script>

<DialogWindow bind:close on:closed>
    <div>
        {#if icon}<Icon {icon} size="60px" />{/if}
        <header>{title}</header>
        {#if text}<p>{text}</p>{/if}
        <slot/>
        <menu>
            {#each buttons as button}
                <Button type="subdued-dark" on:click={() => close(button)}>
                    <span id="{button.toLowerCase()}-btn">{button}</span>
                </Button>
            {/each}
        </menu>
    </div>
</DialogWindow>

<style>
    div {
        border-radius: 4px;
        padding: 20px;
        box-shadow: 0 0 0 5px #fff3, 0 0 2px 2px #0002;
        background-color: #1a1417;
        color: white;
        width: 300px;
        box-sizing: border-box;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.2em;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
    }
    div::after {
        content: "";
        height: 4px;
        background-position: bottom left;
        background-repeat: repeat-x;
        background: linear-gradient(90deg, #B078B1, #B5CE80, #51B2D5, #B078B1);
        width: 100%;
        position: absolute;
        bottom: 0;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
    }
    header {
        font-size: 18px;
        margin-top: -10px;
    }
    p {
        margin: 0;
    }
    menu {
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1ch;
    }
</style>
