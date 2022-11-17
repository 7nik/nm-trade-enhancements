<!-- @component
    A half of the trade window for viewing and editing an offer
-->
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    import type { Actors } from "../TradeWindow.svelte";

    import Avatar from "../elements/Avatar.svelte";
    import Button from "../elements/Button.svelte";
    import PrintDetails from './PrintDetails.svelte';
    import TradeGrade from "../elements/TradeGrade.svelte";
    import TradeWindowEditOffer from "./TradeWindowEditOffer.svelte";
    import { linky } from "../../utils/utils";
    import Icon from "../elements/Icon.svelte";
    import { getContext, setContext } from "svelte";

    /**
     * Whose side is it
     */
    export let cardOwner: NM.User;
    /**
     * Prints the card owner will give
     */
    export let offer: NM.PrintInTrade[];
    /**
     * Whether the offer can be modified
     */
    export let canEdit: boolean;
    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;

    const actors = getContext<Actors>("actors");
    const isItYou = cardOwner.id === actors.you.id;

    setContext("cardOwner", cardOwner);
    setContext("isItYou", isItYou);

    // show the offer, show the bio, or adding prints
    let state: "offer" | "bio" | "search" = "offer";
    $: canAddItems = offer.length < 5;

    // when `canEdit` changes
    $: resetState(canEdit);
    function resetState (updateSett: boolean) {
        state = "offer";
        if (!sett && offer.length > 0 && updateSett) {
            // if all cards in the offer are from the same sett
            const settIds = offer.map(p => p.sett_id);
            if (settIds.every(id => id === settIds[0])) {
                sett = {
                    id: offer[0].sett_id,
                    name: offer[0].sett_name,
                };
            }
        }
    }

    function toggleBio() {
        state = state === "bio" ? "offer" : "bio";
    }

    function removePrint(print: NM.PrintInTrade) {
        offer = offer.filter((pr) => pr !== print);
    }
    function addPrint(print: NM.PrintInTrade) {
        offer = [...offer, print];
    }
</script>

