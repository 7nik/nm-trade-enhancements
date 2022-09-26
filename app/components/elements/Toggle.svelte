<!-- @component
    A button-toggler
 -->
<script lang="ts">
    /**
     * The current value
     */
    export let value: boolean;
    /**
     * The icon class
     */
    export let icon: string = "";
    /**
     * The tooltip text
     */
    export let hint: string = "";
</script>

<span class="btn-filter btn subdued small" class:selected={value} class:tip={hint} title={hint}>
    {#if icon}<i class={icon}></i>{/if}
    {#if $$slots.default}<span class="text-icon"><slot/></span>{/if}
    <input type=checkbox class=btn-filter--input bind:checked={value} on:change>
</span> 

<style>
    .btn.small {
        min-width: 40px;
    }
    .btn.small i, .text-icon {
        min-width: 12px;
        margin: 0;
    }
</style>
