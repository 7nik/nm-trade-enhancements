import type NM from "./NMTypes";
import type { Manager } from "socket.io-client";

import { getCookie } from "./utils";

let lastRequest: Promise<any> = Promise.resolve();
/**
 * API call to server
 * @param  {("api"|"napi"|"root")} type - Which API scheme use
 * @param  {string} url - Relative URL to API
 * @param  {RequestInit} [body] - Body (params) of the request
 * @return {Promise<Object>} Parsed JSON response
 */
function api<T> (type: ("api" | "napi" | "root"), url: string, body?: RequestInit): Promise<T> {
    let fullUrl: string;
    switch (type) {
        // TODO: add support of the staging server
        case "api":  fullUrl = `https://www.neonmob.com/api${url}`; break;
        case "napi": fullUrl = `https://napi.neonmob.com${url}`;    break;
        case "root": fullUrl = `https://www.neonmob.com${url}`;     break;
        default:     fullUrl = url;
    }
    // forbid parallel requests
    lastRequest = lastRequest
        .then(() => fetch(fullUrl, body), () => fetch(fullUrl, body))
        .then((res) => res.json());
    return lastRequest;
}

type ListenerAddTrades = (trades: NM.TradeEvent[]) => void;
type ListenerRemoveTrade = (trade: NM.TradeEvent) => void;

const listeners: {
    addTrades: ListenerAddTrades[],
    removeTrade: ListenerRemoveTrade[],
} = {
    addTrades: [],
    removeTrade: [],
};
const ioListeners = {
    tradesLoaded({ results }: { results: NM.TradeEvent[] }) {
        listeners.addTrades.forEach(fn => fn(results));
    },
    tradeAdded(result: NM.TradeEvent) {
        listeners.addTrades.forEach(fn => fn([result]));
    },
    tradeRemoved(result: NM.TradeEvent) {
        listeners.removeTrade.forEach(fn => fn(result));
    },
}

let socketTrades: Manager | null = null;
// set the connection when the NM's io will be available
setTimeout(function fn() {
    if (typeof io !== "undefined") {
        socketTrades = io.connect(
            "https://napi.neonmob.com/trades",
            // @ts-ignore
            { transports: ["websocket"] }, 
        );
        if (listeners.addTrades.length > 0) {
            socketTrades.on("loadInitial", ioListeners.tradesLoaded);
            socketTrades.on("addItem", ioListeners.tradeAdded);
        }
        if (listeners.removeTrade.length > 0) {
            socketTrades.on("removeItem", ioListeners.tradeRemoved);
        }
    } else {
        setTimeout(fn, 100);
    }
}, 0);

/**
 * Merge objects into one which are returned by some endpoints
 * @param data - objects container to merge
 * @returns merged data
 */
function merge<Data extends object>(data: NM.Unmerged.Container<Data>): Data {
    function mergeObj (obj: Record<string, any>): any {
        if (typeof obj !== "object" || obj === null) return obj;
        if (Array.isArray(obj)) {
            // if it's a pointer, resolve it
            if (obj[0] === "ptr" && obj[1] in data.refs) {
                return mergeObj(data.refs[obj[1]]);
            }
            return obj.map(mergeObj);
        }

        const full: Record<string, any> = {};
        for (const key of Reflect.ownKeys(obj)) {
            full[key as string] = mergeObj(obj[key as string]);
        }
        return full;
    }
    return mergeObj(data.payload);
}

