<!-- @component
    A window to display a message with anything.
 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicIn } from "svelte/easing";
    import Button from "../elements/Button.svelte";

    /**
     * Buttons labels
     */
    export let buttons: string[] = [];
    /**
     * Wether the window can be closed by clicking the background
     */
    export let cancelable = true;
    /**
     * Extra CSS classes of the window
     */
    export let styleClass = "";
    /**
     * Dim the background
     */
    export let blurry = false;
    /**
     * The dialog was closed.
     * @param button - name of the pressed button or `null`
     */
    export let onclose: (button: string|null) => any = (button) => {button};
    
    // to show in and out transition
    let show = false, closed = false;
    onMount(() => {
        show = true;
    });
    onDestroy(() => {
        if (!closed) close(null);
    })
    export function close(button: string|null) {
        show = false;
        closed = true;
        setTimeout(onclose, 200, button);
    }
</script>

{#if show}
    <div id="message" class="nm-alert nm-alert-strict show {styleClass}"
        class:nm-alert-blur={blurry}
        on:click|self={() => { if (cancelable) close(null); }}
        in:fly={{ y: -1000, duration: 200 }}
        out:fly={{ y: -1000, duration: 200, easing: cubicIn }}
    >
        <span class="nm-alert-message theme-dark theme-dark-background">
            <slot/>
            <br>
            {#each buttons as button}            
                <Button class="nm-alert-ok subdued" on:click={() => close(button)}>
                    <span id="{button.toLowerCase()}-btn">{button}</span>
                </Button>    
            {/each}
        </span>
    </div>
{/if}
