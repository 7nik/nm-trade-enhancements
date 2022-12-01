<!-- @component
    A window to display a message with anything.
 -->
<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";

    type Reason = $$Generic;

    /**
     * Wether the window can be closed by clicking the background, default - yes
     */
    export let closeable = true;
    /**
     * Set BG blurry of the given color, default - no blur
     */
    export let blurry: null | string = null;

    const dispatch = createEventDispatcher<{
        closed: Reason | null,
    }>();

    let dialog: HTMLDialogElement;
    // to show in and out transition
    let opened = false;
    onMount(() => {
        if (blurry) {
            /**
             * The backdrop do not inherit CSS variables
             * thus have to use such a workaround
             * https://github.com/whatwg/fullscreen/issues/124
             */
            const klass = Math.random().toString(36).slice(2);
            const style = document.createElement("style");
            style.textContent = `dialog.c-${klass}::backdrop{--bg:${blurry};}`;
            dialog.append(style);
            dialog.classList.add(`c-${klass}`);
        }
        opened = true;
        dialog.showModal();
    });
    onDestroy(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (opened) close(null);
    });

    /**
     * Closes the dialog window
     * @param reason
     */
    export const close = (reason: Reason | null) => {
        if (!opened) return;
        opened = false;
        setTimeout(() => {
            dialog?.close();
            dispatch("closed", reason);
        }, 200);
    };

    function backdropClick (ev: MouseEvent) {
        if (!opened || !closeable) return;
        const rect = dialog.getBoundingClientRect();
        if (rect.left > ev.clientX
            || rect.right < ev.clientX
            || rect.top > ev.clientY
            || rect.bottom < ev.clientY
        ) {
            close(null);
        }
    }
</script>

<dialog bind:this={dialog} on:click|self={backdropClick}
    class:opened class:blurry
>
    <slot/>
</dialog>

<style>
    dialog {
        margin: 0 auto;
        padding: 0;
        top: 50vh;
        transform: translateY(-100vh) scale(0);
        transition: transform 0.1s ease-in-out;
        border: none;
        background: transparent;
        overflow: visible;
    }
    dialog.opened {
        transform: translateY(-50%) scale(1);
    }
    dialog::backdrop {
        opacity: 0;
        transition: opacity 0.1s ease-in-out;
        background: transparent;
    }
    dialog.blurry::backdrop {
        background: var(--bg, transparent);
        backdrop-filter: blur(3px);
    }
    dialog.opened::backdrop {
        opacity: 1;
    }
</style>
