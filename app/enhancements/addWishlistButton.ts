import type Services from "../utils/NMServices";
import type NM from "../utils/NMTypes";

import addPatches from "../utils/patchAngular";
import NMApi from "../utils/NMApi";

type ParentScope = {
    profileLinks: Services.ArtConfig["profileLinks"],
    selectedSortName: string,
    expanded: boolean,
    targetUser: NM.User | null,
    artWidth: number,
    pieces: NM.Card[],
    columns: NM.Card[][],
    viewState: string,
    isOwner: boolean,
    isAuthenticated: boolean,
    canTrade: boolean,
    settVersion: number,
    filters: {
        ownership: string | null,
        duplicate: null | {
            id: "duplicate",
            label: string,
            count: number,
            group: "Miscellaneous"
        },
        rarity: string[],
        view?: string,
    },
    filterOptions: {
        id: string,
        name: string,
        count: number,
        ownedCount: number,
        label: string,
        group: "Core Rarity",
        selected: false
    }[],
    ownershipFilters: {
        owned: {
                id: "owned",
                count: number,
                label: string
        },
        unowned: {
                id: "unowned",
                count: number,
                label: string
        },
        all: {
                id: "all",
                count: number,
                label: string
        }
    },
    duplicateFilter: {
        id: "duplicate",
        label: string,
        count: number,
        group: "Miscellaneous"
    },
    favoriteFilter: {
        id: "favorite",
        label: string,
        count: number,
        group: "Miscellaneous",
        selected: boolean,
}
    sortOptions: {
        name: string,
        id: string,
        desc: false,
        clickCount: number,
    }[],
    applyFilters: () => void,
    getNextPage: () => void,
    selectedSortObj?: {
        name: string,
        id: string,
        desc: false,
        clickCount: number,
    },
    toggleOwnershipFilter: () => void,
    toggleFavoriteFilter: () => void,
    settSlug: string,
    notCollectedYet: boolean,
}
type Scope = angular.IScope & ParentScope & {
    toggleWishlists: (ev: MouseEvent) => void,
}

/**
 * Adds a controller to wishlist or unwishlist all unowned cards according to rarity filters
 */
addPatches(() => {
    angular.module("nm.trades").controller("wishlistCardsButton", ["$scope", ($scope: Scope) => {
        $scope.toggleWishlists = (ev: MouseEvent) => {
            // as we don't have access to the list of all cards
            // we'll make CollectionController to show cards we need and save them all

            // save current filters
            const { ownership, duplicate } = $scope.filters;
            const favorite  = $scope.favoriteFilter?.selected;
            const wishlistMode = !favorite;

            // set temporal filters
            $scope.favoriteFilter.selected = false;
            $scope.filters.ownership = "unowned";
            $scope.filters.duplicate = null;
            $scope.applyFilters();

            // get the cards
            let cards = [];
            let count;
            do {
                count = cards.length;
                $scope.getNextPage();
                cards = $scope.columns.flat();
            } while (cards.length > count);
            cards = cards.filter((card) => card.favorite !== wishlistMode);

            // restore the filters now to avoid small lagging that is visible due to animation
            $scope.favoriteFilter.selected = favorite;
            $scope.filters.ownership = ownership;
            $scope.filters.duplicate = duplicate;
            $scope.applyFilters();

            // if nothing to wishlist
            if (cards.length === 0) return;

            // create object that will link card and its star on the screen
            const stars = cards.map((card) => {
                const x0 = ev.clientX / window.innerWidth * 100;
                const y0 = ev.clientY / window.innerHeight * 100;
                const x = 5 + Math.random() * 90;
                const y = 5 + Math.random() * 90;
                const d = Math.hypot(x0 - x, y0 - y);
                const elem = document.createElement("i");
                elem.className = wishlistMode ? "icon-like" : "icon-liked";
                elem.style.setProperty("--endX",  `${x}%`);
                elem.style.setProperty("--endY", `${y}%`);
                elem.style.setProperty("--time", `${0.5 + Math.random() * cards.length * 0.07}s`);
                return { card, elem, d };
            });
            // wishlist from farthest to closest to the button
            stars.sort((a, b) => b.d - a.d);
            // unwishlist from closest to farthest from the button
            if (!wishlistMode) stars.reverse();

            // create container with stars that display the wishlist status of the cards
            const div = document.createElement("div");
            div.id = "wishlist--animate";
            div.style.setProperty("--startX", `${ev.clientX / window.innerWidth * 100}%`);
            div.style.setProperty("--startY", `${ev.clientY / window.innerHeight * 100}%`);
            div.append(...stars.map(({ elem }) => elem));
            document.body.prepend(div);

            // toggle favorites in five threads
            Promise.allSettled(Array(5).fill(0).map(async function toggle(): Promise<any> {
                const star = stars.shift();
                if (!star) return;
                star.card.favorite = await NMApi.card.toggleFavorite(star.card.id);
                star.elem.className = wishlistMode ? "icon-liked" : "icon-like";
                // recursively toggle the next card
                return toggle();
            })).finally(() => {
                // to show the wishlisting of the last star
                setTimeout(() => {
                    $scope.applyFilters();
                    div.remove();
                }, 500);
            });

        };
    }]);
}, {
    // add button to wishlist/unwishlist cards in collection
    names: ["partials/collection/collection-prints.partial.html"],
    patches: [{
        target: `<div class="collection--sett-actions">`,
        append: `
            <span
                class="btn wishlist-btn tip"
                title="Wishlist/unwishlist unowned cards according to the chosen rarities"
                ng-if="isOwner"
                ng-controller="wishlistCardsButton"
                ng-click="toggleWishlists($event)"
            >
                {{ favoriteFilter.selected ? "Unwishlist cards" : "Wishlist cards" }}
            </span>`,
    }],
});
