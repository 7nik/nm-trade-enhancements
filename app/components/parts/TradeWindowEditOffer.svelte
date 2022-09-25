<!-- @component 
    A component to search and add prints to an offer
-->
<script lang="ts">
    import type { Actors } from "../TradeWindow.svelte";
    import type { Writable } from "svelte/store";
    import type { Paginator } from "../../utils/NMApi";
    import type NM from "../../utils/NMTypes";

    import NMApi from "../../utils/NMApi";
    import { onDestroy, createEventDispatcher } from "svelte";
    import { writable } from "svelte/store";
    import Avatar from "../elements/Avatar.svelte";
    import Button from "../elements/Button.svelte";
    import PrintDetails from './PrintDetails.svelte';
    import FiltersMenu from "./FiltersMenu.svelte";

    /**
     * Users involved in the trade
     */
    export let actors: Actors;
    /**
     * Whose side is it
     */
    export let cardOwner: NM.User;
    /**
     * Prints the card owner will give
     */
    export let offer: NM.PrintInTrade[];
    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;

    const dispatch = createEventDispatcher();

    const isItYou = cardOwner.id === actors.you.id;
    // ID of the user in another list
    // const oppositeOwnerId = isItYou ? actors.partner.id : actors.you.id;
    // show the offer, show the bio, or adding prints
    // let state: "offer" | "bio" | "search" = "offer";

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
    let cacheKey: string;
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
        filteredPrints = writable([]);
        // stop loadMorePrints() and prevent next runs
        loadMorePrintsKey = -loadMorePrintsKey;

        const query = filtersMenu.getQueryFilters();
        cacheKey = JSON.stringify(query);
        if (cacheKey in cache) {
            prints = cache[cacheKey];
        } else {
            prints = NMApi.trade.findPrints(cardOwner.id, query);
            cache[cacheKey] = prints;
        }

        loadPrintsKey += 1;
        const localKey = loadPrintsKey;
        await prints.waitLoading();

        if (loadPrintsKey !== localKey) return;
        await filtersMenu.applyFilters(prints.list, offer, filteredPrints);

        if (loadPrintsKey !== localKey) return;
        loadMorePrintsKey = -loadMorePrintsKey + 1; // "enable" loadMorePrints()
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
        offer = [
            ...offer.filter((p) => p.id !== print.id), 
            print,
        ];
        $filteredPrints = $filteredPrints.filter(p => p !== print);
        dispatch("close");
    }
</script>

