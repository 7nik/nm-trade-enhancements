import type { Readable, Unsubscriber, Writable } from "svelte/store";

import { derived, get, writable } from "svelte/store";
import NMApi from "../utils/NMApi";
import { liveListProvider } from "../utils/NMLiveApi";
import { debug, LazyMap } from "../utils/utils";
import currentUser from "./currentUser";

const map = new LazyMap<number, Writable<Record<number, number>>>(300_000);

/**
 * Fetches the number of copies the user owns
 * @param userId - the cards owner ID
 * @returns a store with cards owned by the user
 */
function getPrintCounts (userId: number) {
    if (map.has(userId)) return map.get(userId)!;
    let loaded = false;
    const store = writable({}, (set) => {
        function load () {
            NMApi.user.printCounts(userId).then((printCounts) => {
                loaded = true;
                set(Object.fromEntries(printCounts));
            }, () => {
                // if no need to try to load the data anymore
                if (!map.has(userId)) return;
                setTimeout(load, 1000);
            });
        }

        if (!loaded) {
            load();
        }
        return () => {
            // do not delete the current user
            if (userId !== currentUser.id) {
                map.delete(userId);
                debug(userId, "' owned cards removing");
            }
        };
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
    #update () {
        this.#store.set(this.#cardCounts);
    }

    /**
     * Whether the data is still loading
     */
    get isLoading () {
        return get(this.#loading);
    }

    /**
     * Method to wait for finishing the loading
     * @returns Promise of completing the data loading
     */
    waitLoading () {
        return new Promise<void>((res) => {
            let unsubscribe: Unsubscriber | null = null;
            unsubscribe = this.#loading.subscribe((loading) => {
                if (loading) return;
                unsubscribe?.();
                res();
            });
        });
    }

    /**
     * Add one copy to the list of owned prints
     * @param cardIds - the card ID
     */
    addPrints (cardIds: number[]) {
        for (const cardId of cardIds) {
            if (cardId in this.#cardCounts) {
                this.#cardCounts[cardId] += 1;
            } else {
                this.#cardCounts[cardId] = 1;
            }
        }
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
        for (const [cardId, count] of cards) {
            if (this.#cardCounts[cardId] > 0) {
                this.#cardCounts[cardId] = Math.max(0, this.#cardCounts[cardId] - count);
            }
        }
        this.#update();
    }

    /**
     * Remove one copy from the list of owned prints
     * @param cardIds - the card ID
     */
    removePrints (cardIds: number[]) {
        for (const cardId of cardIds) {
            if (this.#cardCounts[cardId] > 0) {
                this.#cardCounts[cardId] -= 1;
            }
        }
        this.#update();
    }

    /**
     * Stop to listen for changes of owned cards
     */
    stop () {
        this.#unsubscribe();
    }
}

export default OwnedCards;

if (currentUser.isAuthenticated) getPrintCounts(currentUser.id);
// update owned cards new a trade get accepted
liveListProvider("trades")
    .on("remove", async (tradeEvent) => {
        if (tradeEvent.verb_phrase !== "accepted") return;

        const trade = await NMApi.trade.get(tradeEvent.object.id);
        let givenPrints = trade.bidder.id === currentUser.id
            ? trade.bidder_offer.prints
            : trade.responder_offer.prints;
        let receivedPrints = trade.bidder.id === currentUser.id
            ? trade.responder_offer.prints
            : trade.bidder_offer.prints;
        let ownedCards = new OwnedCards(currentUser.id);
        ownedCards.removePrints(givenPrints.map((p) => p.id));
        ownedCards.addPrints(receivedPrints.map((p) => p.id));

        const partnerId = trade.bidder.id === currentUser.id ? trade.responder.id : trade.bidder.id;
        if (!map.has(partnerId)) return;
        givenPrints = trade.bidder.id === partnerId
            ? trade.bidder_offer.prints
            : trade.responder_offer.prints;
        receivedPrints = trade.bidder.id === partnerId
            ? trade.responder_offer.prints
            : trade.bidder_offer.prints;
        ownedCards = new OwnedCards(partnerId);
        ownedCards.removePrints(givenPrints.map((p) => p.id));
        ownedCards.addPrints(receivedPrints.map((p) => p.id));
    });
