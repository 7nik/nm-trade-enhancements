<script lang="ts" context="module">
    import type { XOR } from "../utils/NMTypes";
    import type NM from "../utils/NMTypes";

    type Actors = {
        you: NM.User,
        partner: NM.User,
        bidder: NM.User,
        responder: NM.User,
        youAreBidder: boolean,
    }

    type InitialData = XOR<{
        tradeId: number;
    }, XOR <{
        actors: Actors,
    }, {
        actors: Actors,
        side: "bidder"|"responder",
        card: NM.Card | NM.OwnedCard | NM.Unmerged.Prints,
        sett: {
            id: number,
            name: string,
        },
    }>>

    export type { Actors, InitialData };
</script>
<!-- @component
    A component for interacting with trades.
 -->
 <script lang="ts">
    /* eslint-disable unicorn/consistent-destructuring, sonarjs/no-duplicate-string */
    import { onDestroy, setContext } from "svelte";
    import { writable } from "svelte/store";
    import currentUser from "../services/currentUser";
    import { firstName } from "../services/user";
    import NMApi from "../utils/NMApi";
    import { alert, confirm } from "./dialogs/modals";
    import Button from "./elements/Button.svelte";
    import Icon from "./elements/Icon.svelte";
    import { loadCollectionInfo, unloadCollectionInfo } from "./trade-window/collectionProgress";
    import TradeWindowList from "./trade-window/TradeWindowOffer.svelte";

    /**
     * Object with either existing trade ID or initial trade data
     */
    export let initialData: InitialData;
    /**
     * The label of the Back button
     */
    export let backButtonText: "seekers" | "owners" | null = null;
    /**
     * A callback called after the window get closed
     * @param backOrTrade - the created trade or whether the Back button was pressed
     */
    export let closeTrade: (backOrTrade: boolean | NM.Trade) => void;
    /**
     * A method to toggle the conversation with a user
     * @param userId - the user ID to conversate with
     * @param show - whether show or hide the conversation
     */
    export let showConversation: (userId: number, show: boolean) => void;

    // the next `action` and `mode` for some `action`s
    const ACTIONS: Record<string, [string, "loading" | "done"]> = {
        create: ["proposing", "loading"],
        proposing: ["proposed", "done"],
        modify: ["modifying", "loading"],
        modifying: ["modified", "done"],
        counter: ["countering", "loading"],
        countering: ["countered", "done"],
        accept: ["accepting", "loading"],
        accepting: ["accepted", "done"],
        decline: ["declining", "loading"],
        declining: ["declined", "done"],
        withdraw: ["withdrawing", "loading"],
        withdrawing: ["withdrew", "done"],
    };

    let { actors } = initialData;

    let trade: NM.Trade | null = null;
    let parentTradeId: number | null = null;
    let yourOffer: NM.PrintInTrade[] = [];
    let partnersOffer: NM.PrintInTrade[] = [];
    // the accepted or declined trade, or whether the user pressed the Back button
    let result: NM.Trade | boolean = false;
    // what happens with the trade in general
    let mode: "loading" | "edit" | "view" | "done" = "loading";
    // what the user have done or is doing with the trade
    let action = "loading";

    let windowTitle = "";
    $: if (actors) {
        switch (action) {
            case "loading":
            case "done":
                windowTitle = ""; // the window isn't shown
                break;
            case "create":
                windowTitle = `New Trade With ${firstName(actors.partner)}`;
                break;
            case "modify":
                windowTitle = `Modify Trade With ${firstName(actors.partner)}`;
                break;
            case "counter":
                windowTitle = `Counter a Trade From ${firstName(actors.partner)}`;
                break;
            case "expired":
                windowTitle = `${firstName(actors.bidder)} let this trade expire`;
                break;
            case "proposed":
                windowTitle = `${firstName(actors.bidder)} proposed a trade`;
                break;
            case "modified":
            case "withdrew":
            case "auto-withdrew":
                windowTitle = `${firstName(actors.bidder)} ${action} this trade`;
                break;
            // accepted, countered, declined, auto-declined
            default:
                windowTitle = `${firstName(actors.responder)} ${action} this trade`;
        }
    }

    $: isValidTrade = yourOffer.length > 0 && partnersOffer.length > 0;
    let pageWidth: number; // bound to the browser window width
    $: isMobileLarge = pageWidth < 640;
    $: if (actors) showConversation(actors.partner.id, !isMobileLarge);

    // load the trade data
    if (initialData.tradeId) {
        // this request should be cached = minimal delay
        NMApi.trade.get(initialData.tradeId).then((t) => {
            trade = t;

            const youAreBidder = trade.bidder.id === currentUser.id;
            actors = {
                youAreBidder,
                bidder: trade.bidder,
                responder: trade.responder,
                you: youAreBidder ? trade.bidder : trade.responder,
                partner: youAreBidder ? trade.responder : trade.bidder,
            };
            yourOffer = trade[youAreBidder ? "bidder_offer" : "responder_offer"].prints;
            partnersOffer = trade[youAreBidder ? "responder_offer" : "bidder_offer"].prints;

            mode = "view";
            action = trade.state;
        }, (reason) => {
            alert(String(reason));
            closeTrade(false);
        });
    // load the initial data
    } else if (initialData.actors) {
        if (!actors) {
            throw new Error("Actors aren't provided!");
        }
        // to speed up showing the window,
        // at first show a print that lack some unused data
        if (initialData.card) {
            const fakePrint: NM.PrintInTrade = {
                id: initialData.card.id,
                name: initialData.card.name,
                description: "",
                // @ts-ignore - mismatching isn't critical
                rarity: initialData.card.rarity,
                asset_type: initialData.card.asset_type,
                // @ts-ignore - the missing sizes aren't used anyway
                piece_assets: initialData.card.piece_assets,
                public_url: "/404",
                num_prints_total: 0,
                is_limited_sett: false,
                sett_id: initialData.sett.id,
                sett_name: initialData.sett.name,
                sett_name_slug: "",
                is_replica: initialData.card.is_replica,
                version: 1,
                print_id: 0,
                print_num: 0,
            };
            if (initialData.side === "bidder") {
                yourOffer = [fakePrint];
            } else {
                partnersOffer = [fakePrint];
            }

            NMApi.trade
                .findPrint(actors[initialData.side].id, initialData.card.id)
                .then((print) => {
                    if (initialData!.side === "bidder") {
                        yourOffer = print ? [print] : [];
                    } else {
                        partnersOffer = print ? [print] : [];
                    }
                }, (reason) => {
                    alert(String(reason));
                    if (initialData!.side === "bidder") {
                        yourOffer = [];
                    } else {
                        partnersOffer = [];
                    }
                });
        }

        mode = "edit";
        action = "create";
    }

    const tradeId = writable<number|null>(null);
    $: $tradeId = trade?.id ?? null;
    setContext("tradeId", tradeId);
    $: setContext("actors", actors);

    $: if (actors) {
        loadCollectionInfo(actors.you.id);
        loadCollectionInfo(actors.partner.id);
    }
    onDestroy(() => {
        if (actors) {
            unloadCollectionInfo(actors.you.id);
            unloadCollectionInfo(actors.partner.id);
        }
    });

    /**
     * Start a new trade
     */
    function newTrade () {
        trade = null;
        parentTradeId = null;
        yourOffer = [];
        partnersOffer = [];
        actors!.youAreBidder = true;
        actors!.bidder = actors!.you;
        actors!.responder = actors!.partner;
        action = "create";
        mode = "edit";
    }

    /**
     * Propose this trade
     */
    async function postTrade () {
        if (!await confirm(`Confirm you want to ${action} this trade?`)) return;
        const prevAction = action;
        [action, mode] = ACTIONS[action];
        try {
            await NMApi.trade.create(
                actors!.you.id,
                yourOffer.map((p) => p.print_id),
                actors!.partner.id,
                partnersOffer.map((p) => p.print_id),
                parentTradeId,
            );
            [action, mode] = ACTIONS[action];
        } catch (ex: any) {
            if ("detail" in ex) {
                alert("Unable to propose trade", ex.detail);
            } else {
                alert("Oops! Something went wrong :`(");
            }
            action = prevAction;
            mode = "edit";
        }
    }

    /**
     * Accept this trade
     */
    async function acceptTrade () {
        if (!await confirm("Confirm you want to accept this trade?")) return;
        [action, mode] = ACTIONS.accept;
        try {
            result = await NMApi.trade.accept(trade!.id);
            [action, mode] = ACTIONS[action];
        } catch (ex: any) {
            if ("detail" in ex) {
                alert("Unable to accept trade", ex.detail);
            } else {
                alert("Oops! Something went wrong :`(");
            }
            action = "proposed";
            mode = "view";
        }
    }
    /**
     * Decline this trade
     */
    async function declineTrade () {
        const verb = actors!.youAreBidder ? "withdraw" : "decline";
        if (!await confirm(`Confirm you want to ${verb} this trade?`)) return;
        [action, mode] = ACTIONS[verb];
        try {
            result = await NMApi.trade.decline(trade!.id);
            [action, mode] = ACTIONS[action];
        } catch (ex: any) {
            if ("detail" in ex) {
                alert("Unable to decline trade", ex.detail);
            } else {
                alert("Oops! Something went wrong :`(");
            }
            action = "proposed";
            mode = "view";
        }
    }
    /**
     * Start to modify the trade
     */
    function startModify () {
        parentTradeId = trade!.id;
        action = "modify";
        mode = "edit";
    }
    /**
     * Start to counter the trade
     */
    function startCounter () {
        parentTradeId = trade!.id;
        actors!.youAreBidder = true;
        actors!.bidder = actors!.you;
        actors!.responder = actors!.partner;
        action = "counter";
        mode = "edit";
    }
    /**
     * Revert the changes
     */
    function cancelChanges () {
        parentTradeId = null;
        if (action === "counter") {
            actors!.youAreBidder = false;
            actors!.bidder = actors!.partner;
            actors!.responder = actors!.you;
        }
        yourOffer = trade![actors!.youAreBidder ? "bidder_offer" : "responder_offer"].prints;
        partnersOffer = trade![actors!.youAreBidder ? "responder_offer" : "bidder_offer"].prints;
        action = trade!.state;
        mode = "view";
    }
    /**
     * Close the trade
     * @param back - whether the Back button was pressed
     */
    async function cancelTrade (back = false) {
        if (mode === "edit"
            && (yourOffer.length > 0 || partnersOffer.length > 0)
            && !await confirm(
                "Are you sure you want to close this trade?",
                "If you leave, you'll lose your trade in progress.",
            )
        ) return;
        closeTrade(back);
    }
