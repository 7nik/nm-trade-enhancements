import type NM from "./NMTypes";

import NMAPI from "./NMApi";

const cards : {
    lastUpdate: number,
    receive: Record<number, Record<number, number[]>>,
    give: Record<number, Record<number, number[]>>,
    ready: boolean,
} = {
    lastUpdate: -1,
    // (receive|give) > cardId > printId > tradeIds
    receive: {},
    give: {},
    ready: false
}

let setReady: () => void;
const loading = new Promise<void>((resolve) => setReady = () => {
    cards.ready = true;
    resolve();
});

/**
 * Returns list of trades where the given card is involved
 * @param  {NM.PrintInTrade} print - the involved card
 * @param  {("give"|"receive"|"both")} dir - how the card should be involved in a trade
 * @param  {("print"|"card")} level - look for a certain print or all prints
 * @return {Promise<number[]>} - list of trade IDs
 */
export async function getTrades (print: NM.PrintInTrade, dir: ("give" | "receive" | "both") = "both", level: ("print" | "card") = "print"): Promise<number[]> {
    if (!cards.ready) await loading;

    const tradeIds:number[] = [];
    if (!print) return tradeIds;

    if (level === "print") {
        if (dir === "give" || dir === "both") {
            tradeIds.push(...cards.give[print.id]?.[print.print_id] ?? []);
        }
        if (dir === "receive" || dir === "both") {
            tradeIds.push(...cards.receive[print.id]?.[print.print_id] ?? []);
        }
    } else {
        if (cards.give[print.id] && (dir === "give" || dir === "both")) {
            // eslint-disable-next-line guard-for-in, no-restricted-syntax
            for (const pid in cards.give[print.id]) {
                tradeIds.push(...cards.give[print.id][pid]);
            }
        }
        if (cards.receive[print.id] && (dir === "receive" || dir === "both")) {
            // eslint-disable-next-line guard-for-in, no-restricted-syntax
            for (const pid in cards.receive[print.id]) {
                tradeIds.push(...cards.receive[print.id][pid]);
            }
        }
    }

    return tradeIds;
}

/**
 * Updates usage in trades for the given print
 * @param  {number} tradeId - the trade ID with the print
 * @param  {("give"|"receive")} side - how the print is involved in the trade
 * @param  {number} cid - card ID
 * @param  {number} pid - print ID
 * @param  {(-1|1)} change - remove or add the print
 */
function updatePrint (tradeId: number, side: ("give" | "receive"), cid: number, pid: number, change: -1|1) {
    if (!(cid in cards[side])) cards[side][cid] = {};
    if (!(pid in cards[side][cid])) cards[side][cid][pid] = [];
    if (change > 0) {
        cards[side][cid][pid].push(tradeId);
    } else {
        cards[side][cid][pid] = cards[side][cid][pid]
            .filter((id) => id !== tradeId);
    }
    cards.lastUpdate = Date.now();
}

/**
 * Adds or removes cards of the trades to the used in trades
 * @param tradeId - the trade ID
 * @param change - add or remove the cards
 */
async function updateTrade (tradeId: number, change: -1|1) {
    const trade = await NMAPI.trade.get(tradeId);
    const youAreBidder = trade.bidder.id === NM.you.attributes.id;
    trade[youAreBidder ? "bidder_offer" : "responder_offer"].prints
        .forEach(({ id: cid, print_id: pid }) => {
            updatePrint(tradeId, "give", cid, pid, change);
        });
    trade[youAreBidder ? "responder_offer" : "bidder_offer"].prints
        .forEach(({ id: cid, print_id: pid }) => {
            updatePrint(tradeId, "receive", cid, pid, change);
        });
};

NMAPI.trade.onTradesAdded((trades) => {
    trades.forEach(trade => updateTrade(trade.object.id, +1));
    if (!cards.ready) setReady();
});
NMAPI.trade.onTradeRemoved((trade) => {
    updateTrade(trade.object.id, -1);
});

export default cards;
