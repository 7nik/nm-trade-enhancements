<script context="module" lang="ts">
    import type { OwnedCards } from "../../services/ownedCards";

    import { writable } from "svelte/store";
    import getInfo from "../../services/ownedCards";
    import { preloadCollectionInfo, unloadCollectionInfo } from "./CollectionProgress.svelte";

    const cardInfo: Record<number, OwnedCards> = {};
    const loading: Record<number, ReturnType<typeof getInfo>> = {};
    const getPrintCount = writable(
        (userId: number, cardId: number) => cardInfo[userId]?.getPrintCount(cardId)
    );

    async function preloadUserInfo (userId: number) {
        preloadCollectionInfo(userId);
        loading[userId] = getInfo(userId);
        cardInfo[userId] = (await loading[userId]).userCards;
        // to change the reference
        getPrintCount.update(() => (userId, cardId) => cardInfo[userId]?.getPrintCount(cardId));
    }
    async function unloadUserInfo (userId: number) {
        if (!userId) return;
        unloadCollectionInfo(userId);
        (await loading[userId])?.freeData();
        delete loading[userId];
        delete cardInfo[userId];
    }
    export { preloadUserInfo, unloadUserInfo };
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
    import { getTrades as trades } from "../../utils/cardsInTrades";
    import addTradePreview from "../../enhancements/addTradePreview";

    /**
     * The involved users
     */
    export let actors: Actors;
    /**
     * The print to display, can be replaced
     */
    export let print: NM.PrintInTrade;
    /**
     * Whether show the print number and allow to change it
     */
    export let showPrintNumber: "yes" | "no" | "list" = "no";
    /**
     * The side of a trade
     */
    export let direction: "give" | "receive";
    /**
     * The current viewed trade
     */
    export let tradeId: number | null = null;
    
    $: total = print.num_prints_total === "unlimited" ? "∞" 
        : print.num_prints_total < 1000 ? print.num_prints_total
        : Math.round(print.num_prints_total / 100) / 10 + "k";
    
    if (!print.own_counts) {
        if (!loading[actors.you.id]) preloadUserInfo(actors.you.id);
        if (!loading[actors.partner.id]) preloadUserInfo(actors.partner.id);
    }

    let printChooserState: "off" | "view" | "loading" | "select" = showPrintNumber === "list" ? "view" : "off";
    let prints: Record<number, NM.PrintInTrade & {trading?:boolean}> = {
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

    $: tradeIds = $trades.find(print, direction, direction === "give" ? "print" : "card")
        .filter((id) => id !== tradeId);
    // update the list when trades changes
    $: if (printChooserState === "select") {
        for (let num in prints) {
            let trading = $trades.find(prints[num], direction, direction === "give" ? "print" : "card")
                .length > 0;
            if (prints[num].trading !== trading) {
                prints[num] = {
                    ...prints[num],
                    trading,
                }
                if (prints[num].print_id === print.print_id) {
                    print = prints[num];
                }
            }
        }
    }
    // the number of copies, init with data from the trade, if available
    let youOwn: number | null = print.own_counts 
        ? actors.youAreBidder 
            ? print.own_counts.bidder 
            : print.own_counts.responder
        : null;
    let partnerOwns: number | null = print.own_counts 
        ? actors.youAreBidder 
            ? print.own_counts.responder
            : print.own_counts.bidder 
        : null;
    // data in the trade can be outdated because it is cached
    // so, load the actual data
    $: youOwn = $getPrintCount(actors.you.id, print.id) ?? youOwn;
    $: partnerOwns = $getPrintCount(actors.partner.id, print.id) ?? partnerOwns;
</script>

<svelte:options immutable/>

<li class=trade--item>
    <div class="trade--item--piece">
        <PrintAsset {print} size="medium" isPublic={true} />
    </div>

    <dl class="trade--item--meta text-small">
        <dt class=small-caps>Name</dt>
        <dd class="text-body text-prominent">{print.name}</dd>

        <dt class=small-caps>Series</dt>
        <dd>
            <a target=_blank class=href-link href="/series/{print.sett_id}">{print.sett_name}</a>
            <slot name="series"/>
        </dd>
        
        <dt class=small-caps>Collected</dt>
        <dd>
            <CollectionProgress user={actors.you} settId={print.sett_id} />,
            <CollectionProgress user={actors.partner} settId={print.sett_id} />
        </dd>

        <dt class=small-caps>Rarity</dt>
        <dd>
            <i class="i rarity {print.rarity.class}"></i> 
            <span class="text-rarity-{print.rarity.class}">{print.rarity.name}</span>
        </dd>

        <dt class=small-caps>{showPrintNumber === "no" ? "Copies" : "Print"}</dt>
        <dd>
            {#if showPrintNumber === "no"}
                {total} cards
            {:else if printChooserState === "off"}
                #{print.print_num}/{total} cards
            {:else if printChooserState === "view"}
                <span class="tip" style:cursor="pointer" on:click={loadPrints} 
                    title="Click to change the print number"
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
                    {#each Object.keys(prints).map(Number) as num}
                        <option value={prints[num]}>
                            #{num} {prints[num].trading ? "⇄" : ""}
                        </option>
                    {/each}
                </select>/{total} cards
            {/if}
        </dd>

        <dt class=small-caps>Own</dt>
        <dd>
            <span class=you-own class:text-warning={youOwn === 0}>
                You own {youOwn ?? "?"}.
            </span> 
            <span class=partner-owns class:text-warning={partnerOwns === 0}>
                {actors.partner.first_name} owns {partnerOwns ?? "?"}.
            </span>
        </dd>
    </dl>

    {#if tradeIds.length > 0}
        <i class="icon-card-trading" use:addTradePreview={{ tradeIds }}></i>
    {/if}

    {#if $$slots.default}
        <div class=trade--item--action>
            <slot/>
        </div>
    {/if}
</li>

<style>
    .trade--item--meta dt {
        width: 80px;
    }
    .trade--item--meta dd {
        width: calc(100% - 80px);
    }
    .print-chooser {
        border: none;
        background: none;
        color: #5f5668;
        cursor: pointer;
    }
    .icon-card-trading {
        position: absolute;
        right: 30px;
        top: 15px;
        font-size: 12px;
        background: black;
        padding: 2px;
        transform: rotate(45deg);
    }
    .icon-card-trading::before {
        content: 'S';
        color: white;
        transform: rotate(-45deg);
    }
</style>