{#if state === "offer" || state === "bio"}
    <article>
        <header>
        <Avatar user={cardOwner} />
                <div>
                    <TradeGrade user={cardOwner} />
                    {cardOwner.first_name} will give
                    {#if cardOwner.bio || isItYou}
                        <div class="bio"
                            class:bio-shown={state === "bio"}
                            on:click={toggleBio}
                        >
                            <span class=disclosure-triangle class:open={state === "bio"}>▶</span>
                            <span class=bio-text>{cardOwner.bio || "Add a bio"}</span>
                            <span class=bio-action>
                                {state === "bio" ? "Hide" : "Show"} full bio
                            </span>
                        </div>
                    {/if}
                </div>
                {#if canEdit}
                    <Button icon={canAddItems ? "add" : ""} size="mini"
                        disabled={!canAddItems}
                        on:click={() => state = "search"}
                    >
                        {canAddItems ? "Add" : "5 max"}
                    </Button>
                {/if}
        </header>
        <section class="offer">
            {#if offer.length === 0}
                <div class=trade-tips>
                    <div>
                        <div>
                            <h3>Add up to 5 items {isItYou ? "you" : cardOwner.name} will give</h3>
                            {#if isItYou}
                                <div class="text-subdued text-small">
                                    Tips for new traders. Try offering:<br>
                                    – Cards they don't own<br>
                                    – Cards you have duplicates of<br>
                                    – Fair rarity trades
                                        (<Icon icon="uncommon" hint="Uncommon"/>
                                        for <Icon icon="uncommon" hint="Uncommon"/>)<br>
                                    – Two for one trades
                                        (<Icon icon="uncommon" hint="Uncommon"/>
                                        + <Icon icon="uncommon" hint="Uncommon"/>
                                        for <Icon icon="rare" hint="rare"/>)
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {:else}
                <ul>
                    {#each offer as print (print.id)}
                        <PrintDetails
                            bind:print
                            showPrintNumber={isItYou && canEdit ? "list" : "yes"}
                        >
                            {#if canEdit}
                                <Button type="danger" size="mini" icon="minus"
                                    hint="Remove it"
                                    on:click={() => removePrint(print)}
                                />
                            {/if}
                        </PrintDetails>
                    {/each}
                </ul>
            {/if}
            {#if state === "bio"}
                <div class=full-bio>
                    {#each linky(cardOwner.bio) as text, i}
                        {#if i%2}
                            <a target="_blank" href={text}>{text}</a>
                        {:else}
                            {text}
                        {/if}
                    {/each}
                    {#if isItYou}
                        <br><br>
                        <a href="{actors.you.links.profile}/collection" target="_blank">
                            <Button type="subdued-light" size="max">
                                Edit Your Bio
                            </Button>
                        </a>
                    {/if}
                </div>
            {/if}
        </section>
    </article>
{/if}

<!-- state === "search" -->
{#if canEdit}
    <!-- just hide this block to not re-render the huge list -->
    <section class="searcher" class:show={state === "search"}>
        <TradeWindowEditOffer
            {sett}
            {offer}
            on:close = {() => state = "offer"}
            on:add = {(ev) => { addPrint(ev.detail); state = "offer"; }}
        />
    </section>
{/if}

<style>
    article {
        display: flex;
        flex-direction: column;
        flex: 1;
        background: white;
        position: relative;
    }
    header {
        height: 40px;
        box-sizing: content-box;
        background: #efefef;
        padding: 10px;
        display: flex;
        gap: 1ch;
        align-items: center;
    }
    header > div {
        flex-grow: 1;
        flex-shrink: 1e6;
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 0 1ch;
        font-weight: 400;
    }
    .bio {
        grid-column: span 2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #9f96a8;
        user-select: none;
        font-size: 13px;
        cursor: pointer;
    }
    .bio .bio-text {
        font-style: italic;
    }
    .bio:hover, .bio-shown {
        color: #0d9ce6;
    }
    .bio:hover .bio-text, .bio-shown .bio-text, .bio-action {
        display: none;
    }
    .bio:hover .bio-action, .bio-shown .bio-action {
        display: initial;
    }
    .disclosure-triangle {
        transition: transform .1s ease-in-out;
        display: inline-block;
    }
    .disclosure-triangle.open {
        transform: rotate(90deg);
    }
    .offer {
        display: flex;
        justify-content: center;
    }
    .trade-tips {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9f96a8;
        font-size: 13px;
        padding: 20px;
    }
    .trade-tips h3 {
        color: #2c2830;
        margin: 0 0 0.5em 0;
        font-size: 15px;
        font-weight: 400;
    }
    ul {
        flex-grow: 1;
        padding: 0;
        margin: 0;
        list-style: none;
    }
    .full-bio {
        position: absolute;
        top: 60px;
        right: 0;
        bottom: 0;
        left: 0;
        overflow: auto;
        padding: 20px;
        background: white;
        white-space: pre-line;
        font-weight: 400;
    }
    a:link, a:visited, a:hover {
        color: #0d9ce6;
        text-decoration: none;
    }
    .searcher {
        display: none;
    }
    .searcher.show {
        display: flex;
        flex: 1;
        overflow: initial;
    }
    @media screen and (min-width: 961px) {
        section {
            flex-grow: 1;
            min-height: 0;
            background: white;
            overflow-y: auto;
        }
    }
    @media screen and (max-width: 960px) {
        article {
            min-height: 50%;
        }
        .searcher {
            position: absolute;
            top: 100vh;
            left: 0;
            bottom: -100vh;
            right: 0;
            z-index: 1;
            border-radius: 6px;
            overflow: hidden;
            background: white;
            transition: top .2s ease-in-out, bottom .2s ease-in-out;
        }
        .searcher.show {
            display: flex;
            top: 0;
            bottom: 0;
        }
    }
</style>
