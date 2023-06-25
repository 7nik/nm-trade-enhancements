import { get, writable } from "svelte/store";
import OwnedCards from "../../services/ownedCards";
import OwnedCollections from "../../services/ownedCollections";
import NMApi, { Paginator } from "../../utils/NMApi";
import { liveListProvider } from "../../utils/NMLiveApi";
import NM, { rarityCss } from "../../utils/NMTypes";

type SearchParams = Parameters<typeof NMApi["trade"]["findPrints"]>[1] & {
    favoritedBy: number | null,
    tradingCards: boolean,
};

type PurePaginator<T> = {
    [P in keyof Paginator<T>]: Paginator<T>[P]
}

class PrintPaginator implements PurePaginator<NM.PrintInTrade> {
    #ids: number[] = [];
    #lock: Promise<any> | null = null;
    #list: NM.PrintInTrade[] = [];
    #store = writable<NM.PrintInTrade[]>([]);
    #start = 0;
    #count = 0;
    #ownerId: number;
    #filters: SearchParams;

    constructor (ownerId: number, filters: SearchParams, promise: Promise<number[]>) {
        this.#ownerId = ownerId;
        this.#filters = filters;
        this.#lock = promise.then((ids) => {
            this.#ids = ids;
            this.#count = ids.length;
            this.#lock = null;
            return this.#getNext();
        });
    }

    async #getNext (): Promise<NM.PrintInTrade[]> {
        if (!this.hasMore || this.#lock) return [];
        const ids = this.#ids.slice(this.#start, this.#start + 10);
        const promise = Promise.all(
            ids.map((cardId) => NMApi.trade
                .findPrints(this.#ownerId, { ...this.#filters, cardId })
                .loadAll()),
        // the server always returns the asked card but
        // if user doesn't own the card, it doesn't have `print_num` and `print_id`
        ).then((arr) => arr.flat().filter((card) => card.print_num));
        this.#lock = promise;
        try {
            const prints = await promise;
            this.#start += 10;
            // subtract filtered prints
            this.#count -= ids.length - prints.length;
            this.#list = this.#list.concat(prints);
            this.#store.set(this.#list);
            return prints;
        } finally {
            this.#lock = null;
        }
    }

    get hasMore () {
        return this.#list.length < this.#count;
    }

    get isLoading () {
        return this.#lock !== null;
    }

    get list () {
        return this.#list;
    }

    get size () {
        return this.#count;
    }

    get store () {
        return { subscribe: this.#store.subscribe };
    }

    async loadAll () {
        await this.#lock;
        // eslint-disable-next-line no-await-in-loop
        while (this.hasMore) await this.#getNext();
        return this.#list;
    }

    async loadMore () {
        await this.#lock;
        return this.#getNext();
    }

    async waitLoading () {
        await this.#lock;
    }
}

export type { PurePaginator as Paginator };

export default (ownerId: number, filters: SearchParams) => {
    if (filters.favoritedBy) {
        // const tradingCardIds = getAllTradingCardIds();
        // TODO switch to liked cards on profile page
        return new PrintPaginator(ownerId, filters, NMApi.card.favoriteCards(filters.favoritedBy)
            .then(async (cards) => {
                cards = cards.filter((card) => filters.notOwnedBy !== ownerId
                    && filters.wishlistedBy !== filters.favoritedBy
                    && satisfiesRarity(filters, card.rarity.class)
                    && (!filters.settId || filters.settId === card.sett.id)
                    && (!filters.cardName || card.name.toLowerCase().includes(filters.cardName)));
                // && (!filters.tradingCards || tradingCardIds.includes(card.id)))
                let ids = cards.map((card) => card.id);
                if (filters.tradingCards) {
                    const tradingCards = await getTradingCards();
                    const tids = new Set(tradingCards.map((card) => card.id));
                    ids = ids.filter((id) => tids.has(id));
                }
                ids = await filterByOwnedCount(ownerId, filters, ids);
                return ids;
            }));
    }
    if (filters.tradingCards) {
        return new PrintPaginator(ownerId, filters, getTradingCards()
            .then(async (cards) => {
                cards = cards.filter((card) => satisfiesRarity(filters, card.rarity.class)
                    && (!filters.settId || filters.settId === card.sett_id)
                    && (!filters.cardName || card.name.toLowerCase().includes(filters.cardName)));
                cards = await filterByShared(ownerId, filters, cards);
                let ids = cards.map((card) => card.id);
                ids = await filterByOwnedCount(ownerId, filters, ids);
                ids = await filterByWishlist(ownerId, filters, ids);
                return ids;
            }));
    }
    return NMApi.trade.findPrints(ownerId, filters);
};

async function getTradingCards () {
    const tradeIds = get(liveListProvider("trades").store).map(({ object }) => object.id);
    const trades = await Promise.all(tradeIds.map((id) => NMApi.trade.get(id)));
    const prints: NM.PrintInTrade[] = [];
    for (const trade of trades) {
        const allPrints = trade.bidder_offer.prints.concat(trade.responder_offer.prints);
        for (const print of allPrints) {
            if (prints.every((p) => p.id !== print.id)) {
                prints.push(print);
            }
        }
    }

    return prints;
}

function satisfiesRarity (filters: SearchParams, rarity: rarityCss) {
    // if no search by rarity
    if (!filters.common
        && !filters.uncommon
        && !filters.rare
        && !filters.veryRare
        && !filters.extraRare
        && !filters.chase
        && !filters.variant
        && !filters.legendary
    ) {
        return true;
    }
    return filters[rarity];
}

async function filterByOwnedCount (ownerId: number, filters: SearchParams, cardIds: number[]) {
    if (cardIds.length === 0) return cardIds;
    const owned = new OwnedCards(ownerId);
    await owned.waitLoading();
    cardIds = cardIds.filter((id) => owned.getPrintCount(id) > (filters.duplicatesOnly ? 1 : 0));
    if (filters.notOwnedBy) {
        const owned2 = new OwnedCards(filters.notOwnedBy);
        await owned2.waitLoading();
        cardIds = cardIds.filter((id) => owned2.getPrintCount(id) === 0);
    }
    return cardIds;
}

async function filterByWishlist (ownerId: number, filters: SearchParams, cardIds: number[]) {
    if (!filters.wishlistedBy || cardIds.length === 0) return cardIds;
    // this endpoint seems to be more reliable than NMApi.card.wishlistedCards
    const wishlist = NMApi.trade.findPrints(ownerId, filters);
    await wishlist.waitLoading();
    return cardIds.filter((id) => wishlist.list.find((p) => id === p.id));
}

async function filterByShared (ownerId: number, filters: SearchParams, cards: NM.PrintInTrade[]) {
    if (filters.settId || !filters.sharedWith || cards.length === 0) return cards;
    const coll1 = new OwnedCollections(ownerId);
    const coll2 = new OwnedCollections(filters.sharedWith);
    await Promise.all([coll1.waitLoading(), coll2.waitLoading()]);
    const setts = new Set(coll1.getCollections().map(({ id }) => id));
    const shared = new Set<number>();
    for (const { id } of coll2.getCollections()) {
        if (setts.has(id)) shared.add(id);
    }
    return cards.filter(({ sett_id: sid }) => shared.has(sid));
}
