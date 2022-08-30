<!-- @component
    A dialog window to display a simple messages
 -->
<script lang="ts">
    import DialogWindow from "./DialogWindow.svelte";

    /**
     * The title of the message
     */
    export let message: string;
    /**
     * The message description
     */
    export let subtext = "";
    /**
     * Buttons labels
     */
     export let buttons = ["OK"];
    /**
     * CSS class of the message icon
     */
    export let iconClass = "";
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
     * @param button - index of the pressed button or -1
     */
    export let onclose: (button: string|null) => any = (button) => {button};
</script>

<DialogWindow {buttons} {styleClass} {blurry} {onclose}>
    <span class="nm-alert-icon">
        <i id="message-icon" class={iconClass}></i>
    </span>
    <p id="message-text" class="text-body-large text-prominent">{message}</p>
    <p id="message-subtext" class="text-body text-prominent">{subtext}</p>
</DialogWindow>
