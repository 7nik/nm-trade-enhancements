import type Services from "../utils/NMServices";
import type NM from "../utils/NMTypes";

import OwnedCards from "../services/ownedCards";
import currentUser from "../services/currentUser";
import NMApi from "../utils/NMApi";
import addPatches from "../utils/patchAngular";
import { error } from "../utils/utils";

const map = new Map<number, OwnedCards>();

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
                if (map.has(id)) return map.get(id)!;
                // return {};
            }
            function getPrintId(printOrId: NM.Print | number) {
                return typeof printOrId === "number" ? printOrId : printOrId.id;
            }

            const aps: Services.ArtPieceService = {
                NO_USER_ERROR: "NO_USER_ERROR",
                SERVER_ERROR: "SERVER_ERROR",
                /**
                 * Load numbers of copies the user owns
                 * @param user - the owner
                 * @returns promise about loading the data
                 */
                syncOwnership(user) {
                    const userId = getUserId(user);
                    if (map.has(userId)) return Promise.resolve();

                    map.set(userId, new OwnedCards(userId));
                    return new Promise((resolve) => {
                        const unsubscribe = map.get(userId)!.loading.subscribe((loading) => {
                            if (loading) return;
                            artSubscriptionService.broadcast("user-piece-ownership-refreshed");
                            unsubscribe();
                            resolve();
                        });
                    });
                },
                /**
                 * Add a print to owned ones
                 * @param user - the owner
                 * @param printOrId - a card or its ID
                 */
                addPrintOwnership(user, printOrId) {
                    aps.addPrintOwnerships(user, [printOrId] as NM.Print[]|number[]);
                },
                /**
                 * Add prints to owned ones
                 * @param user - the owner
                 * @param printsOrIds - a cards or IDs
                 */
                addPrintOwnerships(user, printsOrIds) {
                    getCounts(user)?.addPrints(printsOrIds.map(getPrintId))
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
                    return getCounts(user)?.getPrintCount(getPrintId(printOrId)) ?? 0;
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
                 */
                removePrintOwnership(user, printOrId) {
                    aps.removePrintOwnerships(user, [printOrId] as NM.Print[]|number[]);
                },
                /**
                 * Remove one copy of each given card
                 * @param user - the ex owner
                 * @param printsOrIds - the cards of IDs
                 */
                removePrintOwnerships(user, printsOrIds) {
                    getCounts(user)?.removePrints(printsOrIds.map(getPrintId));
                },
                /**
                 * Remove given number of copies of the card
                 * @param user - the ex owner
                 * @param print - the card and the number to remove
                 */
                removePrintOwnershipDiscard(user, print) {
                    aps.removePrintOwnershipsDiscard(user, [print]);
                },
                /**
                 * Removes copies from the cards
                 * @param user - the ex owner
                 * @param prints - the cards and number of copies to remove
                 */
                removePrintOwnershipsDiscard(user, prints) {
                    getCounts(user)?.removeMultiplePrints(prints.map((p) => [p.id, p.count]));
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
