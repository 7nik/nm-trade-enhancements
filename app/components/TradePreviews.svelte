<!-- @component
    Renders a small trade preview
 -->
<script lang="ts">
    
    import type NM from "../utils/NMTypes";
    
    import currentUser from "../services/currentUser";
    import PrintPreview from "./parts/PrintPreview.svelte";

    /**
     * The trades for making a preview
     */
    export let trades: NM.Trade[];
    /**
     * The card ID to highlight in the trade previews
     */
    export let highlightCardId = -1;
    /**
     * Whether to show the button View Trade
     */
    export let showButton = true;

    if (trades.length === 0) throw new Error("No trades provided");

    let pos = 0;
    const switchPreview = (change: 1|-1) => {
        if (pos+change >= 0 && pos+change < trades.length) {
            pos += change;
        }
    };

    $: youAreBidder = trades[pos].bidder.id === currentUser.id;
    $: partnerName = trades[pos][youAreBidder ? "responder" : "bidder"].name;
    $: yourOffer = youAreBidder ? trades[pos].bidder_offer.prints : trades[pos].responder_offer.prints;
    $: partnerOffer = youAreBidder ? trades[pos].responder_offer.prints : trades[pos].bidder_offer.prints;
</script>

{#if trades.length > 1}
    <header class="text-prominent text-small">
        <span class:off={pos===0} on:click={() => switchPreview(-1)}>&lt;</span>
        trade with {partnerName}
        <span class:off={pos===trades.length-1} on:click={() => switchPreview(+1)}>&gt;</span>
    </header>
{/if}

<a class="trade-preview" href="?view-trade={trades[pos].id}" on:click>
    <div class="trade-preview--give">
        <div class="trade-preview--heading small-caps">You will give</div>
        {#each yourOffer as print}
            <PrintPreview {print} highlight={print.id === highlightCardId} />
        {/each}
    </div>
    <div class="trade-preview--get">
        <div class="trade-preview--heading small-caps">{partnerName} will give</div>
        {#each partnerOffer as print}
            <PrintPreview {print} highlight={print.id === highlightCardId} />
        {/each}
    </div>
    {#if showButton}
        <div class="btn small trade-preview--action">View Trade</div>
    {/if}
</a>

<style>
    header {
        padding: 7px;
        border-bottom: 1px solid rgba(0,0,0,.1);
        text-align: center;
        user-select: none;
    }
    header span {
        cursor: pointer;
        font-weight: 500;
        padding: 1px 7px;
        border-radius: 10px;
    }
    header span.off {
        color: #888;
        cursor: initial;
    }
    header span:not(.off):hover {
        background: rgba(0,0,0,.15);
    }
</style>
