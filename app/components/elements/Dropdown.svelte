<!-- @component
    A dropdown list with ability to search and select the element
 -->
<script lang="ts">
    type T = $$Generic<{ name: string }>;
    interface $$Slots {
        default: {
            item: T,
        }
    }

	import { createEventDispatcher } from "svelte";

    /**
     * The placeholder text on the input field
     */
    export let hint: string = "";
    /**
     * The list of the values
     */
    export let list: T[];
    /**
     * THe current value
     */
    export let value: T | null;

	const dispatch = createEventDispatcher();
	$: dispatch("change", value);

    $: text = value?.name ?? "";
    $: lowText = text.toLowerCase();
    function updateValue() {
        if (text === "") {
            value = null;
        } else {
            const v = list.find(({ name }) => name === text);
            if (v) value = v;
        }
    }
</script>

<svelte:options immutable />

<span class="container">
    <input type="search" bind:value={text} placeholder={hint} on:input={updateValue}>
    <div class="list">
        {#each list as item (item)}
            {#if item.name.toLowerCase().includes(lowText)}
                <div class="item" on:click={() => value = item}>
                    <slot {item}>{item.name}</slot>
                </div>
            {/if}
        {/each}
    </div>
</span>

<style>
    .container {
        position: relative;
        display: inline-flex;
    }
    input {
        flex-grow: 1;
    }
    .list {
        display: none;
        position: absolute;
        top: 100%;
        width: 100%;
        max-height: 35vh;
        background: white;
        border: 1px lightgrey solid;
        overflow: auto;
        z-index: 2;
        padding: 3px;
    }
    input:focus + .list, .list:hover {
        display: block;
    }
    .item {
        cursor: pointer;
    }
</style>
