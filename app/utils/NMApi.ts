import type NM from "./NMTypes";
import type { absoluteURL, fullURL } from "./NMTypes";
import type { Readable } from "svelte/store";

import { error, getCookie } from "./utils";
import Collection from "./Collection";
import { liveListProvider } from "./NMLiveApi";
import config from "../services/config";
import { getInitValue } from "../services/init";
import { writable } from "svelte/store";

const MAIN_SERVER = location.origin;
const NAPI_SERVER = config["node-api-endpoint"];

type Server = "api" | "napi";
type Endpoint<S extends (Server | "url")> = S extends "url" ? (fullURL | URL) : absoluteURL;
type GetParam = string|number|boolean;

/**
 * Constructs a full URL string
 * @param type - the server
 * @param url - an absolute or full URL
 * @param params - optional get-params
 * @returns a full URL
 */
function makeUrl<S extends (Server | "url")> (type: S, url: Endpoint<S>, params: Record<string, GetParam> = {}) {
    let fullUrl: URL;
    switch (type) {
        case "api": fullUrl = new URL(`${MAIN_SERVER}/api${url}`); break;
        case "napi": fullUrl = new URL(`${NAPI_SERVER}${url}`); break;
        default: fullUrl = new URL(url);
    }
    for (const key in params) {
        fullUrl.searchParams.append(key, String(params[key]));
    }
    return fullUrl.toString() as fullURL;
}

/**
 * API call to the endpoint
 * @param url - full URL to API
 * @param body - body (params) of the request
 * @return parsed JSON response
 */
async function request<T> (url: fullURL | URL, body: RequestInit): Promise<T> {
    let resp = await fetch(url, body);
    if (resp.status === 401) {
        // await when user sign in and re-try the request
        const auth = await getInitValue<Function>("auth");
        await auth();
        resp = await fetch(url, body);
    }
    if (resp.ok) {
        return resp.status === 204 ? null : resp.json();
    }
    const data = await resp.json();
    error(url.toString(), resp.status, data);
    if (data.detail) {
        throw new Error(data.detail);
    }
    let detail: string;
    switch (resp.status) {
        case 400: detail = "Oops! Could not save!"; break;
        case 403: detail = "Sorry, you're not authorized. Make sure you are logged in to the right account!"; break;
        case 404: detail = "We couldn't find what you're looking for. Please refresh the page or contact support@neonmob.com"; break;
        case 503: detail = "Our servers are a little tuckered out. Please try again!"; break;
        default: detail = "Oops! Something bad happened! Please refresh the page or contact support@neonmob.com"; break;
    }
    throw new Error(detail);
}

/**
 * Does a GET request
 * @param type - the target server
 * @param url - a URL to the endpoint (without starting `/api`)
 * @param params - optional params
 */
function get<T> (type: Server, url: absoluteURL, params: Record<string, GetParam> = {}): Promise<T> {
    return request(makeUrl(type, url, params), { method: "GET" });
}

/**
 * Does a POST request with CSRF token
 * @param type - the target server
 * @param url - a URL to the endpoint
 * @param body - optional params of the request
 * @return parsed JSON response
 */
function post<T> (type: Server, url: absoluteURL, body?: BodyInit | object): Promise<T> {
    const headers: HeadersInit = {
        "X-CSRFToken": (getCookie("csrftoken") || ""),
    };
    // if it is a plain object
    if (body && Object.getPrototypeOf(body) === Object.prototype) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
    }
    return request(makeUrl(type, url), {
        method: "POST",
        body: body as BodyInit,
        headers,
    });
}

/**
 * Does a DELETE request with CSRF token
 * @param type - the target server
 * @param url - a URL to the endpoint
 * @return parsed JSON response
 */
function del<T> (type: Server, url: absoluteURL): Promise<T> {
    return request(makeUrl(type, url), {
        method: "DELETE",
        headers: {
            "X-CSRFToken": (getCookie("csrftoken") || ""),
        },
    });
}

type OmitFirst<T extends any[]> = T extends [a: any, ...b: infer I] ? I : [];
type BoundRequest<F extends (...args:any)=>any> = <R>(...args: OmitFirst<Parameters<F>>) => Promise<R>;
// requests to the API server
const api = {
    get: get.bind(null, "api") as BoundRequest<typeof get>,
    post: post.bind(null, "api") as BoundRequest<typeof post>,
    delete: del.bind(null, "api") as BoundRequest<typeof del>,
};
// requests to the NAPI server
const napi = {
    get: get.bind(null, "napi") as BoundRequest<typeof get>,
    post: post.bind(null, "napi") as BoundRequest<typeof post>,
    delete: del.bind(null, "napi") as BoundRequest<typeof del>,
};

const cache: {
    trades: Collection<NM.Trade>,
} = {
    trades: new Collection<NM.Trade>("cache:trades", 100),
}

/**
 * Merge objects into one which are returned by some endpoints
 * @param data - objects container to merge
 * @returns merged data
 */
