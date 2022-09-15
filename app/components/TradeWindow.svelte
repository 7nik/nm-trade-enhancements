<script lang="ts" context="module">
    import type NM from "../utils/NMTypes";

    type Actors = {
        you: NM.User,
        partner: NM.User,
        bidder: NM.User,
        responder: NM.User,
        youAreBidder: boolean,
    }

    type InitialData = {
        side: "bidder"|"responder",
        card: NM.Card | NM.Unmerged.Prints,
        sett: {
            id: number,
            name: string,
        },
    }

    export type { Actors, InitialData };
</script>
<!-- @component
    A component for interacting with trades.
    
    You must provide at least either `tradeId` or `actors`.
 -->
 <script lang="ts">
    import { onDestroy } from "svelte";
    import Button from "./elements/Button.svelte";
    import TradeWindowList from "./parts/TradeWindowOffer.svelte";
    import NMApi from "../utils/NMApi";
    import { alert, confirm } from "./dialogs/modals";
    import { preloadUserInfo, unloadUserInfo } from "./parts/PrintDetails.svelte";
    import currentUser from "../services/currentUser";

    /**
     * The trade to load
     */
    export let tradeId: number | null = null;
    /**
     * The users involved in the trade
     */
    export let actors: Actors | null = null;
    /**
     * To create a trade with an initial print
     */
    export let initialData: InitialData | null = null;
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

    $: windowTitle = action === "create" ? `New Trade With ${actors?.partner.first_name}`
        : action === "modify" ? `Modify Trade With ${actors?.partner.first_name}`
        : action === "counter" ? `Counter a Trade From ${actors?.partner.first_name}`
        : action === "expired" ? `${actors?.bidder.name} let this trade expire`
        : action === "proposed" ? `${actors?.bidder.name} proposed a trade`
        : ["modified", "withdrew", "auto-withdrew"].includes(action) ? `${actors?.bidder.name} ${action} this trade`
        // accepted, countered, declined, auto-declined
        : `${actors?.responder.name} ${action} this trade`;

    $: isValidTrade = yourOffer.length > 0 && partnersOffer.length > 0;
    let pageWidth: number; // bound to the browser window width
    $: isMobileLarge = pageWidth < 640;
    $: if (actors) showConversation(actors.partner.id, !isMobileLarge);
    
    // load the trade data
    if (tradeId) {
        // this request should be cached = minimal delay
        NMApi.trade.get(tradeId).then((t) => {
            trade = t;
            
            let youAreBidder = trade.bidder.id === currentUser.id;
            actors = {
                youAreBidder,
                bidder: trade.bidder,
                responder: trade.responder,
                you: youAreBidder ? trade.bidder : trade.responder,
                partner: youAreBidder ? trade.responder : trade.bidder,
            };
            // to simplify the child markup
            actors.you.name = actors.you.first_name = "You";
            yourOffer = trade[youAreBidder ? "bidder_offer" : "responder_offer"].prints;
            partnersOffer = trade[youAreBidder ? "responder_offer" : "bidder_offer"].prints;

            mode = "view";
            action = trade.state;
            preloadUserInfo(actors.you.id);
            preloadUserInfo(actors.partner.id);
        });
    // load the initial data
    } else {
        if (!actors) {
            throw new Error("Actors aren't provided!");
        }
        // to simplify the child markup
        actors.you = {...actors.you, name: "You", first_name: "You"};
        actors[actors.youAreBidder ? "bidder" : "responder"] = actors.you;
        if (initialData) {
            // to speed up showing the window, 
            // at first show a print that lack some unused data
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
                is_replica: false,
                version: 1,
                print_id: 0,
                print_num: 0,
            }
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
                });
        }

        mode = "edit";
        action = "create";
        preloadUserInfo(actors.you.id);
        preloadUserInfo(actors.partner.id);
    }

    onDestroy(() => {
        if (actors) unloadUserInfo(actors.partner.id);
    });

    /**
     * Start a new trade
     */
    function newTrade() {
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
    async function postTrade() {
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
    async function acceptTrade() {
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
    async function declineTrade() {
        action = actors!.youAreBidder ? "withdraw" : "decline";
        if (!await confirm(`Confirm you want to ${action} this trade?`)) return;
        [action, mode] = ACTIONS[action];
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
    function startModify() {
        parentTradeId = trade!.id;
        action = "modify";
        mode = "edit";
    }
    /**
     * Start to counter the trade
     */
    function startCounter() {
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
    function cancelChanges() {
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
    async function cancelTrade(back = false) {
        if ((yourOffer.length || partnersOffer.length) && !await confirm(`
            Are you sure you want to close this trade?
            If you leave, you'll lose your trade in progress.`)) return;
        closeTrade(back);
    }
</script>

<svelte:window bind:innerWidth={pageWidth} />

{#if actors && (mode === "view" || mode === "edit")}
    <div class="nm-modal trade theme-light">
        <div class=nm-modal--content>
            <div class=nm-modal--header>
                {#if backButtonText}
                    <div class=nm-modal--titlebar--left on:click={() => cancelTrade(true)}>
                        <span class=nm-modal--back-btn>
                            <span class=icon-back>&lsaquo;</span>
                            <span class=text-body>Back to {backButtonText}</span>
                        </span>
                    </div>
                {/if}
                {#if isMobileLarge}
                    <div class=nm-modal--titlebar--right>
                        <Button class="subdued" icon="chat" on:click={() => actors && showConversation(actors.partner.id, true)} />
                    </div>
                {/if}
                <div class=nm-modal--titlebar>
                    <div id=trade-title class=nm-modal--titlebar--title>
                        <h2>{windowTitle}</h2>
                    </div>
                </div>
            </div>
            <div class=trade--content>
                <div class="trade--side trade--partner">
                    <TradeWindowList {actors} cardOwner={actors.partner} bind:offer={partnersOffer} canEdit={mode === "edit"} tradeId={trade?.id} sett={initialData?.sett ?? null} />
                </div>
                <div class="trade--side trade--you">
                    <TradeWindowList {actors} cardOwner={actors.you} bind:offer={yourOffer} canEdit={mode === "edit"} tradeId={trade?.id} sett={initialData?.sett ?? null} />
                </div>
            </div>
            <div class=nm-modal--footer>
                <div class=nm-modal--actionbar>
                    <span class="nm-modal--actionbar--left">
                        {#if mode === "edit"}
                            <Button class="subdued" on:click={() => cancelTrade()}>
                                Exit
                            </Button>
                        {:else}
                            <Button class="subdued" on:click={() => closeTrade(false)}>
                                Close
                            </Button>
                        {/if}
                    </span>
                    <span class=nm-modal--actionbar--right>
                        {#if mode === "edit"}
                            {#if action === "counter" || action === "modify"}
                                <Button class="subdued" on:click={cancelChanges}>
                                    Back
                                </Button>
                            {/if}
                            <Button class="primary" disabled={!isValidTrade} on:click={postTrade}>
                                {#if action === "counter"}
                                    Offer Countered Trade
                                {:else if action === "modify"}
                                    Offer Modified Trade
                                {:else if action === "create"}
                                    Offer Trade
                                {/if}
                            </Button>
                        {:else if mode === "view" && action === "proposed"}
                            {#if actors.youAreBidder}
                                <Button class="subdued" on:click={startModify}>
                                    Modify
                                </Button> 
                                <Button class="primary" on:click={declineTrade}>
                                    Withdraw
                                </Button>
                            {:else}
                                <Button class="subdued" on:click={startCounter}>
                                    Counter
                                </Button> 
                                <Button class="subdued" on:click={declineTrade}>
                                    Decline
                                </Button> 
                                <Button class="primary" on:click={acceptTrade}>
                                    Accept
                                </Button>
                            {/if}
                        {:else if mode === "view" && action !== "proposed"}
                            <Button class="primary" on:click={newTrade}>
                                New Trade with {actors.partner.first_name}
                            </Button>
                        {/if}
                    </span> 
                </div>
            </div>
        </div>
    </div>
{:else if mode === "loading"}
    <!-- action processing-->
    <div class="trade--proposing theme-dark">
        <p><span class="load-indicator large"></span></p>
        <p class="text-emphasis text-body-large">
            {action} trade
        </p>
    </div>
{:else if mode === "done"}
    <!-- action done -->
    <div class="trade--proposed theme-dark text-body-large">
        <p><span class=icon-checkmark></span></p>
        <p id=action-completed-text class=text-emphasis>
            You {action} a trade 
            {["proposed", "withdrew", "modified"].includes(action) ? "to" : "from"} 
            {actors?.partner.name}.
        </p>
        <p><Button class="subdued" on:click={() => closeTrade(result)}>Close</Button></p>
    </div>
{/if}

<style>
    .trade--content::before {
        content: none;
    }
    .trade--side.trade--partner {
        border-right: 1px solid #0002;
    }
</style>
