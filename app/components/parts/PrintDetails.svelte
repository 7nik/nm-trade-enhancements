<script context="module" lang="ts">
    import type { Readable } from "svelte/store";

    import OwnedCards from "../../services/ownedCards";
    import { derived } from "svelte/store";

    const cardInfo = new Map<number, OwnedCards>();
    const cardInfoUsage: Record<number, number> = {};

    function getPrintCount(userId: number, cardId: number, defCount: number | null = null) {
        if (!cardInfo.has(userId)) {
            cardInfo.set(userId, new OwnedCards(userId));
        }
        const ownedCards = cardInfo.get(userId)!;
        return derived(
            ownedCards.getPrintCount(cardId, true),
            (count) => (ownedCards.isLoading ? defCount : count),
        );
    }
</script>
<!-- @component
    Renders a print in the trade window, may change the print number
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    import type { Actors } from "../TradeWindow.svelte";

    import PrintAsset from "./PrintAsset.svelte";
    import CollectionProgress from "./CollectionProgress.svelte";
    import NMApi from "../../utils/NMApi";
    import { getTrades, isTrading } from "../../utils/cardsInTrades";
    import { tradePreview } from "../tradePreviews";
    import { getContext, onDestroy } from "svelte";
    import { num2text } from "../../utils/utils";
    import Icon from "../elements/Icon.svelte";
    import tip from "../elements/tip";
    import RarityText from "../elements/RarityText.svelte";

    /**
     * The print to display, can be replaced
     */
    export let print: NM.PrintInTrade;
    /**
     * Whether show the print number and allow to change it
     */
    export let showPrintNumber: "yes" | "no" | "list" = "no";

    const actors = getContext<Actors>("actors");
    const direction = getContext<boolean>("isItYou") ? "give" : "receive";
    const tradeId = getContext<Readable<number|null>>("tradeId");


    $: total = print.num_prints_total === "unlimited" ? "∞" : num2text(print.num_prints_total);

    let printChooserState: "off" | "view" | "loading" | "select";
    $: printChooserState = showPrintNumber === "list" ? "view" : "off";
    let prints: Record<number|string, NM.PrintInTrade & {trading?:boolean}> = {
        [print.print_num]: print,
    };
    // get all the numbers of all the copies the user owns
    async function loadPrints () {
        printChooserState = "loading";
        const details = await NMApi.user.ownedPrints(actors.you.id, print.id);
        prints = details.prints.map((p) => ({
            ...print,
            print_num: p.print_num,
            print_id: p.id,
        })).reduce((map, p) => {
            map[p.print_num] = p;
            return map;
        }, {} as Record<number, NM.PrintInTrade>);
        printChooserState = "select";
    }

    const trades = derived(
        getTrades(print, direction, "card"),
        (tradeIds) => tradeIds?.filter((id) => id !== $tradeId),
    );
    $: isTradingPrint = derived(
        getTrades(print, direction, direction === "give" ? "print" : "card"),
        (tradeIds) => tradeIds && tradeIds.find((id) => id !== $tradeId),
    );
    // update the list when trades changes
    $: if (printChooserState === "select") {
        for (let num in prints) {
            let trading = isTrading(prints[num], direction, direction === "give" ? "print" : "card");
            if (prints[num].trading !== trading) {
                prints[num] = {
                    ...prints[num],
                    trading,
                }
            }
            print = Object.values(prints)
                .find(({ print_id }) => print.print_id === print_id)!;
        }
    }
    // the number of copies, init with data from the trade, if available,
    // but the data in the trade can be outdated because it's cached
    // so, anyway load the actual data
    const youOwn = getPrintCount(
        actors.you.id,
        print.id,
        actors.youAreBidder
            ? (print.own_counts?.bidder ?? null)
            : (print.own_counts?.responder ?? null),
    );
    const partnerOwns = getPrintCount(
        actors.partner.id,
        print.id,
        actors.youAreBidder
            ? (print.own_counts?.responder ?? null)
            : (print.own_counts?.bidder ?? null),
    );

    cardInfoUsage[actors.partner.id] = 1 + (cardInfoUsage[actors.partner.id] ?? 0);
    onDestroy(() => {
        cardInfoUsage[actors.partner.id] -= 1;
        if (cardInfoUsage[actors.partner.id] === 0) {
            cardInfo.get(actors.partner.id)?.stop();
            cardInfo.delete(actors.partner.id);
        }
    });
