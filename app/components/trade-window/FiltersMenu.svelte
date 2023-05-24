<!-- @component
    A component to edit print search filters
-->
<script lang="ts">
    import type { Progress } from "../../services/ownedCollections";
    import type NM from "../../utils/NMTypes";
    import type { rarityCss } from "../../utils/NMTypes";
    import type { Actors } from "../TradeWindow.svelte";

    import { createEventDispatcher, getContext, onDestroy } from "svelte";
    import DoubleRange from "../elements/DoubleRange.svelte";
    import Dropdown from "../elements/Dropdown.svelte";
    import Icon from "../elements/Icon.svelte";
    import PushSwitch from "../elements/PushSwitch.svelte";
    import FilterMenuViewModel from "./trade-filters/FilterMenuViewModel";
    import { Filters, filters2query, getFilterHint } from "./trade-filters/filterUtils";

    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;

    const actors = getContext<Actors>("actors");
    const cardOwner = getContext<NM.User>("cardOwner");
    const isItYou = getContext<boolean>("isItYou");
    // ID of the user in another list
    const oppositeOwnerId = isItYou ? actors.partner.id : actors.you.id;

    const model = FilterMenuViewModel(
        sett,
        isItYou,
        actors.you.id,
        actors.partner,
        cardOwner.id,
        oppositeOwnerId,
    );
    const {
        filterSetList,
        defaultFilters,
        s: {
            filterSet,
            filters,
            ownerCollections,
            oppositeCollections,
            collections,
        },
    } = model;
    onDestroy(() => {
        model.stop();
    });

    export const {
        applyFilters,
        showSett,
        hideSett,
        // typing fails on exporting nested destructing
        // https://github.com/sveltejs/language-tools/issues/2023
        // s: {
        //     hiddenSetts,
        //     activeFilterLabels,
        // },
    } = model;

    export const {
        hiddenSetts,
        activeFilterLabels,
        // eslint-disable-next-line unicorn/consistent-destructuring
    } = model.s;

    /**
     * Get the search filters
     */
    export function getQueryFilters () {
        return filters2query($filters, oppositeOwnerId);
    }

    /**
     * Set the print's series as a selected
     */
    export function selectSett (print: NM.PrintInTrade) {
        $filters.sett = {
            id: print.sett_id,
            name: print.sett_name,
        };
    }

    const dispatch = createEventDispatcher();
    $: $filters, dispatch("filtersChange");

    const RARITIES: rarityCss[] = [
        "common", "uncommon", "rare", "veryRare", "extraRare", "chase", "variant", "legendary",
    ];

    const holderOwnsNumbers = [1, 2, 3, 4, 5, 10, 20, 50, 100, Number.POSITIVE_INFINITY];
    const oppositeOwnsNumbers = [0, ...holderOwnsNumbers];
    // eslint-disable-next-line max-len, comma-spacing
    const cardCountNumbers = [1,10,50,100,250,500,750,1e3,1.5e3,2e3,3e3,4e3,5e3,7.5e3,1e4,1.5e4,2e4,3e4,4e4,5e4,7.5e4,1e5,Number.POSITIVE_INFINITY];
    // eslint-disable-next-line max-len, comma-spacing
    const collectionNumbers = [0,1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,110,120,130,140,150,160,170,180,190,200,Number.POSITIVE_INFINITY];

    /**
     * Get the filter hint
     */
    function getHint (name: keyof Filters) {
        return getFilterHint(name, isItYou, actors.partner);
    }

    /**
     * Percent of collected cards of the series core
     */
    function collectionCore (coll: Progress | null) {
        return coll ? coll.core.owned / coll.core.count : 0;
    }

    /**
     * Percent of collected cards of special rarities
     */
    function collectionSpecial (coll: Progress | null) {
        return coll
            ? (coll.chase.owned + coll.variant.owned + coll.legendary.owned)
                / (coll.chase.count + coll.variant.count + coll.legendary.count)
            : 0;
    }
</script>

