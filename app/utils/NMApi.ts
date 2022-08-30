import type NM from "./NMTypes";
import type { Manager } from "socket.io-client";

import { debug, getCookie } from "./utils";
import Collection from "./Collection";
import { login } from "../components/dialogs/modals";

const MAIN_SERVER = location.host;
const NAPI_SERVER = location.host.startsWith("staging") ? "napi-staging.neonmob.com" : "napi.neonmob.com"

let logging: Promise<void> | null = null;
let lastRequest: Promise<any> = Promise.resolve();
/**
 * API call to server
 * @param  {("api"|"napi"|"full")} type - Which API scheme use
 * @param  {string} url - Relative URL to API
 * @param  {RequestInit} [body] - Body (params) of the request
 * @return {Promise<Object>} Parsed JSON response
 */
function api<T> (type: ("api" | "napi" | "full"), url: string, body?: RequestInit): Promise<T> {
    let fullUrl: string;
    switch (type) {
        case "api":  fullUrl = `https://${MAIN_SERVER}/api${url}`; break;
        case "napi": fullUrl = `https://${NAPI_SERVER}${url}`;     break;
        case "full": fullUrl = url;
    }
    // TODO: allow parallel
    // forbid parallel requests
    lastRequest = lastRequest
        .then(() => fetch(fullUrl, body), () => fetch(fullUrl, body))
        .then(async (res) => {
            if (res.ok) {
                return res.json();
            }
            const data = await res.json();
            if (res.status === 401) {
                // await when user sign in and re-try the request
                if (!logging) {
                    logging = login();
                }
                await logging;
                logging = null;
                return fetch(fullUrl, body).then(res => res.json());
            }
            if (data.detail) {
                return Promise.reject(data);
            }
            debug(fullUrl, res.status, data);
            let detail: string;
            switch (res.status) {
                case 400: detail = "Oops! Could not save!"; break;
                case 403: detail = "Sorry, you're not authorized. Make sure you are logged in to the right account!"; break;
                case 404: detail = "We couldn't find what you're looking for. Please refresh the page or contact support@neonmob.com"; break;
                case 503: detail = "Our servers are a little tuckered out. Please try again!"; break;
                default: detail = "Oops! Something bad happened! Please refresh the page or contact support@neonmob.com"; break;
            }
            return Promise.reject({ detail });
        });
    return lastRequest;
}
/**
 * Does a POST request with CSRF token
 * @param  {("api"|"napi"|"full")} type - Which API scheme use
 * @param  {string} url - Relative URL to API
 * @param  {BodyInit|object} [body] - Params of the request
 * @return {Promise<any>} Parsed JSON response
 */
function post<T> (type: ("api" | "napi" | "full"), url: string, body?: BodyInit | object): Promise<T> {
    const headers: HeadersInit = {
        // "Content-Type": "application/json",
        "X-CSRFToken": (getCookie("csrftoken") || ""),
    };
    // if it is a plain object
    if (body && Object.getPrototypeOf(body) === Object.prototype) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
    }
    return api<T>(type, url, {
        method: "POST",
        body: body as BodyInit,
        headers,
    });
}

