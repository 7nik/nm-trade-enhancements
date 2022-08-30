<!-- @component
    Renders a button with optional icon and text
 -->
 <script lang="ts">
    let className = "";
    /**
     * Additional CSS classes of the button
     */
    export { className as class };
    /**
     * CSS class of the icon to display
     */
    export let icon = "";
    /**
     * Disable the button and add class "disabled"
     */
    export let disabled = false;
    /**
     * A text for tooltip
     */
    export let title: string | null = null; 
</script>

<svelte:options immutable/>

<button on:click class="btn {className}" class:disabled {disabled} {title}>
    {#if icon}<i class=icon-{icon}></i>{/if}
    {#if $$slots.default}<span><slot/></span>{/if}
</button>
