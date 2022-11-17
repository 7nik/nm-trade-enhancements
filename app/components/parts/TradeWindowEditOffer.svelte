<!-- @component
    A component to search and add prints to an offer
-->
<script lang="ts">
    import type { Actors } from "../TradeWindow.svelte";
    import type { Writable } from "svelte/store";
    import type { Paginator } from "../../utils/NMApi";
    import type NM from "../../utils/NMTypes";

    import NMApi from "../../utils/NMApi";
    import { onDestroy, createEventDispatcher, getContext } from "svelte";
    import { writable } from "svelte/store";
    import Avatar from "../elements/Avatar.svelte";
    import Button from "../elements/Button.svelte";
    import PrintDetails from './PrintDetails.svelte';
    import FiltersMenu from "./FiltersMenu.svelte";
    import Icon from "../elements/Icon.svelte";
    import tip from "../elements/tip";

    /**
     * Prints the card owner will give
     */
    export let offer: NM.PrintInTrade[];
    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;

    const actors = getContext<Actors>("actors");
    const cardOwner = getContext<NM.User>("cardOwner");
    const isItYou = getContext<boolean>("isItYou");

    const dispatch = createEventDispatcher<{
        add: NM.PrintInTrade,
        close: void,
    }>();


    let filtersMenu: FiltersMenu;
    $: ({ hiddenSetts, isSettSelected, activeFilters } = filtersMenu ?? {});

    let prints: Paginator<NM.PrintInTrade>;
    let filteredPrints: Writable<NM.PrintInTrade[]> = writable([]);
    let loading = false;
    // cache of search results
    let cache = {} as Record<string, Paginator<NM.PrintInTrade>>;

    // refilter prints when the offer get changed
    $: offer, refilterPrints();
    function refilterPrints() {
        filtersMenu?.applyFilters(prints.list, offer, filteredPrints = writable([]));
    }

    // keys to ensure that the function result is still actual
    let loadPrintsKey = 0;
    let loadMorePrintsKey = 0;
    onDestroy(() => {
        // replacing stores with new ones after component destruction causes
        // calling the `unsubscribe` method for the second time and this throws errors
        loadPrintsKey = -1;
        loadMorePrintsKey = -1;
    });

    $: if (filtersMenu) loadPrints();
    async function loadPrints() {
        loading = true;
        // stop loadMorePrints() and prevent next runs
        loadMorePrintsKey = -Math.abs(loadMorePrintsKey);

        const query = filtersMenu.getQueryFilters();
        const cacheKey = JSON.stringify(query);
        if (cacheKey in cache) {
            prints = cache[cacheKey];
        } else {
            filteredPrints = writable([]);
            prints = NMApi.trade.findPrints(cardOwner.id, query);
            cache[cacheKey] = prints;
        }

        loadPrintsKey += 1;
        const localKey = loadPrintsKey;
        await prints.waitLoading();

        if (loadPrintsKey !== localKey) return;
        filteredPrints = writable([]);
        await filtersMenu.applyFilters(prints.list, offer, filteredPrints);

        if (loadPrintsKey !== localKey) return;
        loadMorePrintsKey = Math.abs(loadMorePrintsKey) + 1; // "enable" loadMorePrints()
        loadMorePrints();
    }

    let viewport: HTMLElement;
    async function loadMorePrints() {
        // if disabled
        if (loadMorePrintsKey < 0) return;
        if (prints?.isLoading) return;
        if (!prints?.hasMore || !viewport) {
            loading = false;
            return;
        }
        const offset = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
        if (offset > 1000) {
            loading = false;
            return;
        }

        loading = true;
        loadMorePrintsKey += 1;
        const localKey = loadMorePrintsKey;
        const newPrints = await prints.loadMore();
        // if canceled or another instance of loadMorePrints was run
        if (loadMorePrintsKey !== localKey) return;
        await filtersMenu.applyFilters(newPrints, offer, filteredPrints);

        if (loadMorePrintsKey !== localKey) return;
        loadMorePrints();
    }

    function addPrint(print: NM.PrintInTrade) {
        $filteredPrints = $filteredPrints.filter(p => p !== print);
        dispatch("add", print);
    }

    let filterMenuBtn: HTMLElement;
    function updateFilterMenuPosition() {
        const button = filterMenuBtn.firstElementChild as HTMLElement;
        const filterContainer = filterMenuBtn.lastElementChild as HTMLElement;
        const buttonWidth = button.offsetWidth;
        const menuWidth = filterContainer.offsetWidth;
        let left = 0, top = 0;
        let parent = button;
        do {
            left += parent.offsetLeft;
            top += parent.offsetTop;
            parent = parent.offsetParent as HTMLElement;
        } while (parent);
        left = left + buttonWidth/2 - menuWidth/2;
        if (left < 5) left = 5;
        top = top - button.offsetTop + 5;
        filterMenuBtn.style.setProperty("--left", `${left}px`);
        filterMenuBtn.style.setProperty("--top", `${top}px`);
    }
</script>

<svelte:window on:resize={updateFilterMenuPosition}/>