export default {
    call<T> (type: ("api" | "napi" | "root"), url: string, body?: RequestInit): Promise<T> {
        return api(type, url, body);
    },

    card: {
        /**
         * Get all cards of a series
         * @param userId - the cards owner
         * @param settId - the series
         * @returns short card data
         */
        ofSett (userId: number, settId: number): Promise<NM.Card[]> {
            return api("napi", `/user/${userId}/sett/${settId}`);
        },
        /**
         * Toggle the card favoritism
         * @param id - the card id
         * @returns the new state of the card favoritism
         */
        async toggleFavorite (id: number): Promise<boolean> {
            const data = await api<NM.Unmerged.Container<{ favorited: boolean }>>(
                "api", 
                `/pieces/${id}/favorite/`, 
                {
                    method: "POST",
                    headers: new Headers({
                        "X-CSRFToken": (getCookie("csrftoken") || ""),
                    }),
                },
            );
            return data.payload.favorited;
        }
    },
    category: {
        // list: /api/categories/?page=[PAGE] 
        // setts: /api/setts/legacy_list/?category=[CATEGORY]&metrics_id=[USER_ID]&user_id=[USER_ID]&page_size=[BETWEEN 1 AND 50]
    },
    trade: {
        /**
         * Get the trade info
         * @param id - trade ID
         */
        get (id: number): Promise<NM.Trade> {
            return api("api", `/trades/${id}/`)
        },
        /**
         * Listen for new trades
         * @param callback - when trades are added
         */
        onTradesAdded (callback: ListenerAddTrades) {
            listeners.addTrades.push(callback);
            if (listeners.addTrades.length === 1) {
                socketTrades?.on("loadInitial", ioListeners.tradesLoaded);
                socketTrades?.on("addItem", ioListeners.tradeAdded);
            }
        },
        /**
         * Listen for completed trades
         * @param callback - when a trade get completed
         */
        onTradeRemoved (callback: ListenerRemoveTrade) {
            listeners.removeTrade.push(callback);
            if (listeners.removeTrade.length === 1) {
                socketTrades?.on("removeItem", ioListeners.tradeRemoved);
            }
        },
        // completedTradeInfo: napi /activityfeed/story/trade/[TRADE_ID]
        // findPrint: /api/search/prints/?user_id=[USER_ID]&partner_id=[PARTNER_ID]&not_owned_by=[PARTNER_ID IF UNOWNED CHECKED]&duplicates_only=[TRUE IF 2+ CHECKED]&sett=[SET_ID]&common=[true or false]&uncommon=[true or false]&rare=[true or false]&veryRare=[true or false]&extremelyRare=[true or false]&chase=[true or false]&variant=[true or false]

    },
    sett: {
        /**
         * Get the series info
         * @param id - series ID
         */
        get (id: number): Promise<NM.Sett> {
            return api("api", `/setts/${id}/`)
        },
        /**
         * Get the series' pack tiers
         * @param id - series ID
         */
        packTiers (id: number): Promise<NM.PackTier[]> {
            return api("api", `/pack-tiers/?sett_id=${id}`)
        },
        // activityFeed: napi /activityfeed/sett/[SET_ID]/?amount=[BETWEEN 10 AND 100]&page=[BETWEEN 1 AND 100]
        // openedPackInfo: napi /activityfeed/story/pack-opened/[ACTIVITY_ID]
        // cardsInfo: /api/sets/[SET_ID]/piece-names 
    },
    user: {
        /**
         * Get user's activity feed
         * @param id - the user ID
         * @param amount - number of items per page
         * @param page - page number starting from 1
         */
        activityFeed (id: number, amount = 5, page = 1): Promise<NM.Activity<{}>[]> {
            return api("napi", `/activityfeed/user/${id}/?amount=${amount}&page=${page}`);
        },
        ownedSettsMetrics (id: number): Promise<NM.SettMetrics[]> {
            return api("napi", `/user/${id}/owned-setts-metrics`);
        },
        async ownedPrints (userId: number, cardId: number): Promise<NM.Unmerged.Prints> {
            const data = await api<NM.Unmerged.Container<NM.Unmerged.Prints>>("api", `/users/${userId}/piece/${cardId}/detail/`);
            return merge(data);

        } 
        // get: `/api/users/${id}`
        // printCounts: `/user/${id}/print-counts`
        // displayCase: `/user/${id}/display-case`
        // secondsUntilFreebieReady: `/seconds-until-freebie-ready`
        // numFreebieLeft: POST '/num-freebie-left`
        // friends: `/api/friend`
        // isFriend: `/api/friend/${id}`
        // blockedUsers: `/api/block_user`
        // isUserBlocked: /api/block_user/${id}`
        // collection: /api/users/[USER_ID]/collections/[SET_ID]
    },
}
