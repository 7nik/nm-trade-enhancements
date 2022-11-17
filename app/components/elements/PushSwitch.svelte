<!-- @component
    A pushing button-toggler
 -->
<script lang="ts">
    import type { IconName } from "./Icon.svelte";

    import { error } from "../../utils/utils";
    import Icon from "./Icon.svelte";
    import tip from "./tip";

    /**
     * The current value
     */
    export let value: boolean;
    /**
     * The icon name
     */
    export let icon: IconName | IconName[] = [];
    /**
     * The icon name of the pressed switch
     */
    export let activeIcon: IconName | IconName[] = icon;
    /**
     * The text as icon
     */
    export let text: string = "";
    /**
     * The tooltip text
     */
    export let hint: string = "";

    if (Array.isArray(icon) !== Array.isArray(activeIcon)) {
        error("Both `icon` and `activeIcon` must have the same type", icon, activeIcon);
    } else if (Array.isArray(icon) && Array.isArray(activeIcon) && icon.length !== activeIcon.length) {
        error("Provided different number of icons", icon, activeIcon);
    }
    $: icons = value
        ? Array.isArray(activeIcon) ? activeIcon : [activeIcon]
        : Array.isArray(icon) ? icon : [icon];
</script>

<label class:selected={value} use:tip={hint}>
    <input type=checkbox bind:checked={value} on:change>
    {#each icons as icon}
        <Icon {icon} size="1em" />
    {/each}
    {#if text}{text}{/if}
</label>

<style>
    label {
        padding: 0;
        margin: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: .7ch;
        box-shadow: inset 0 0 0 1px #0002;
        /* color: #39343E; */
        font-weight: 500;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
    }
    label.selected {
        background: #d6d6d6;
        color: #1482A1;
        box-shadow: inset 0 1px 0 0 #0002;
    }
    label:hover {
        box-shadow: inset 0 0 0 1px #0004;
    }
    input {
        display: none;
    }
</style>
