import type NM from "../utils/NMTypes";

import { writable, derived } from "svelte/store";
import NMApi from "../utils/NMApi";
import { liveListProvider } from "../utils/NMLiveApi";
import currentUser from "./currentUser";

type Side = "receive" | "give";
type Direction = Side | "both";
type Level = "card" | "print";

// (receive|give) > cardId > printId > tradeId[]
const cards: Record<Side, Record<number, Record<number, number[]>>> = {
    receive: {},
    give: {},
};
const cardStore = writable(cards);

/**
 * Returns list of trades where the given card is involved
 * @param print - the involved card
 * @param dir - how the card should be involved in a trade
 * @param level - look for a certain print or all prints
 * @return list of trade IDs or `null`
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
function findTrades (print: NM.PrintInTrade, dir: Direction, level: Level) {
    if (!print) return [];

    const tradeIds: (number[]|undefined)[] = [];
    if (level === "print") {
        if (dir === "give" || dir === "both") {
            tradeIds.push(cards.give[print.id]?.[print.print_id]);
        }
        if (dir === "receive" || dir === "both") {
            tradeIds.push(cards.receive[print.id]?.[print.print_id]);
        }
    } else {
        if (cards.give[print.id] && (dir === "give" || dir === "both")) {
            // eslint-disable-next-line guard-for-in, no-restricted-syntax
            for (const pid in cards.give[print.id]) {
                tradeIds.push(cards.give[print.id][pid]);
            }
        }
        if (cards.receive[print.id] && (dir === "receive" || dir === "both")) {
            // eslint-disable-next-line guard-for-in, no-restricted-syntax
            for (const pid in cards.receive[print.id]) {
                tradeIds.push(cards.receive[print.id][pid]);
            }
        }
    }

    return tradeIds.flatMap((arr) => arr ?? []) as number[];
}

/**
 * Returns a store with trades where the given card is involved
 * @param print - the involved card
 * @param dir - how the card should be involved in a trade
 * @param level - look for a certain print or all prints
 * @return list of trade IDs or `null`
 */
function getTrades (print: NM.PrintInTrade, dir: Direction, level: Level) {
    return derived(cardStore, () => {
        const trades = findTrades(print, dir, level);
        // return null instead of the empty array to avoid triggering of
        // all the subscribers by replacing empty array with another empty array
        return trades.length > 0 ? trades : null;
    });
}

/**
 * Whether the card is used in any active trade
 * @param print - the involved card
 * @param dir - how the card should be involved in a trade
 * @param level - look for a certain print or all prints
 * @return list of trade IDs or `null`
 */
function isTrading (print: NM.PrintInTrade, dir: Direction, level: Level) {
    return findTrades(print, dir, level).length > 0;
}

/**
 * Updates usage in trades for the given print
 * @param tradeId - the trade ID with the print
 * @param side - how the print is involved in the trade
 * @param cid - card ID
 * @param pid - print ID
 * @param change - remove or add the print
 */
function updatePrint (tradeId: number, side: Side, cid: number, pid: number, change: -1|1) {
    if (!(cid in cards[side])) cards[side][cid] = {};
    if (!(pid in cards[side][cid])) cards[side][cid][pid] = [];
    if (change > 0) {
        cards[side][cid][pid].push(tradeId);
    } else {
        cards[side][cid][pid] = cards[side][cid][pid]
            .filter((id) => id !== tradeId);
    }
}

/**
 * Adds or removes cards of the trades to the used in trades
 * @param tradeId - the trade ID
 * @param change - add or remove the cards
 */
async function updateTrade (tradeId: number, change: -1|1) {
    const trade = await NMApi.trade.get(tradeId);
    const youAreBidder = trade.bidder.id === currentUser.id;
    for (const print of trade[youAreBidder ? "bidder_offer" : "responder_offer"].prints) {
        updatePrint(tradeId, "give", print.id, print.print_id, change);
    }
    for (const print of trade[youAreBidder ? "responder_offer" : "bidder_offer"].prints) {
        updatePrint(tradeId, "receive", print.id, print.print_id, change);
    }
    cardStore.set(cards);
}

// get and watch for trades and their cards
liveListProvider("trades")
    .on("init", async (trades) => {
        for (const trade of trades) {
            // eslint-disable-next-line no-await-in-loop
            await updateTrade(trade.object.id, +1);
        }
    })
    .on("add", (trade) => {
        updateTrade(trade.object.id, +1);
    })
    .on("remove", (trade) => {
        updateTrade(trade.object.id, -1);
    });

export { getTrades, isTrading };
