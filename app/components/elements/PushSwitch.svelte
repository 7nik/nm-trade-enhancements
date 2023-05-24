<!-- @component
    A pushing button-toggler
 -->
 <script lang="ts">
    import type { IconName } from "./Icon.svelte";

    import { createEventDispatcher } from "svelte";
    import tip from "../actions/tip";
    import Icon from "./Icon.svelte";

    type T = $$Generic<boolean | number>;
    type I<TT> = TT extends number ? IconName[] : IconName | [IconName, IconName] | [];

    /*
     * The current value
     */
    export let value: T;
    /**
     * The icons for each value or one universal
     */
    export let icons: I<T> = [];
    /**
     * The tooltip text
     */
    export let hint = "";

    const dispatch = createEventDispatcher<{ change: T }>();

    $: icon = Array.isArray(icons)
        ? icons[+value] as IconName
        : icons as IconName;

    function toggle (ev: KeyboardEvent|MouseEvent) {
        if (ev instanceof KeyboardEvent && ev.key !== "Enter" && ev.key !== "Space") return;
        if (typeof value === "boolean") {
            value = !value as T;
        } else  if (typeof value === "number") {
            value = value >= icons.length - 1 ? 0 as T : value + 1 as T;
        }
        dispatch("change", value);
    }
</script>

<div class="switch" class:selected={value} use:tip={hint}
    on:click={toggle} tabindex="-1" on:keypress={toggle}
>
    {#if icon}<Icon {icon} size="1em" />{/if}
    <slot/>
</div>

<style>
    div {
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
    div.selected {
        background: #d6d6d6;
        color: #1482A1;
        box-shadow: inset 0 1px 0 0 #0002;
    }
    /* div:hover {
        box-shadow: inset 0 0 0 1px #0004;
    } */
</style>
