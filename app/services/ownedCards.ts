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


// replace entire `artPieceService` with custom one to keep all the data synced
addPatches(() => {
    angular.module("Art").factory("artPieceService", [
        "artSubscriptionService",
        "artUser",
        "ImageService",
        (artSubscriptionService: Services.ArtSubscriptionService, artUser: Services.ArtUser, ImageService: Services.ImageService) => {
            function getUserId(user?: NM.User | Services.ArtUser) {
                if (!user) return currentUser.id;
                if ("id" in user) return user.id;
                return user.getId();
            }
            function getCounts(user?: NM.User | Services.ArtUser) {
                const id = getUserId(user);
                if (id in data) return data[id];
                return data[id] = {};
            }
            function getPrintId(printOrId: NM.Print | number) {
                return typeof printOrId === "number" ? printOrId : printOrId.id;
            }

            let aps: Services.ArtPieceService = {
                NO_USER_ERROR: "NO_USER_ERROR",
                SERVER_ERROR: "SERVER_ERROR",
                /**
                 * Load numbers of copies the user owns
                 * @param user - the owner
                 * @returns promise about loading the data
                 */
                syncOwnership(user) {
                    return loadOwnership(getUserId(user)).then(() => {
                        artSubscriptionService.broadcast("user-piece-ownership-refreshed");
                    });
                },
                /**
                 * Add a print to owned ones
                 * @param user - the owner
                 * @param printOrId - a card or its ID
                 */
                addPrintOwnership(user, printOrId) {
                    const counts = getCounts(user);
                    const printId = getPrintId(printOrId);
                    if (!(printId in counts)) {
                        counts[printId] = 1;
                    } else {
                        counts[printId] += 1;
                    }
                },
                /**
                 * Add prints to owned ones
                 * @param user - the owner
                 * @param printsOrIds - a cards or IDs
                 */
                addPrintOwnerships(user, printsOrIds) {
                    printsOrIds.forEach((p) => aps.addPrintOwnership(user, p));
                },
                /**
                 * Not used? Filters out unowned cards
                 * @param _user - the owned
                 * @param _collection - the cards
                 * @returns return `collection` without unowned cards
                 */
                filterPieces(_user, _collection) {
                    error("Unimplemented method");
                    return [];
                },
                /**
                 * Get the image data
                 * @param _user - the owner
                 * @param print - the card
                 * @param size - the requested size of the image
                 * @param _isPublic - force colored version
                 */
                getImageData(_user, print, size, _isPublic) {
                    return print.piece_assets.image[size];
                },
                /**
                 * Get ratio of card's image
                 * @param user - the owner, why?
                 * @param print - the print
                 * @param size - the requested size
                 */
                getImageRatio(user, print, size) {
                    const { width, height } = aps.getImageData(user, print, size);
                    return width / height;
                },
                /**
                 * Get urls of the images
                 * @param user - the owner
                 * @param prints - the cards
                 * @param size - the requested size
                 * @param isPublic - force the colored version
                 * @returns array of urls
                 */
                getImageUrls(user, prints, size, isPublic) {
                    return prints.map(p => aps.getImageData(user, p, size, isPublic).url);
                },
                /**
                 * Number of cards the user owns among the given list
                 * @param user - the owner
                 * @param printsOrIds - the list of cards or IDs
                 */
                getPieceCount(user, printsOrIds: (NM.Print|number)[]) {
                    return printsOrIds.filter((p) => aps.hasPiece(user, p)).length;
                },
                /**
                 * Get the number of copies the user owns
                 * @param user - the owner
                 * @param printsOrIds - the card or its ID
                 */
                getPrintCount(user, printOrId) {
                    return getCounts(user)[getPrintId(printOrId)] ?? 0;
                },
                /**
                 * Get url of promo image of a card
                 * @param print - the card
                 */
                getPromoImageUrl(print) {
                    return (print.piece_assets.image["large-promo"] ?? print.piece_assets.image.large).url;
                },
                /**
                 * Whether the user owns the card
                 * @param user - the owner
                 * @param printOrId - the card of its ID
                 */
                hasPiece(user, printOrId) {
                    return aps.getPrintCount(user, printOrId) > 0;
                },
                /**
                 * Whether it is a new card for the user
                 * @param printOrId - the card or its ID
                 * @returns whether the user owns only one copy
                 */
                isNewForYou(printOrId) {
                    return aps.getPrintCount(artUser, printOrId) === 1;
                },
                /**
                 * Preloads images of the given cards
                 * @param user - the owner
                 * @param prints - the cards
                 * @param size - the requested size
                 * @param isPublic - force colored version
                 * @returns promise of all the images
                 */
                preloadImages(user, prints, size, isPublic) {
                    return ImageService.preloadAll(aps.getImageUrls(user, prints, size, isPublic));
                },
                /**
                 * Preload images of the given cards
                 * @param user - the owner
                 * @param prints - the cards
                 * @param size - the requested size
                 * @param isPublic - force colored version
                 * @returns promise of preloading the first image
                 */
                preloadImagesSeries(user, prints, size, isPublic) {
                    const urls = aps.getImageUrls(user, prints, size, isPublic);
                    if (urls.length === 0) return Promise.resolve();
                    const promise = ImageService.preload(urls.shift()!);
                    promise.finally(function fn() {
                        const url = urls.shift();
                        if (!url) return;
                        ImageService.preload(url).finally(fn);
                    });
                    return promise;
                },
                /**
                 * Remove copies from owned ones
                 * @param user - the ex owner
                 * @param printOrId - the card or its ID
                 * @param count - number of copies to remove
                 */
                removePrintOwnership(user, printOrId, count = 1) {
                    const counts = getCounts(user);
                    const printId = getPrintId(printOrId);
                    if (printId in counts) {
                        counts[printId] = Math.max(0, counts[printId] - count);
                    }
                },
                /**
                 * Remove one copy of each given card
                 * @param user - the ex owner
                 * @param printsOrIds - the cards of IDs
                 */
                removePrintOwnerships(user, printsOrIds) {
                    printsOrIds.forEach((p) => aps.removePrintOwnership(user, p));
                },
                /**
                 * Remove given number of copies of the card
                 * @param user - the ex owner
                 * @param print - the card and the number to remove
                 */
                removePrintOwnershipDiscard(user, print) {
                    aps.removePrintOwnership(user, print, print.count);
                },
                /**
                 * Removes copies from the cards
                 * @param user - the ex owner
                 * @param prints - the cards and number of copies to remove
                 */
                removePrintOwnershipsDiscard(user, prints) {
                    prints.forEach((p) => aps.removePrintOwnership(user, p, p.count));
                },
                /**
                 * Try to toggle favoritism of the card
                 * @param card - the card
                 */
                toggleFavorite(card) {
                    card.favorite = !card.favorite;
                    NMApi.card.toggleFavorite(card.id).catch(() => {
                        card.favorite = !card.favorite;
                        alert(
                            "Sorry, we could not " + (card.favorite ? "unfavorite" : "favorite") +
                            " the card as there was an error. Please contact a dev."
                        );
                    });
                },
            }
            return aps;
        }
    ]);
});
