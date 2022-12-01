<!-- @component
    Renders a small trade preview
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import currentUser from "../../services/currentUser";
    import { firstName } from "../../services/user";
    import Button from "../elements/Button.svelte";
    import ImgAsset from "./ImgAsset.svelte";

    type Trade = Pick<NM.Trade, "id"|"bidder_offer"|"responder_offer"> & {
        bidder: NM.UserMinimal,
        responder: NM.UserMinimal,
    }

    /**
     * The trades for making a preview
     */
    export let trades: Trade[];
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
        if (pos + change >= 0 && pos + change < trades.length) {
            pos += change;
        }
    };

    $: youAreBidder = trades[pos].bidder.id === currentUser.id;
    $: partnerName = firstName(trades[pos][youAreBidder ? "responder" : "bidder"]);
    $: yourOffer = trades[pos][youAreBidder ? "bidder_offer" : "responder_offer"].prints;
    $: partnerOffer = trades[pos][youAreBidder ? "responder_offer" : "bidder_offer"].prints;
</script>

{#if trades.length > 1}
    <nav>
        <span class:off={pos === 0}
            on:click|stopPropagation={() => switchPreview(-1)}
        >&lt;</span>
        trade with {partnerName}
        <span class:off={pos === trades.length - 1}
            on:click|stopPropagation={() => switchPreview(+1)}
        >&gt;</span>
    </nav>
{/if}

<a href="?view-trade={trades[pos].id}" on:click>
    <section>
        <header>You will give</header>
        {#each yourOffer as print}
            <div class:highlight={print.id === highlightCardId}>
                <ImgAsset image={print.piece_assets.image.small.url}
                    alt={print.name} icon={print.rarity.class}
                />
            </div>
        {/each}
    </section>
    <hr>
    <section>
        <header>{partnerName} will give</header>
        {#each partnerOffer as print}
            <div class:highlight={print.id === highlightCardId}>
                <ImgAsset image={print.piece_assets.image.small.url}
                    alt={print.name} icon={print.rarity.class}
                />
            </div>
        {/each}
    </section>
    {#if showButton}
        <Button size="max">View Trade</Button>
    {/if}
</a>

<style>
    nav {
        font-size: 13px;
        padding: 7px;
        border-bottom: 1px solid rgba(0,0,0,.1);
        margin-bottom: 5px;
        text-align: center;
        user-select: none;
        color: #2c2830;
    }
    nav span {
        cursor: pointer;
        font-weight: 500;
        padding: 1px 7px;
        border-radius: 10px;
    }
    nav span.off {
        color: #888;
        cursor: initial;
    }
    nav span:not(.off):hover {
        background: rgba(0,0,0,.15);
    }

    a {
        display: flex;
        flex-direction: column;
        border-radius: 5px;
        overflow: hidden;
        text-decoration: none;
        background-color: #efefef;
    }
    hr {
        width: 100%;
        margin: 0;
        border: none;
        border-bottom: 1px solid rgba(0,0,0,.1);
    }
    section {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
        padding: 7px 10px 5px;
    }
    div {
        width: 74px;
        height: 74px;
    }
    div.highlight {
        box-shadow: 0 2px 5px #8400ff;
    }
    header {
        width: 100%;
        color: #857a90;
        font-size: 10px;
        font-family: locator-web,Helvetica Neue,Helvetica,Arial,sans-serif;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: .035em;
    }
    a > :global(button) {
        height: 28px;
    }
</style>