<article>
    <header>
        <Avatar user={cardOwner} />
        Add cards {isItYou ? "you" : cardOwner.first_name} will give
        <span class="edit-filters-btn"
            on:mouseenter={updateFilterMenuPosition}
            bind:this={filterMenuBtn}
        >
            <Button type="subdued-light" size="mini">Edit filters</Button>
            <div class="filters-menu">
                <FiltersMenu
                    {sett}
                    bind:this={filtersMenu}
                    on:filtersChange={loadPrints}
                />
            </div>
        </span>
        <span class=close-btn on:click={() => dispatch("close")}>
            <Icon icon="close"/>
        </span>
    </header>

    <section class="active-filters">
        {#if $activeFilters?.length > 0}
            {#each $activeFilters as filter (filter.tip)}
                {#key filter.tip}
                    <span class="active-filter" use:tip={filter.tip}>
                        <span class="prefix">{filter.prefix}</span>
                        {#if filter.icons}{#each filter.icons as icon}
                            {#if icon === "pipe"}
                                <span class="pipe"></span>
                            {:else if icon === "oop"}
                                <span>OoP</span>
                            {:else if icon === "rie"}
                                <span>RIE</span>
                            {:else}
                                <Icon icon={icon} size="12px" />
                            {/if}
                        {/each}{/if}
                        {#if filter.text}<span>{filter.text}</span>{/if}
                    </span>
                {/key}
            {/each}
        {:else}
            <span class="active-filter all-cards">
                All cards
            </span>
        {/if}
    </section>

    {#if $hiddenSetts?.length > 0}
        <section class="hidden-series">
            <span>Hidden series: </span>
                {#each $hiddenSetts as sett, i (sett.id)}
                    {#if i},{/if}
                    <span use:tip={sett.tip}>{sett.name}</span>
                    <span use:tip={"Show series"} on:click={() => filtersMenu.showSett(sett.id)}>✕</span>
                {/each}
            </section>
    {/if}

    <section class=print-list>
        {#if $filteredPrints.length > 0}
            <ul bind:this={viewport} on:scroll={loadMorePrints}>
                {#each $filteredPrints as print (print.id)}
                    <PrintDetails {print} >
                        <Button size="mini" icon="add" on:click={() => addPrint(print)} hint="Add one"/>
                        <span slot="series" class="card-actions">
                            {#if !$isSettSelected}
                                <Icon icon="search" size="10px"
                                    hint="Select this series"
                                    on:click={() => filtersMenu.selectSett(print)}
                                />
                                <Icon icon="close" size="10px"
                                    hint="Hide this series"
                                    on:click={() => filtersMenu.hideSett(print)}
                                />
                            {/if}
                        </span>
                    </PrintDetails>
                {/each}
                {#if loading}
                    <li class=loading-more-results>
                        <Icon icon="loader" size="32px"/>
                    </li>
                {/if}
            </ul>
        {:else if loading}
            <div class=loading-results>
                <Icon icon="loader" size="50px"/>
            </div>
        {:else}
            <div class=empty-result>
                <span>😭</span>
                <i>
                    {isItYou ? "You don't" : `${actors.partner.first_name} doesn't`}
                    have any cards matching that search.
                </i>
            </div>
        {/if}
    </section>
</article>

<style>
    article {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        font-weight: 400;
    }
    header {
        display: flex;
        align-items: center;
        background: #efefef;
        padding: 10px;
        gap: 1ch;
        color: #2c2830;
    }
    .edit-filters-btn {
        flex-grow: 1;
        flex-shrink: 0;
        display: grid;
        grid-template-columns: 2fr max-content 1fr;
    }
    .edit-filters-btn > :global(button) {
        grid-column-start: 2;
    }
    .filters-menu {
        visibility: hidden;
        position: fixed;
        top: var(--top, 5px);
        left: var(--left, 5px);
        transition-property: visibility;
        transition-delay: 0.35s;
        z-index: 2;
    }
    @media (max-height: 700px) and (min-width: 961px) {
        .filters-menu {
            top: -63px;
        }
    }
    .edit-filters-btn > :global(:first-child:hover + .filters-menu),
    .edit-filters-btn > :global(:first-child:active + .filters-menu),
    .filters-menu:hover {
        visibility: visible;
        transition-delay: 0s;
    }
    .close-btn {
        align-self: flex-start;
        cursor: pointer;
    }
    .close-btn:not(:hover) {
        opacity: 0.6;
    }

    .active-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 10px;
        border-bottom: 1px solid #0002;
    }
    .active-filter {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d6d6d6;
        font-size: 0;
        border-radius: 5px;
        color: #8b8a8c;
        padding-right: 5px;
    }
    .active-filter *, .active-filter.all-cards {
        font-size: 12px;
        font-weight: 500;
    }
    .active-filter.all-cards {
        padding: 2px 5px;
    }
    .active-filter .prefix {
        padding: 2px 5px;
        color: #5f5668;
        background: #d6d6d6;
        margin: 0;
        font-weight: 400;
    }
    .active-filter > :global(*) {
        margin-left: 5px;
    }
    .active-filter .pipe {
        height: auto;
        margin: 0 0 0 5px;
        align-self: stretch;
        border-right: 1px solid #d6d6d6;
    }

    .hidden-series {
        padding: 10px;
        border-bottom: 1px solid #0002;
        white-space: normal;
        font-size: 10px;
        color: #9f96a8;
    }
    .hidden-series span {
        white-space: nowrap;
    }
    .hidden-series span:nth-child(odd):not(:first-child) {
        cursor: pointer;
        color: #9f96a8;
        position: relative;
        bottom: -1px;
    }
    .hidden-series span:nth-child(odd):hover {
        color: #085b85;
    }

    .print-list {
        flex-grow: 1;
        display: flex;
        min-height: 0;
    }
    .print-list > * {
        flex-grow: 1;
        overflow: auto;
        padding: 0;
        margin: 0;
    }
    .empty-result, .loading-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .empty-result span {
        font-size: 60px;
    }
    .empty-result i {
        color: #9f96a8;
        line-height: 140%;
        font-weight: 400;
    }
    .loading-more-results {
        text-align: center;
        padding: 10px;
    }
    .card-actions {
        margin-left: 0.5ch;
        letter-spacing: 0.5ch;
        cursor: pointer;
        opacity: 0;
    }
    ul :global(li:hover .card-actions) {
        opacity: 1;
    }
</style>
