import type NM from "../utils/NMTypes";

import NMApi from "../utils/NMApi";
import addPatches from "../utils/patchAngular";
import type Services from "../utils/NMServices";
import currentUser from "./currentUser";
import { alert } from "../components/dialogs/modals";
import { error } from "../utils/utils";

const data: Record<number, Record<number,number>> = {};
const loading: Record<number, Promise<NM.PrintCount[]>> = {};
const removing: Record<number, NodeJS.Timeout> = {};

/**
 * Fetches the number of copies the user owns
 * @param userId - the cards owner ID
 * @returns promise when the data get loaded
 */
async function loadOwnership (userId: number) {
    if (userId in data) {
        // cancel removing
        if (userId in removing) {
            clearTimeout(removing[userId]);
            delete removing[userId];
        }
        return;
    }
    if (userId in loading) {
        await loading[userId];
        return;
    }
    if (userId < 0) {
        data[userId] = {};
        return;
    }
    loading[userId] = NMApi.user.printCounts(userId);
    try {
        data[userId] = Object.fromEntries(await loading[userId]);
    } finally {
        delete loading[userId];
    }
}
/**
 * Frees the user's info
 * @param userId - the user ID
 */
async function removeOwnership (userId: number) {
    if (userId in loading) await loading[userId];
    if (userId in removing) {
        clearTimeout(removing[userId]);
    }
    // schedule removing in 5 min
    removing[userId] = setTimeout(() => {
        delete data[userId];
        delete removing[userId];
    }, 300_000);
}

class OwnedCards {
    private cardCounts;
    constructor (cardCounts: Record<number, number>) {
        this.cardCounts = cardCounts;
    }
    /**
     * Get the number of copies of a card the user owns
     * @param cardId - the card ID
     */
    getPrintCount (cardId: number) {
        return this.cardCounts[cardId] ?? 0;
    }
    /**
     * Add one copy to the list of owned prints
     * @param cardIds - the card ID
     */
    addPrints (cardIds: number[]) {
        cardIds.forEach((cardId) => {
            if (cardId in this.cardCounts) {
                this.cardCounts[cardId] += 1;
            } else {
                this.cardCounts[cardId] = 1;
            }
        });
    }
    /**
     * Remove one copy from the list of owned prints
     * @param cardIds - the card ID
     */
    removePrints (cardIds: number[]) {
        cardIds.forEach((cardId) => {
            if (this.cardCounts[cardId] > 0) {
                this.cardCounts[cardId] -= 1;
            }
        });
    }
    /**
     * Whether the user owns any copy of the card
     * @param cardId - the card ID
     */
    hasPrint (cardId: number) {
        return this.cardCounts[cardId] > 0;
    }
}
/**
 * Get object about number of copies of each card the used owns
 * @param userId - the user ID
 * @returns the object itself and method to free up the data from cache
 */
export default async function (userId: number) {
    if (!(userId in data)) await loadOwnership(userId);
    return {
        userCards: new OwnedCards(data[userId]),
        freeData: removeOwnership.bind(null, userId),
    };
};
export type { OwnedCards }

currentUser.ready.then(() => {
    loadOwnership(currentUser.id);
});

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