const cache: {
    trades: Collection<NM.Trade>,
} = {
    trades: new Collection<NM.Trade>("cache:trades", 100),
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
            // @ts-ignore - io version doesn't match
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

type Paginated<T> = {
    count: number,
    next: string | null,
    previous: string | null,
    results: T[],
}
type Paginator<T> = {
    count: number,
    next: (() => Promise<Paginator<T>>) | null,
    previous: (() => Promise<Paginator<T>>) | null,
    results: T[],
}
function paginator<T> (data: Paginated<T>): Paginator<T> {
    return {
        count: data.count,
        results: data.results,
        next: data.next ? () => API.get<Paginated<T>>(data.next!).then(paginator) : null,
        previous: data.previous ? () => API.get<Paginated<T>>(data.previous!).then(paginator) : null,
    }
}

const API = {
    get<T> (url: string, body?: Record<string, string|number|boolean>): Promise<T> {
        if (body) {
            let link = new URL(url);
            for (const key in body) {
                link.searchParams.append(key, body[key].toString());
            }
            url = link.toString();
        }
        return api("full", url, body);
    },
    post<T> (url: string, body?: Record<string, string|number|boolean>): Promise<T> {
        return post("full", url, body);
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
         * @param [allowCache=true] - allow to use cache
         */
        async get (id: number, allowCache = true): Promise<NM.Trade> {
            if (allowCache) {
                const trade = cache.trades.find(id);
                if (trade) return trade;
            }
            const trade = await api<NM.Trade>("api", `/trades/${id}/`);
            // make the prints go in descending order of rarity
            trade.bidder_offer.prints.reverse().sort((a, b) => b.rarity.rarity - a.rarity.rarity);
            trade.responder_offer.prints.reverse().sort((a, b) => b.rarity.rarity - a.rarity.rarity);
            
            cache.trades.add(trade);
            return trade;
        },
        /**
         * Proposes a trade
         * @param you - your ID
         * @param yourOffer - prints ID you offer
         * @param partner - partner's ID
         * @param partnerOffer - prints ID you ask
         * @param parentTrade - parent trade ID, in case of modifying or countering
         * @returns a created trade (not really) or error message
         */
        create (you: number, yourOffer: number[], partner: number, partnerOffer: number[], parentTrade?: number | null) {
            return post<NM.TradeResult>("api", "/trades/propose/", {
                bidder: you,
                bidder_offer: { prints: yourOffer },
                responder: partner,
                responder_offer: { prints: partnerOffer },
                parent_id: parentTrade ?? null,
            });
        },
        accept (id: number) {
            return post<NM.Trade>("api", `/trades/${id}/accept/`);
        },
        decline (id: number) {
            return post<NM.Trade>("api", `/trades/${id}/decline/`);
        },
        /**
         * Get info about a certain card
         * @param ownerId - the card owner ID
         * @param cardId  - the card ID
         * @returns 
         */
        async findPrint (ownerId: number, cardId: number): Promise<NM.PrintInTrade> {
            const data = await api<Paginated<NM.PrintInTrade>>("api", `/search/prints/?user_id=${ownerId}&piece_id=${cardId}`);
            return data.results[0];
        },
        /**
         * Search for prints
         * @param ownerId - the print owner
         * @param options - the filters
         * @returns paginated results
         */
        async findPrints (ownerId: number, options: {
            cardId: number | null, // to get exact card
            cardName: string | null, // partial name of a card
            sharedWith: number | null, // user ID
            notOwnedBy: number | null, // user ID
            wishlistedBy: number | null, // user ID
            settId: number | null,
            duplicatesOnly: boolean,
            common: boolean,
            uncommon: boolean,
            rare: boolean,
            veryRare: boolean,
            extraRare: boolean,
            chase: boolean,
            variant: boolean,
            legendary: boolean,
        }) {
            const query = new URLSearchParams();
            query.append("user_id", ownerId.toString());
            let key: keyof typeof options;
            for (key in options) {
                if (options[key] === null) continue;
                const str = options[key]!.toString();
                switch (key) {
                    case "cardId": query.append("piece_id", str); break;
                    case "cardName": query.append("search", str); break;
                    case "sharedWith": query.append("incomplete_by", str); break;
                    case "notOwnedBy": query.append("not_owned_by", str); break;
                    case "wishlistedBy": query.append("wish_list_by", str); break;
                    case "duplicatesOnly": query.append("duplicates_only", str); break;
                    case "settId": query.append("sett", str); break;
                    default: query.append(key, str); break;
                }
            }

            return paginator(await api<Paginated<NM.PrintInTrade>>("api", `/search/prints/?${query}`));
        },
        /**
         * Listen for current and new trades
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
         * Listen for completion of trades
         * @param callback - when a trade get completed
         */
        onTradeRemoved (callback: ListenerRemoveTrade) {
            listeners.removeTrade.push(callback);
            if (listeners.removeTrade.length === 1) {
                socketTrades?.on("removeItem", ioListeners.tradeRemoved);
            }
        },
        // completedTradeInfo: napi /activityfeed/story/trade/[TRADE_ID]
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
        /**
         * Get short info about number of collected cards in each series
         * @param id - the user ID
         * @returns - info about collected cards in each user's collection
         */
        ownedSettsMetrics (id: number): Promise<NM.SettMetrics[]> {
            return api("napi", `/user/${id}/owned-setts-metrics`);
        },
        /**
         * Get the prints the user owns
         * @param userId - the card owner
         * @param cardId - the card ID
         * @returns short info about the card and the collected prints
         */
        async ownedPrints (userId: number, cardId: number): Promise<NM.Unmerged.Prints> {
            const data = await api<NM.Unmerged.Container<NM.Unmerged.Prints>>("api", `/users/${userId}/piece/${cardId}/detail/`);
            return merge(data);

        }, 
        /**
         * Get the number of copies of each card the user owns
         * @param id - the owner ID
         * @returns array of cardID - number of copies
         */
        printCounts (id: number): Promise<NM.PrintCount[]> {
            return api("napi", `/user/${id}/print-counts`);
        },
        /**
         * Get recommended series based on the series
         * @param userId - the user ID
         * @param settId - the series ID
         * @returns recommended series
         */
        async suggestedSetts (userId: number, settId: number) {
            return (await api<Paginated<NM.Sett>>("api", `/users/${userId}/suggested-setts/?sett_id=${settId}`)).results;
        },
        /**
         * Get series favorited by a user
         * @param id - the User ID
         * @returns array of favorited series
         */
        async favoriteSetts (id: number) {
            const data = await api<NM.Unmerged.Container<NM.Unmerged.FavoriteSetts>>("api", `/users/${id}/favorites/setts/`);
            return merge(data).results;
        }
        // get: `/api/users/${id}`
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

/**
 * When a trade gets completed, updated the cached trade object if available
 */
API.trade.onTradeRemoved((tradeEvent) => {
    const trade = cache.trades.find(tradeEvent.object.id);
    if (!trade) return;
    trade.completed = tradeEvent.object.completed;
    trade.completed_on = tradeEvent.object.completed;
    trade.state = tradeEvent.verb_phrase;
    trade.bidder_offer.prints.forEach((print) => {
        if (print.own_counts) {
            print.own_counts.bidder -= 1;
            print.own_counts.responder += 1;
        }
    });
    trade.responder_offer.prints.forEach((print) => {
        if (print.own_counts) {
            print.own_counts.bidder += 1;
            print.own_counts.responder -= 1;
        }
    });
    cache.trades.save();
});

export default API;
export type { Paginator };