<div class="trade--add-items cards-mode active">
    <div class=trade--side--header>
        <Avatar user={cardOwner} size="small"/>
        Add cards {isItYou ? "you" : cardOwner.first_name} will give
        <span class=trade--side--header--actions>
            <span class="trade--edit-filters">
                <Button class="subdued">Edit filters</Button>
                <div class="trade--edit-filters--container">
                    <FiltersMenu 
                        {actors}
                        {cardOwner}
                        {sett}
                        bind:this={filtersMenu}
                        on:filtersChange={loadPrints}
                    />
                </div>
            </span>
            <i class="close-x small" on:click={() => dispatch("close")}>×</i>
        </span>
    </div>
    <div class=trade--add-items--filters>
        <div class="active-filters">
            {#if $activeFilters?.length > 0}
                {#each $activeFilters as filter (filter.tip)}
                    {#key filter.tip}
                        <span class="active-filter tip" title={filter.tip}>
                            <span class="active-filter--prefix">{filter.prefix}</span><!--  
                                comments to avoid inserting whitespace
                            -->{#if filter.icon}{#each filter.icon.split(",") as icon}<!--  
                                --><i class={icon}/><!--  
                            -->{/each}{/if}<!--  
                            -->{#if filter.text}<span>{filter.text}</span>{/if}
                        </span>
                    {/key}
                {/each}
            {:else}
                <span class="active-filter all-cards">
                    All cards
                </span>
            {/if}
        </div>
        {#if $hiddenSetts?.length > 0}
            <div class="hiddenSeries">
                <span class="small-caps">Hidden series: </span>
                {#each $hiddenSetts as sett, i (sett.id)}
                    {#if i},{/if}
                    <span class="tip" title={sett.tip}>{sett.name}</span>
                    <span class="tip" title="Show series" on:click={() => filtersMenu.showSett(sett.id)}>✕</span>
                {/each}
            </div>
        {/if}
    </div>
    <div id=print-list class=trade--search--items bind:this={viewport} on:scroll={loadMorePrints}>
        <ul>
            {#each $filteredPrints as print (print.id)}
                <PrintDetails 
                    {print} 
                    {actors} 
                    direction={isItYou ? "give" : "receive"}
                >
                    <Button class="mini" icon="add" on:click={() => addPrint(print)} title="Add one"/>
                    <span slot="series">
                        {#if !$isSettSelected}
                            <i class="icon-button icon-search tip" title="Select this series" on:click={() => filtersMenu.selectSett(print)}></i>
                            <i class="icon-button icon-close tip" title="Hide this series" on:click={() => filtersMenu.hideSett(print)}></i>
                        {/if}
                    </span>
                </PrintDetails>
            {/each}
        </ul>
        {#if !loading && $filteredPrints.length === 0}
            <div class=trade--search--empty>
                <div class=text-emoji>😭</div>
                <div class="text-emphasis text-subdued text-body">
                    {isItYou ? "You don't" : `${actors.partner.first_name} doesn't`}
                    have any cards matching that search.
                </div>
            </div>
        {:else if loading && $filteredPrints.length === 0}
            <div class=trade--side--loading>
                <i class="load-indicator medium"></i>
            </div>
        {:else if loading && $filteredPrints.length > 0}
            <div class=trade--side--items--loading>
                <i class="load-indicator btn-load-indicator"></i>
            </div>
        {/if}
    </div>
</div>

<style>
    .trade--add-items {
        display: flex;
        flex-direction: column;
    }
    .trade--add-items .trade--add-items--filters {
        overflow: initial;
        padding: 0;
    }
    .trade--add-items .trade--search--items {
        position: initial;
    }

    .trade--add-items .trade--side--header--actions {
        display: inline-flex;
        align-items: center;
        gap: 2em;
    }
    .trade--add-items .trade--edit-filters {
        float: right;
        position: relative;
    }

    .trade--edit-filters--container {
        visibility: hidden;
        position: absolute;
        top: 0;
        right: 0;
        transition-property: visibility;
        transition-delay: 0.25s;
    }
    .trade--edit-filters > :global(.btn:hover ~ .trade--edit-filters--container),
    .trade--edit-filters > :global(.btn:active ~ .trade--edit-filters--container),
    .trade--edit-filters--container:hover {
        visibility: visible;
        transition-delay: 0s;
    }
    .active-filters {
        display: flex;
        width: 100%;
        flex-wrap: wrap;
        gap: 10px;
        padding: 10px;
    }
    .active-filter {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d6d6d6;
        font-size: 12px;
        border-radius: 5px;
    }
    .active-filter.all-cards {
        padding: 2px 5px;
    }
    .active-filter .active-filter--prefix {
        padding: 2px 5px;
        background: #d6d6d6;
    }
    .active-filter > * {
        padding: 0 5px;
    }
    .active-filter > :global([class*="icon"] + [class*="icon"]) {
        margin-left: -5px;
    }
    .active-filter :global(.i.rarity) {
        width: 14px;
        height: 14px;
        margin: 0;
        padding: 0 12px;
    }
    .active-filter :global(.credit) {
        width: 14px;
        height: 14px;
        margin: 0 5px;
    }
    .active-filter :global(.pipe) {
        padding: 0;
        margin: 0;
        height: auto;
        align-self: stretch;
        border-color: #d6d6d6;
    }

    .hiddenSeries {
        width: 100%;
        padding: 10px;
        border-top: 1px solid rgba(0,0,0,.1);
        white-space: normal;
        font-size: 10px;
        color: #9f96a8;
    }
    .hiddenSeries span {
        white-space: nowrap;
    }
    .hiddenSeries span.tip:nth-child(odd) {
        cursor: pointer;
        color: #9f96a8;
        position: relative;
        bottom: -1px;
    }
    .hiddenSeries span.tip:nth-child(odd):hover {
        color: #085b85;
    }

    :global(.trade--item) .icon-button {
        margin-left: 0.5ch;
        cursor: pointer;
        opacity: 0;
    }
    :global(.trade--item):hover .icon-button {
        opacity: 1;
    }
    :global(.trade--item):hover .icon-button::before {
        font-size: 10px;
        color: #9f96a8;
    }
</style>