</script>

<svelte:window bind:innerWidth={pageWidth} on:keyup|capture={(ev) => {
    if (ev.code === "Escape") {
        ev.stopPropagation();
        cancelTrade();
    }
}}/>

{#if actors && (mode === "view" || mode === "edit")}
    <article class="trade-window">
        <header>
            {#if backButtonText}
                <span>
                    <Button type="borderless" on:click={() => cancelTrade(true)}>
                        <span class="back-btn">
                            <span>‹</span>
                            Back to {backButtonText}
                        </span>
                    </Button>
                </span>
            {/if}
            <h2>{windowTitle}</h2>
            {#if isMobileLarge}
                <span>
                    <Button size="nano" type="danger" icon="chat"
                        on:click={() => actors && showConversation(actors.partner.id, true)}
                    />
                </span>
            {/if}
        </header>
        <hr>
        <main>
            <TradeWindowList
                cardOwner={actors.partner}
                bind:offer={partnersOffer}
                canEdit={mode === "edit"}
                sett={initialData?.sett ?? null}
            />
            <TradeWindowList
                cardOwner={actors.you}
                bind:offer={yourOffer}
                canEdit={mode === "edit"}
                sett={initialData?.sett ?? null}
            />
        </main>
        <footer>
            <section>
                {#if mode === "edit"}
                    <Button type="subdued-light" on:click={() => cancelTrade()}>
                        Exit
                    </Button>
                {:else}
                    <Button type="subdued-light" on:click={() => closeTrade(false)}>
                        Close
                    </Button>
                {/if}
            </section>
            <section>
                {#if mode === "edit"}
                    {#if action === "counter" || action === "modify"}
                        <Button type="subdued-light" on:click={cancelChanges}>
                            Back
                        </Button>
                    {/if}
                    <Button type="primary" disabled={!isValidTrade} on:click={postTrade}>
                        {#if action === "counter"}
                            Offer Countered Trade
                        {:else if action === "modify"}
                            Offer Modified Trade
                        {:else}
                            Offer Trade
                        {/if}
                    </Button>
                {:else if action === "proposed"}
                    {#if actors.youAreBidder}
                        <Button type="subdued-light" on:click={startModify}>
                            Modify
                        </Button>
                        <Button type="primary" on:click={declineTrade}>
                            Withdraw
                        </Button>
                    {:else}
                        <Button type="subdued-light" on:click={startCounter}>
                            Counter
                        </Button>
                        <Button type="subdued-light" on:click={declineTrade}>
                            Decline
                        </Button>
                        <Button type="primary" on:click={acceptTrade}>
                            Accept
                        </Button>
                    {/if}
                {:else}
                    <Button type="primary" on:click={newTrade}>
                        New Trade with {actors.partner.first_name}
                    </Button>
                {/if}
            </section>
        </footer>
    </article>
{:else if mode === "loading"}
    <article class="loading">
        <Icon icon="loader" size="40px"/>
        <span>{action} trade</span>
    </article>
{:else if mode === "done"}
    <article class="done">
        <Icon icon=checkmark size="40px" />
        <span>
            You {action} a trade
            {actors?.youAreBidder ? "to" : "from"}
            {actors?.partner.name}.
        </span>
        <Button type="subdued-dark" on:click={() => closeTrade(result)}>
            Close
        </Button>
    </article>
{/if}

<style>
    article {
        font: 300 18px locator-web,Helvetica Neue,Helvetica,Arial,sans-serif;
        display: flex;
        height: 100%;
        box-sizing: border-box;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        justify-content: center;
        font-style: italic;
        font-size: 18px;
        font-weight: 400;
        color: white;
        overflow: hidden;
    }
    article > span {
        color: #b39ea9;
    }
    article.trade-window {
        padding: 40px 0 40px 40px;
        color: #5f5668;
        font-size: 15px;
        gap: 0;
        align-items: stretch;
        font-style: normal;
        position: relative;
    }
    header, footer {
        background: white;
    }
    header {
        padding: 20px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        grid-template-areas: "l c r";
    }
    .back-btn {
        display: flex;
        align-items: center;
        text-transform: none;
        font-size: 15px;
        font-weight: 400;
        letter-spacing: normal;
    }
    .back-btn span {
        font-size: 40px;
        font-weight: 200;
        margin-bottom: 0.2em;
    }
    h2 {
        grid-area: c;
        margin: 0;
        color: #5f5668;
        font-size: 22px;
        font-weight: 300;
        font-style: normal;
    }
    header > span:last-child {
        grid-area: r;
        justify-self: end;
    }
    hr {
        flex-shrink: 0;
        height: 1px;
        margin: 0;
        border: none;
        background-position: bottom left;
        background-repeat: repeat-x;
        background: linear-gradient(90deg, #B078B1, #B5CE80, #51B2D5, #B078B1);
    }
    main {
        display: flex;
        flex-grow: 1;
        min-height: 0;
        gap: 1px;
        background: #DDD;
    }
    footer {
        border-top: 1px solid #DDD;
        padding: 20px;
        display: flex;
        justify-content: space-between;
    }
    footer section {
        gap: 1ch;
        display: flex;
    }
    @media (max-width: 960px) {
        article.trade-window {
            padding: 10px;
            border-radius: 6px;
            margin-right: 30px;
        }
        header {
            padding: 10px;
        }
        .back-btn {
            font-size: 0;
        }
        main {
            display: block;
            overflow: auto;
            background: none;
            flex-direction: column;
        }
        footer {
            padding: 10px;
        }
    }
    @media (max-width: 640px) {
        article.trade-window {
            margin-right: 0;
        }
    }
</style>