</script>

<svelte:options immutable/>

<li>
    <PrintAsset {print} size="medium" setSize={false} isPublic={true} hideIcons={false} />
    <dl>
        <dt>Name</dt>
        <dd>{print.name}</dd>

        <dt>Series</dt>
        <dd>
            <a target=_blank href="/series/{print.sett_id}">{print.sett_name}</a>
            <slot name="series"/>
        </dd>

        <dt>Collected</dt>
        <dd>
            <CollectionProgress user={actors.you} settId={print.sett_id} />,
            <CollectionProgress user={actors.partner} settId={print.sett_id} />
        </dd>

        <dt>Rarity</dt>
        <dd>
            <Icon icon={print.rarity.class} hint={print.rarity.name} />
            <RarityText rarity={print.rarity.class}>{print.rarity.name}</RarityText>
        </dd>

        <dt>{showPrintNumber === "no" ? "Copies" : "Print"}</dt>
        <dd>
            {#if showPrintNumber === "no"}
                {total} cards
            {:else if printChooserState === "off"}
                #{print.print_num}/{total} cards
            {:else if printChooserState === "view"}
                <span style:cursor="pointer" on:click={loadPrints}
                    use:tip={"Click to change the print number"}
                >
                    #{print.print_num}/{total} cards
                </span>
            {:else if printChooserState === "loading"}
                <span style:cursor="wait">
                    #{print.print_num}/{total} cards
                </span>
            {:else if printChooserState === "select"}
                <select class="print-chooser"
                    disabled={Object.keys(prints).length == 1}
                    bind:value={print}
                >
                    {#each Object.keys(prints) as num}
                        <option value={prints[num]}>
                            #{num} {prints[num].trading ? "⇄" : ""}
                        </option>
                    {/each}
                </select>/{total} cards
            {/if}
        </dd>

        <dt>Own</dt>
        <dd>
            <span class:text-warning={$youOwn === 0}>
                You own {$youOwn ?? "?"}.
            </span>
            <span class:text-warning={$partnerOwns === 0}>
                {actors.partner.first_name} owns {$partnerOwns ?? "?"}.
            </span>
        </dd>
    </dl>

    {#if $trades && $trades.length > 0 }
        <div class="trade-usage" class:trade-print={$isTradingPrint}
            use:tradePreview={{ tradeIds: $trades }}
        >
            <Icon icon="card-trading" size="12px"/>
        </div>
    {/if}

    {#if $$slots.default}
        <div class=card-action>
            <slot/>
        </div>
    {/if}
</li>

<style>
    li {
        padding: 10px 20px;
        display: flex;
        position: relative;
        align-items: flex-start;
        flex-shrink: 0;
    }
    li:not(:last-child) {
        border-bottom: 1px solid rgba(0,0,0,.1);
    }
    li > :global(:first-child) {
        min-width: 20%;
        width: 20%;
        border-radius: 5px;
        overflow: hidden;
    }
    dl {
        flex-grow: 1;
        margin: 5px 10px;
        line-height: 1.4;
        display: grid;
        grid-template-columns: min-content auto;
        gap: 0 10px;
    }
    dt {
        color: #9f96a8;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        justify-self: end;
        align-self: center;
    }
    dd {
        font-size: 13px;
        font-weight: 400;
        margin: 0;
    }
    dd:first-of-type {
        font-size: 15px;
        font-weight: 400;
        line-height: 18px;
        word-break: break-word;
    }
    a:link, a:visited, a:hover {
        color: #0d9ce6;
        text-decoration: none;
    }
    select {
        border: none;
        outline: none;
        background: none;
        color: inherit;
        font-size: inherit;
        font-weight: inherit;
        margin: -2px;
        cursor: pointer;
    }
    .text-warning {
        color: #E7327C;
    }
    .trade-usage {
        position: absolute;
        right: 30px;
        top: 15px;
        opacity: 0.5;
    }
    .trade-usage.trade-print {
        opacity: 1;
    }
    .card-action {
        align-self: center;
    }
</style>