<article>
    <h1 class="small-caps">Filter Set</h1>
    <span class="row">
        <select bind:value={$filterSet}>
            <option value={null}>Choose a filter set</option>
            {#each $filterSetList as fs}
                <option value={fs}>{fs.name}</option>
            {/each}
        </select>
        {#if filterSet}
            <Icon icon="trash" size="12px" on:click={() => model.deleteFilterSet()} />
        {:else}
            <Icon icon="save" size="12px" on:click={() => model.saveFilters()} />
        {/if}
    </span>

    <h1 class="small-caps">Series</h1>
    <span class="row">
        <DoubleRange
            list={collectionNumbers}
            bind:value={$filters.collection}
            title="{isItYou ? actors.partner.first_name : "You"} collected"
        />
        <Icon icon="reload" size="12px"
            on:click={() => { $filters.collection = defaultFilters.collection; }}
        />
    </span>
    <span class="row">
        <PushSwitch
            bind:value={$filters.shared}
            icons="commonSeries"
            hint={getHint("shared")}
        />
        <PushSwitch
            bind:value={$filters.incompleteSetts}
            icons="unownedCard"
            hint={getHint("incompleteSetts")}
            on:change={() => {
                if ($filters.incompleteSetts && $filters.notOwned) {
                    $filters.oppositeOwns = defaultFilters.oppositeOwns;
                    $filters.incompleteSetts = false;
                }
            }}
        />
        <Dropdown list={$collections ?? []} bind:value={$filters.sett} let:item
            hint={collections ? "Choose a Series" : "Loading series..."}
            emptyListText="No series matching the filters"
        >
            <!-- if collections list is loaded then user collections loaded too -->
            {@const cl = (isItYou ? $oppositeCollections : $ownerCollections).getProgress(item.id)}
            {@const cr = (isItYou ? $ownerCollections : $oppositeCollections).getProgress(item.id)}
            <div class="collection">
                <div class="name">{item.name}</div>
                <div class="progress"
                    style:--left={collectionCore(cl)}
                    style:--right={collectionCore(cr)}
                />
                <!-- if there are special rarities -->
                {#if (cl ?? cr)?.core.count !== (cl ?? cr)?.total.count}
                    <div class="progress"
                        style:--left={collectionSpecial(cl)}
                        style:--right={collectionSpecial(cr)}
                    />
                {/if}
            </div>
        </Dropdown>
        <Icon icon="reload" size="12px" on:click={() => { $filters.sett = null; }}/>
    </span>
    <span class="row multi-switch">
        <PushSwitch
            bind:value={$filters.oopSetts}
            hint={getHint("oopSetts")}
        >OoP</PushSwitch>
        <PushSwitch
            bind:value={$filters.limCreditSetts}
            icons={"limited"}
            hint={getHint("limCreditSetts")}
        ><Icon icon="credit" size="1em"/></PushSwitch>
        <PushSwitch
            bind:value={$filters.limFreebieSetts}
            icons={"limited"}
            hint={getHint("limFreebieSetts")}
        ><Icon icon="freebie" size="1em"/></PushSwitch>
        <PushSwitch
            bind:value={$filters.unlimSetts}
            icons="unlimited"
            hint={getHint("unlimSetts")}
        />
        <PushSwitch
            bind:value={$filters.rieSetts}
            hint={getHint("rieSetts")}
        >RIE</PushSwitch>
    </span>

    <h1 class="small-caps">Cards</h1>
    <span class="row">
        <PushSwitch
            bind:value={$filters.wishlisted}
            icons={["wishlist", "wishlisted"]}
            hint={getHint("wishlisted")}
        />
        <PushSwitch
            bind:value={$filters.favorited}
            icons={["like", "liked"]}
            hint={getHint("favorited")}
        />
        <PushSwitch
            bind:value={$filters.tradingCards}
            icons={["trade", "no-trading", "trading-only"]}
            hint={getHint("tradingCards")}
        />
        <input
            type=search
            class="search small search-card"
            placeholder="Search by card name"
            bind:value={$filters.cardName}
        >
        <Icon icon="reload" size="12px" on:click={() => { $filters.cardName = ""; }}/>
    </span>
    <span class="row multi-switch rarities">
        {#each RARITIES as rarity}
            <PushSwitch bind:value={$filters[rarity]} icons={rarity} hint={getHint(rarity)} />
        {/each}
    </span>
    <span class="row">
        <DoubleRange
            list={holderOwnsNumbers}
            bind:value={$filters.holderOwns}
            title={isItYou ? "You own" : `${actors.partner.first_name} owns`}
        />
        <PushSwitch
            value={$filters.duplicatesOnly}
            hint={getHint("duplicatesOnly")}
            on:change={() => {
                $filters.holderOwns = $filters.duplicatesOnly
                    ? defaultFilters.holderOwns
                    : [2, Number.POSITIVE_INFINITY];
            }}
        >2+</PushSwitch>
    </span>
    <span class="row">
        <DoubleRange
            list={oppositeOwnsNumbers}
            bind:value={$filters.oppositeOwns}
            title={isItYou ? `${actors.partner.first_name} owns` : "You own"}
        />
        <PushSwitch
            value={$filters.notOwned}
            icons="unowned"
            hint={getHint("notOwned")}
            on:change={() => {
                $filters.oppositeOwns = $filters.notOwned
                    ? defaultFilters.oppositeOwns
                    : [0, 0];
            }}
        />
    </span>
    <span class="row">
        <DoubleRange
            list={cardCountNumbers}
            bind:value={$filters.cardCount}
            title="Card count"
        />
        <Icon
            icon="reload" size="12px"
            on:click={() => { $filters.cardCount = defaultFilters.cardCount; }}
        />
    </span>
</article>

<style>
    article {
        background: white;
        padding: 15px;
        border: 1px solid #d6d6d6;
        border-radius: 10px;
        box-shadow: 0 0 20px #0002;
        min-width: 300px;
        width: 350px;
        box-sizing: border-box;
        font-size: 12px;
        line-height: 1em;
        color: #8b8a8c;
    }
    h1 {
        text-align: center;
        padding: 5px;
        margin: 0 -15px;
        color: #2c2830;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
    }
    h1:not(:first-of-type) {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #d6d6d6;
    }

    .row {
        display: flex;
        align-items: center;
        width: 100%;
        margin: 5px 0 0 0;
        gap: 0.5em;
    }
    .row > :global(*) {
        flex-grow: 1;
        margin-left: 0;
        margin-right: 0;
    }

    .row :global(.slider),
    .row :global(.container),
    .row select,
    .row input[type=search] {
        flex-grow: 500;
    }
    .row select {
        border: 1px solid #ccc;
        background-color: white;
        border-radius: 3px;
        outline: none;
        font-size: 12px;
    }
    .row :global(input[type=search]) {
        height: 28px;
        margin: 0;
        padding: 7.5px 11.25px;
        font-size: 11px;
        color: black;
        border: 1px solid #ccc;
        border-radius: 3px;
        box-shadow: inset 0 1px 2px #0001;
        outline: none;
        appearance: textfield;
        -webkit-appearance: textfield;
    }
    .row :global(input[type=search]::-webkit-search-cancel-button) {
        -webkit-appearance: none;
    }
    .row :global(.slider + /* reload icon */ span) {
        margin-top: 10px;
    }
    .row > :global(.switch) {
        width: 38px;
        height: 28px;
    }
    .row :global(span:last-child) {
        cursor: pointer;
    }
    .row.multi-switch {
        gap: 0;
        border: 1px solid #d6d6d6;
        border-radius: 4px;
    }
    .row.multi-switch > :global(.switch) {
        box-shadow: none;
        border-right: 1px solid #d6d6d6;
        border-radius: 0;
    }
    .row.multi-switch > :global(.switch:last-child) {
        border-right: none;
    }
    .rarities {
        font-size: 16px;
    }

    .collection {
        padding: 2px 2px 0;
        color: black;
    }
    .collection .name {
        padding-top: 3px;
    }
    .collection:hover .name {
        background-color: #4BBBF5;
        color: white;
    }
    .collection .progress {
        position: relative;
        width: 100%;
        height: 2px;
    }
    .collection .progress::before,
    .collection .progress::after {
        content: "";
        display: block;
        position: absolute;
        height: 100%;
        background: #C18BF2;
    }
    .collection:not(:hover) .progress {
        opacity: 0.5;
    }
    .collection .progress+.progress::before,
    .collection .progress+.progress::after {
        background: #26b2db;
    }
    .collection .progress::before {
        width: calc(var(--left) * 50%);
        left: calc(50% - var(--left) * 50%);
    }
    .collection .progress::after {
        width: calc(var(--right) * 50%);
        left: calc(50% - 1px);
        border-left: 1px solid white;
    }
</style>
