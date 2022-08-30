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
     * Whether the offer can be modified
     */
    export let canEdit: boolean;
    /**
     * ID of this trade, if available
     */
    export let tradeId: number | undefined;
    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;

    const isItYou = cardOwner.id === actors.you.id;
    // show the offer, show the bio, or adding prints
    let state: "offer" | "bio" | "search" = "offer";
    $: canAddItems = offer.length < 5;

    // when `canEdit` changes
    $: canEdit && resetState();
    function resetState () {
        state = "offer";
        if (!sett && offer.length > 0) {
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

    /**
     * Splits a string into text and links
     * @param text - the text with links
     * @returns array [text, link, text, link, text,...]
     */
    function linky(text: string) {
        const regexp = /(ftp|https?):\/\/\S*[^\s.;,(){}<>"]/g;
        const parts: string[] = [];
        let match: RegExpExecArray | null
        let start = 0;
        while (match = regexp.exec(text)) {
            parts.push(text.slice(start, match.index), match[0]);
            start = regexp.lastIndex;
        }
        parts.push(text.slice(start));
        return parts;
    }
</script>

{#if state === "offer" || state === "bio"}
    <div class=trade--side--header class:trade--side--header--add={canEdit}>
        <Avatar user={cardOwner} />
        <span class=trade--side--header--title>
            <TradeGrade user={cardOwner} /> 
            {cardOwner.first_name} will give
            {#if cardOwner.bio || isItYou}
                <div class="trade--side--header--bio text-small text-subdued" 
                    class:bio-shown={state === "bio"} 
                    on:click={toggleBio}
                >
                    <span class=disclosure-triangle class:open={state === "bio"}>▶</span> 
                    <span class="text-emphasis default-label">{cardOwner.bio || "Add a bio"}</span> 
                    <span class=hover-label>
                        {state === "bio" ? "Hide" : "Show"} full bio
                    </span>
                </div>
            {/if}
        </span>
    </div>
    {#if canEdit}
        <span class=trade--side--header--actions>
            <Button class="trade--add--btn" on:click={() => state = "search"} disabled={!canAddItems} icon={canAddItems ? "add" : ""}>
                {canAddItems ? "Add" : "5 max"}
            </Button>
        </span>
    {/if}
{/if}
{#if state === "offer"}
    <div nm-trades-item-list=partnerOfferType nm-trade-partner=partner show-remove=false></div>
    <div class=trade--side--item-list>
        {#if offer.length === 0}
            <div class=trade--side--empty>
                <div class=trade--side--empty--tips>
                    <div>
                        <h3 class=text-prominent>Add up to 5 items {isItYou ? "you" : cardOwner.name} will give</h3>
                        {#if isItYou}
                            <div class="text-subdued text-small">
                                Tips for new traders. Try offering:<br>
                                – Cards they don't own<br>
                                – Cards you have duplicates of<br>
                                – Fair rarity trades (<i class="i rarity uncommon tip" title=Uncommon></i> for <i class="i rarity uncommon tip" title=Uncommon></i>)<br>
                                – Two for one trades (<i class="i rarity uncommon tip" title=Uncommon></i> + <i class="i rarity uncommon tip" title=Uncommon></i> for <i class="i rarity rare tip" title=Rare></i>)
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <div class=trade--side--items>
                <ul>
                    {#each offer as print (print.id)}
                        <PrintDetails 
                            bind:print 
                            {actors} 
                            showPrintNumber={isItYou ? "list" : "yes"} 
                            direction={isItYou ? "give" : "receive"} 
                            {tradeId}
                        >
                            {#if canEdit}
                                <Button class="mini danger" icon="minus" on:click={() => removePrint(print)} title="Remove it"/>
                            {/if}
                        </PrintDetails>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
{/if}
{#if state === "bio"}
    <div class=trade--full--bio>
        <div class="trade--full--bio--content break-long-text">
            {#each linky(cardOwner.bio) as text, i}
                {#if i%2}
                    <a target="_blank" href={text}>{text}</a>
                {:else}
                    {text}
                {/if}
            {/each}
        </div>
        {#if isItYou}
            <a class="subdued btn trade--full--bio--edit" href="{actors.you.links.profile}/collection" target=_blank>
                Edit Your Bio
            </a>
        {/if}
    </div>
{/if}

<!-- state === "search" -->
{#if canEdit}
    <!-- just hide this block to not re-render the huge list -->
    <div style:display={state === "search" ? null : "none"}>
        <TradeWindowEditOffer 
            {actors}
            {cardOwner}
            {sett}
            bind:offer
            on:close={() => state = "offer"}
        />
    </div>
{/if}

<style>
    .trade--full--bio--content {
        white-space: pre-line;
    }
</style>
