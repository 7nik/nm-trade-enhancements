import type { Readable, Writable } from "svelte/store";

import { derived } from "svelte/store";
import NMApi from "../utils/NMApi";
import currentUser from "./currentUser";
import { debug, LazyMap } from "../utils/utils";
import { writable } from "svelte/store";

const map = new LazyMap<number, Writable<Record<number,number>>>(300_000);

/**
 * Fetches the number of copies the user owns
 * @param userId - the cards owner ID
 * @returns a store with cards owned by the user
 */
function getPrintCounts (userId: number) {
    if (map.has(userId)) return map.get(userId)!;
    let loaded = false;
    const store = writable({}, (set) => {
        if (!loaded) {
            NMApi.user.printCounts(userId).then((printCounts) => {
                loaded = true;
                set(Object.fromEntries(printCounts));
            });
        }
        return () => {
            // do not delete the current user
            if (userId !== currentUser.id) {
                map.delete(userId);
                debug(userId, "' owned cards removing")
    }
    }
    });
    map.set(userId, store);
    return store;
    }

class OwnedCards {
    #cardCounts: Record<number, number> = {};
    #store;
    #unsubscribe;
    #loading;

    constructor (userId: number) {
        this.#store = getPrintCounts(userId);
        this.#loading = derived(
            this.#store, 
            (cardCounts) => Object.keys(cardCounts).length === 0,
        );
        this.#unsubscribe = this.#store.subscribe((cardCounts) => {
            this.#cardCounts = cardCounts;
        });
}
/**
     * Update the #store
 */
    #update() {
        this.#store.set(this.#cardCounts);
}

    /**
     * Whether the data is still loading
     */
    get loading() {
        return this.#loading;
    }

    /**
     * Add one copy to the list of owned prints
     * @param cardIds - the card ID
     */
    addPrints (cardIds: number[]) {
        cardIds.forEach((cardId) => {
            if (cardId in this.#cardCounts) {
                this.#cardCounts[cardId] += 1;
            } else {
                this.#cardCounts[cardId] = 1;
            }
        });
        this.#update();
    }
    /**
     * Get the number of copies of a card the user owns
     * @param cardId - the card ID
     * @param asStore - return result as a store, default - no
     */
    getPrintCount (cardId: number): number;
    getPrintCount (cardId: number, asStore: true): Readable<number>;
    getPrintCount (cardId: number, asStore = false) {
        return asStore
            ? derived(this.#store, (cardCounts) => cardCounts[cardId] ?? 0)
            : this.#cardCounts[cardId] ?? 0;
    }
    /**
     * Whether the user owns any copy of the card
     * @param cardId - the card ID
     * @param asStore - return result as a store, default - no
     */
    hasPrint (cardId: number): boolean;
    hasPrint (cardId: number, asStore: true): Readable<boolean>;
    hasPrint (cardId: number, asStore = false) {
        return asStore
            ? derived(this.#store, (cardCounts) => cardCounts[cardId] > 0)
            : this.#cardCounts[cardId] > 0;
    }
    /**
     * Remove the given number copies from the list of owned prints
     * @param cards - array of the card ID and number of copies to remove
     */
    removeMultiplePrints (cards: [number, number][]) {
        cards.forEach(([cardId, count]) => {
            if (this.#cardCounts[cardId] > 0) {
                this.#cardCounts[cardId] = Math.max(0, this.#cardCounts[cardId] - count);
            }
        });
        this.#update();
    }
    /**
     * Remove one copy from the list of owned prints
     * @param cardIds - the card ID
     */
    removePrints (cardIds: number[]) {
        cardIds.forEach((cardId) => {
            if (this.#cardCounts[cardId] > 0) {
                this.#cardCounts[cardId] -= 1;
            }
        });
        this.#update();
    }
    /**
     * Stop to listen for changes of owned cards
     */
    stop() {
        this.#unsubscribe();
    }
}

export default OwnedCards;

if (currentUser.isAuthenticated) getPrintCounts(currentUser.id);
// update owned cards new a trade get accepted
NMApi.trade.onTradeRemoved(async (tradeEvent) => {
    if (tradeEvent.verb_phrase !== "accepted") return;
    debugger;
    const trade = await NMApi.trade.get(tradeEvent.object.id);
    let givenPrints = trade.bidder.id === currentUser.id ? trade.bidder_offer.prints : trade.responder_offer.prints;
    let receivedPrints = trade.bidder.id === currentUser.id ? trade.responder_offer.prints : trade.bidder_offer.prints;
    let ownedCards = new OwnedCards(data[currentUser.id]);
    ownedCards.removePrints(givenPrints.map(p => p.id));
    ownedCards.addPrints(receivedPrints.map(p => p.id));

    const partnerId = trade.bidder.id === currentUser.id ? trade.responder.id : trade.bidder.id;
    if (!(partnerId in data)) return;
    givenPrints = trade.bidder.id === partnerId ? trade.bidder_offer.prints : trade.responder_offer.prints;
    receivedPrints = trade.bidder.id === partnerId ? trade.responder_offer.prints : trade.bidder_offer.prints;
    ownedCards = new OwnedCards(data[partnerId]);
    ownedCards.removePrints(givenPrints.map(p => p.id));
    ownedCards.addPrints(receivedPrints.map(p => p.id));
});
