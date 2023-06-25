<!-- @component
    A dropdown list with ability to search and select the element
 -->
<script lang="ts">
    // eslint-disable-next-line no-undef
    type T = $$Generic<{ name: string }>;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    interface $$Slots {
        default: {
            item: T,
            selected: boolean,
        }
    }

    import { afterUpdate, createEventDispatcher } from "svelte";

    /**
     * The placeholder text on the input field
     */
    export let hint = "";
    /**
     * The list of the values
     */
    export let list: T[];
    /**
     * The current value
     */
    export let value: T | null;
    /**
     * The text to display when the list is empty
     */
    export let emptyListText = "";

    const dispatch = createEventDispatcher();
    $: dispatch("change", value);

    $: lowNames = list.map(({ name }) => name.toLowerCase());
    $: text = value?.name ?? "";
    $: lowText = text.toLowerCase();
    $: filteredList = list.filter((_, i) => lowNames[i].includes(lowText));
    $: filteredNames = lowNames.filter((name) => name.includes(lowText));

    let selectedItem = value ?? list[0];
    function updateValue () {
        if (text === "") {
            value = null;
        } else {
            const i = filteredNames.indexOf(text.toLowerCase());
            if (i >= 0) value = filteredList[i];
        }
        if (!filteredList.includes(selectedItem)) {
            // eslint-disable-next-line prefer-destructuring
            selectedItem = filteredList[0];
        }
    }

    function selectItem (item: T) {
        selectedItem = item ?? filteredList[0];
    }

    function setValue () {
        value = selectedItem ?? filteredList[0] ?? null;
        selectedItem = value;
    }

    function hotkey (ev: KeyboardEvent) {
        switch (ev.key) {
            case "ArrowDown":
            case "ArrowUp": {
                let i = filteredList.indexOf(selectedItem as T);
                i += ev.key === "ArrowDown" ? 1 : -1;
                if (i < 0) {
                    i = filteredList.length - 1;
                } else if (i > filteredList.length - 1) {
                    i = 0;
                }
                selectItem(filteredList[i]);
                return;
            }
            // trade window listens for Escape on capture phase
            // case "Escape":
            //     value = null;
            //     ev.stopPropagation();
            //     ev.preventDefault();
            //     return;
            case "Enter":
                setValue();
            // no default
        }
    }

    // ensure that the selected item is visible
    let listElem: HTMLElement;
    afterUpdate(() => {
        if (!selectedItem) return;
        const elem = listElem.children[filteredList.indexOf(selectedItem)] as HTMLElement;
        if (!elem) return;
        listElem.style.display = "block";
        const scrollMax = elem.offsetTop;
        const scrollMin = elem.offsetTop - listElem.clientHeight + elem.clientHeight;
        const scroll = listElem.scrollTop;
        if (scroll < scrollMin || scroll > scrollMax) {
            listElem.scroll({
                top: Math.max(scrollMin, Math.min(scrollMax, scroll)),
            });
        }
        listElem.style.display = "";
    });
</script>

<svelte:options immutable />

<span class="container">
    <input type="search" bind:value={text} placeholder={hint}
        on:keydown={hotkey}
        on:input={updateValue}
    >
    <div class="list" bind:this={listElem}>
        {#each filteredList as item (item)}
            <div class="item"
                on:mouseenter={() => selectItem(item)}
                on:click={setValue}>
                <slot {item}
                    selected={item === selectedItem && filteredList.length > 1}
                >{item.name}</slot>
            </div>
        {:else}
            <center>{emptyListText}</center>
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
        box-sizing: border-box;
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