function merge<Data extends object> (data: NM.Unmerged.Container<Data>): Data {
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
        for (const key of Object.keys(obj)) {
            full[key] = mergeObj(obj[key]);
        }
        return full;
    }
    return mergeObj(data.payload);
}

type Paginated<T> = {
    count: number,
    next: fullURL | null,
    previous: fullURL | null,
    results: T[],
}

/**
 * A class to deal with paginated data
 */
class Paginator<T> {
    #list: T[] = [];
    #store = writable<T[]>([]);
    #next: fullURL | null = null;
    // #prev: fullURL | null = null;
    #count = 0;
    #lock: Promise<any> | null = null;

    constructor (url: fullURL) {
        this.#next = url;
        this.#getNext();
    }

    /**
     * Load and return next page of items
     */
    async #getNext () {
        if (!this.#next || this.#lock) return [];
        const promise = request<Paginated<T>>(this.#next, { method: "GET" });
        this.#lock = promise;
        const data = await promise;
        this.#list = this.#list.concat(data.results);
        this.#count = data.count;
        // this.#prev = data.previous;
        this.#next = data.next;
        this.#lock = null;
        this.#store.set(this.#list);
        return data.results;
    }

    /**
     * Whether more items can be loaded
     */
    get hasMore () {
        return this.#next !== null;
    }

    get isLoading () {
        return this.#lock !== null;
    }

    get list () {
        return this.#list;
    }

    /**
     * The claimed total number of items
     */
    get size () {
        return this.#count;
    }

    /**
     * Currently loaded items
     */
    get store (): Readable<T[]> {
        return { subscribe: this.#store.subscribe };
    }

    /**
     * Load and return all the items
     */
    async loadAll () {
        await this.#lock;
        while (this.#next) await this.#getNext();
        return this.#list;
    }

    /**
     * Load and return a bit more items
     */
    async loadMore () {
        await this.#lock;
        return await this.#getNext();
    }

    /**
     * Just waits for finishing of the current loading
     */
    async waitLoading () {
        await this.#lock;
    }
}

const API = {
    card: {
        /**
         * Get all cards of a series
         * @param userId - the cards owner
         * @param settId - the series
         * @returns short card data
         */
        ofSett (userId: number, settId: number) {
            return napi.get<NM.Card[]>(`/user/${userId}/sett/${settId}`);
        },
        /**
         * Toggle the card favoritism
         * @param id - the card id
         * @returns the new state of the card favoritism
         */
        async toggleFavorite (id: number) {
            const data = await api.post<NM.Unmerged.Container<{ favorited: boolean }>>(
                `/pieces/${id}/favorite/`,
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
        async get (id: number, allowCache = true) {
            if (allowCache) {
                const trade = cache.trades.find(id);
                if (trade) return structuredClone(trade);
            }
            const trade = await api.get<NM.Trade>(`/trades/${id}/`);
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
            return api.post<NM.TradeResult>("/trades/propose/", {
                bidder: you,
                bidder_offer: { prints: yourOffer },
                responder: partner,
                responder_offer: { prints: partnerOffer },
                parent_id: parentTrade ?? null,
            });
        },
        accept (id: number) {
            return api.post<NM.Trade>(`/trades/${id}/accept/`);
        },
        decline (id: number) {
            return api.post<NM.Trade>(`/trades/${id}/decline/`);
        },
        /**
         * Get info about a certain card
         * @param ownerId - the card owner ID
         * @param cardId  - the card ID
         * @returns
         */
        async findPrint (ownerId: number, cardId: number) {
            const data = await api.get<Paginated<NM.PrintInTrade>>("/search/prints/", {
                user_id: ownerId,
                piece_id: cardId,
            });
            return data.results[0];
        },
        /**
         * Search for prints
         * @param ownerId - the print owner
         * @param options - the filters
         * @returns paginated results
         */
        findPrints (ownerId: number, options: {
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
            const query: Record<string, GetParam> = {};
            query.user_id = ownerId;
            let key: keyof typeof options;
            for (key in options) {
                const val = options[key];
                if (val === null) continue;
                switch (key) {
                    case "cardId": query.piece_id = val; break;
                    case "cardName": query.search = val; break;
                    case "sharedWith": query.incomplete_by = val; break;
                    case "notOwnedBy": query.not_owned_by = val; break;
                    case "wishlistedBy": query.wish_list_by = val; break;
                    case "duplicatesOnly": query.duplicates_only = val; break;
                    case "settId": query.sett = val; break;
                    default: query[key] = options[key]; break;
                }
            }

            return new Paginator<NM.PrintInTrade>(makeUrl("api", "/search/prints/", query));
        },
        // completedTradeInfo: napi /activityfeed/story/trade/[TRADE_ID]
    },
    sett: {
        /**
         * Get the series info
         * @param id - series ID
         */
        get (id: number) {
            return api.get<NM.Sett>(`/setts/${id}/`)
        },
        /**
         * Get the series' pack tiers
         * @param id - series ID
         */
        packTiers (id: number) {
            return api.get<NM.PackTier[]>(`/pack-tiers/?sett_id=${id}`)
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
        activityFeed (id: number, amount = 5, page = 1) {
            return napi.get<NM.Activity<{}>[]>(`/activityfeed/user/${id}/`, { amount, page });
        },
        /**
         * Get short info about number of collected cards in each series
         * @param id - the user ID
         * @returns - info about collected cards in each user's collection
         */
        ownedSettsMetrics (id: number) {
            return napi.get<NM.SettMetrics[]>(`/user/${id}/owned-setts-metrics`);
        },
        /**
         * Get the prints the user owns
         * @param userId - the card owner
         * @param cardId - the card ID
         * @returns short info about the card and the collected prints
         */
        async ownedPrints (userId: number, cardId: number) {
            const data = await api.get<NM.Unmerged.Container<NM.Unmerged.Prints>>(
                `/users/${userId}/piece/${cardId}/detail/`,
            );
            return merge(data);

        },
        /**
         * Get the number of copies of each card the user owns
         * @param id - the owner ID
         * @returns array of cardID - number of copies
         */
        printCounts (id: number) {
            return napi.get<NM.PrintCount[]>(`/user/${id}/print-counts`);
        },
        /**
         * Get recommended series based on the series
         * @param userId - the user ID
         * @param settId - the series ID
         * @returns recommended series
         */
        async suggestedSetts (userId: number, settId: number) {
            return (await api.get<Paginated<NM.Sett>>(`/users/${userId}/suggested-setts/`, {
                sett_id: settId,
            })).results;
        },
        /**
         * Get series favorited by a user
         * @param id - the user ID
         * @returns array of favorited series
         */
        async favoriteSetts (id: number) {
            const data = await api.get<NM.Unmerged.Container<NM.Unmerged.FavoriteSetts>>(
                `/users/${id}/favorites/setts/`,
            );
            return merge(data).results;
        },
        /**
         * Get the current user's friends
         * @returns paginated array of friends
         */
        getFriends () {
            return new Paginator<NM.UserFriend>(makeUrl("api", "/friend/"));
        },
        /**
         * Check whether the user is in the current user's friend list
         * @param userId - the user ID to check
         * @returns is the user in the friend list
         */
        async isFriend (userId: number) {
            return (await api.get<{is_friend:boolean}>(`/friend/${userId}/`)).is_friend;
        },
        /**
         * Add the user to the friend list
         * @param userId - user to add
         */
        addFriend (userId: number) {
            return api.post<NM.UserFriend>("/friend/", { id: userId });
        },
        /**
         * Remove the user from the friend list
         * @param userId - user to remove
         */
        removeFriend (userId: number) {
            return api.delete<void>(`/friend/${userId}/`);
        },
        /**
         * Get users blocked by the current user
         * @returns array of blocked users
         */
        getBlockedUsers () {
            return api.get<NM.UserFriend[]>("/block_user/");
        },
        /**
         * Check whether the user is blocked by the current user
         * or the user has blocked the current user
         * @param userId - the user ID to check
         * @returns whether blocked and who has blocked
         */
        isBlockedUser (userId: number) {
            return api.get<{
                is_blocked: boolean,
                user_initiated: boolean,
            }>(`/block_user/${userId}/`);
        },
        /**
         * Add the user to the blocked list
         * @param userId - user to add
         */
        blockUser (userId: number) {
            return api.post<NM.UserFriend>("/block_user/", { id: userId });
        },
        /**
         * Remove the user from the blocked list
         * @param userId - user to remove
         */
        unblockUser (userId: number) {
            return api.delete<void>(`/block_user/${userId}/`);
        },
        /**
         * Search for people over all the site
         * @param query - the search query
         * @returns paginated array of matched results
         */
        async searchPeople (query: string) {
            const data = await api.post<Paginated<NM.UserFriend>>("/friend/search/", { search: query });
            return data.results;
        },
        /**
         * Marks the notifications as read
         * @param ids - notifications' IDs
         * @param type - notifications type
         */
        markNotificationsRead (ids: string[], type: string) {
            return api.post<NM.Unmerged.Container<{}>>("/notifications/", {
                ids, notification_type: type,
            });
        },
        /**
         * Get info about conversation with a user
         * @param userId - the user to conversate
         */
        getConversationInfo (userId: number) {
            return api.post<NM.ConversationInfo>("/conversations/", { recipient: userId });
        },

        // get: `/api/users/${id}`
        // displayCase: `/user/${id}/display-case`
        // secondsUntilFreebieReady: `/seconds-until-freebie-ready`
        // numFreebieLeft: POST '/num-freebie-left`
        // isFriend: `/api/friend/${id}`
        // isUserBlocked: /api/block_user/${id}`
        // collection: /api/users/[USER_ID]/collections/[SET_ID]
    },
}

/**
 * When a trade gets completed, updated the cached trade object if available
 */
liveListProvider("trades")
    .on("remove", (tradeEvent) => {
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
