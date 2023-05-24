import type { UserCollections } from "../../../services/ownedCollections";
import type NM from "../../../utils/NMTypes";
import type { Writable } from "svelte/store";

import { writable } from "svelte/store";
import OwnedCards from "../../../services/ownedCards";
import ownedCollections from "../../../services/ownedCollections";
import { isTrading } from "../../../services/tradingCards";
import { getProgress, makeShortTip } from "../collectionProgress";
import filterSetList from "./filterSetList";
import {
    ActiveFilterLabel,
    areRangesEqual,
    DEFAULT_FILTERS,
    Filters,
    FilterSet,
    getFilterLabel,
    getSettType,
    HiddenSett,
    inRange,
    isEqualToFilterSet,
    isRange,
} from "./filterUtils";

function Observable<T extends object> (object: T) {
    const stores: Partial<{
        [K in keyof T]: Writable<T[K]>
    }> = {};
    const publicStores = new Proxy(object, {
        get (target, prop) {
            if (!(prop in stores)) {
                stores[prop as keyof T] = writable(target[prop as keyof T]);
                stores[prop as keyof T]!.subscribe((v) => { target[prop as keyof T] = v; });
            }
            return stores[prop as keyof T];
        },
        set () { return false; },
    }) as { [K in keyof T]: Writable<T[K]> };

    return new Proxy(object, {
        get (target, prop) {
            if (prop === "s") return publicStores;
            return target[prop as keyof T];
        },
        set (target, p, value) {
            if (p === "s") {
                return false;
            }
            if (stores[p as keyof T]) {
                stores[p as keyof T]!.set(value);
            } else {
                target[p as keyof T] = value;
            }
            return true;
        },
    }) as T & { s: typeof publicStores };
}

export default (
    sett: { id: number, name: string } | null,
    isItYou: boolean,
    yourId: number,
    partner: NM.User,
    currentOwnerId: number,
    oppositeOwnerId: number,
) => {
    const holdersCards = new OwnedCards(currentOwnerId);
    const oppositesCards = new OwnedCards(oppositeOwnerId);
    const data = Observable({
        filterSetList,
        filterSet: filterSetList.find("default"),
        filters: {
            ...DEFAULT_FILTERS,
            ...filterSetList.find("default")?.filters,
            sett,
        },
        defaultFilters: {
            ...DEFAULT_FILTERS,
            sett,
        },
        hiddenSetts: [] as HiddenSett[],
        activeFilterLabels: [] as ActiveFilterLabel[],
        ownerCollections: null as unknown as UserCollections,
        oppositeCollections: null as unknown as UserCollections,
        collections: null as NM.SettMetrics[]|null,

        applyFilters,
        deleteFilterSet,
        hideSett,
        saveFilters,
        showSett,
        stop () {
            holdersCards.stop();
            oppositesCards.stop();
        },
    });

    Promise.all([ownedCollections(currentOwnerId), ownedCollections(oppositeOwnerId)])
        .then(([current, opposite]) => {
            data.ownerCollections = current.userCollections;
            data.oppositeCollections = opposite.userCollections;
            data.collections = getCollectionList(
                data.filters,
                data.ownerCollections,
                data.oppositeCollections,
            );
        });

    let seriesListKey = "";
    data.s.filters.subscribe((filters) => {
        syncFilters(filters);
        if (data.filterSet && !isEqualToFilterSet(filters, data.filterSet)) {
            data.filterSet = null;
        }
        if ((data.hiddenSetts === filters.hiddenSetts) !== (filters.sett === null)) {
            data.hiddenSetts = filters.sett ? [] : filters.hiddenSetts;
        }
        updateActiveFilterLabels();

        // re-filter the series list when these filters get changed
        const newSeriesListKey = [
            filters.shared,
            filters.incompleteSetts,
            filters.collection,
        ].toString();
        if (seriesListKey !== newSeriesListKey) {
            seriesListKey = newSeriesListKey;
            if (data.collections) {
                data.collections = getCollectionList(
                    data.filters,
                    data.ownerCollections,
                    data.oppositeCollections,
                );
            }
        }
    });

    data.s.filterSet.subscribe(async (filterSet) => {
        if (!filterSet) return;

        const oldSett = data.filters.sett;
        data.filters = {
            ...data.defaultFilters,
            ...filterSet.filters,
            sett: filterSet.includeSett ? filterSet.filters.sett : oldSett,
        };

        // update tips of the hidden setts
        if (data.filters.hiddenSetts.length > 0) {
            const hSetts = [] as HiddenSett[];
            // eslint-disable-next-line no-shadow
            for (const sett of data.filters.hiddenSetts) {
                // eslint-disable-next-line no-await-in-loop
                const [yourProgress, partnerProgress] = await Promise.all([
                    getProgress(yourId, sett.id),
                    getProgress(partner.id, sett.id),
                ]);
                const yourTip = yourProgress ? makeShortTip(yourProgress) : "—";
                const partnerTip = partnerProgress ? makeShortTip(partnerProgress) : "—";
                hSetts.push({
                    ...sett,
                    tip: `You: ${yourTip}, ${partner.first_name}: ${partnerTip}`,
                });
            }
            data.filters.hiddenSetts = hSetts;
            data.hiddenSetts = hSetts;
        }
    });

    async function saveFilters () {
        data.filterSet = await filterSetList.add(data.filters);
        if (data.filterSet) updateActiveFilterLabels();
    }

    async function deleteFilterSet () {
        if (data.filterSet && await filterSetList.remove(data.filterSet)) {
            data.filterSet = null;
            updateActiveFilterLabels();
        }
    }

    function applyFilters (
        prints: NM.PrintInTrade[],
        offer: NM.PrintInTrade[],
        output: Writable<NM.PrintInTrade[]>,
    ) {
        return filterPrints(
            prints,
            offer,
            output,
            data.filters,
            data.collections,
            holdersCards,
            oppositesCards,
            isItYou,
        );
    }

    function showSett (settId: number) {
        data.filters = {
            ...data.filters,
            hiddenSetts: data.filters.hiddenSetts.filter(({ id }) => id !== settId),
        };
    }

    async function hideSett (print: NM.PrintInTrade) {
        data.filters = {
            ...data.filters,
            hiddenSetts: [
                await createHiddenSett(print, yourId, partner),
                ...data.filters.hiddenSetts,
            ].sort((a, b) => a.name.localeCompare(b.name)),
        };
    }

    function updateActiveFilterLabels () {
        data.activeFilterLabels = getActiveFilterLabels(
            data.filters,
            data.filterSet,
            isItYou,
            partner,
        );
    }

    return data;
};

/**
 * Updates related filters
 */
function syncFilters (filters: Filters) {
    if (filters.duplicatesOnly !== filters.holderOwns[0] > 1) {
        filters.duplicatesOnly = filters.holderOwns[0] > 1;
    }
    if (filters.notOwned !== (filters.oppositeOwns[1] === 0)) {
        filters.notOwned = filters.oppositeOwns[1] === 0;
    }
    if (filters.notOwned && !filters.incompleteSetts) {
        filters.incompleteSetts = true;
    }
}

/**
 * Generates labels of the active filters
 */
function getActiveFilterLabels (
    filters: Filters,
    filterSet: FilterSet|null,
    isItYou: boolean,
    partner: NM.User,
) {
    let activeFilters: ActiveFilterLabel[] = [];
    if (filterSet) {
        activeFilters.push({
            prefix: "FS",
            text: filterSet.name,
            tip: `Filter set "${filterSet.name}"`,
        });
        if (!filterSet.filters.sett && filters.sett) {
            activeFilters.push(getFilterLabel("sett", filters.sett, isItYou, partner)!);
        }
    } else {
        activeFilters = Reflect.ownKeys(getActiveFilters(filters))
            .map((name) => getFilterLabel(
                name as keyof Filters,
                filters[name as keyof Filters],
                isItYou,
                partner,
            ))
            .filter((af): af is ActiveFilterLabel => af !== null);

        // join shared, incompleteSetts, and sett name
        activeFilters = mergeActiveFilters(activeFilters, "S");
        // join all series types into one
        activeFilters = mergeActiveFilters(activeFilters, "ST", "S");
        if (filters.sett) {
            activeFilters = mergeActiveFilters(activeFilters, "P'S", "");
            activeFilters = mergeActiveFilters(activeFilters, "U'S", "");
            activeFilters = mergeActiveFilters(activeFilters, "S", "");
            activeFilters.unshift(getFilterLabel("sett", filters.sett, isItYou, partner)!);
        }
        // join wishlisted, notInTrades, and cardName
        activeFilters = mergeActiveFilters(activeFilters, "C");
        // join all rarities into one
        activeFilters = mergeActiveFilters(activeFilters, "CR", "C");
    }
    return activeFilters;
}

/**
 * Generates new collections list according to filters
 */
function getCollectionList (
    filters: Filters,
    ownerCollections: UserCollections,
    oppositeCollections: UserCollections,
) {
    let collections = ownerCollections.getCollections();
    if (filters.shared) {
        const colls = oppositeCollections.getCollections();
        collections = collections
            .filter(({ id }) => colls.find((coll) => id === coll.id));
    }
    if (filters.incompleteSetts) {
        collections = collections.filter((coll) => {
            const progress = oppositeCollections.getProgress(coll.id);
            return !progress || progress.total.owned < progress.total.count;
        });
    }
    if (getActiveFilters(filters).collection) {
        collections = collections.filter((coll) => {
            const count = oppositeCollections.getProgress(coll.id)?.total.owned ?? 0;
            return inRange(count, filters.collection);
        });
    }
    return collections
        .sort((a, b) => a.name.replace(/^(the)? /i, "")
            .localeCompare(b.name.replace(/^(the)? /i, "")));
}

/**
 * Filters the prints according to filters and params
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
async function filterPrints (
    prints: NM.PrintInTrade[],
    offer: NM.PrintInTrade[],
    output: Writable<NM.PrintInTrade[]>,
    filters: Filters,
    collections: NM.SettMetrics[]|null,
    holdersCards: OwnedCards,
    oppositesCards: OwnedCards,
    isItYou: boolean,
) {
    const activeFilters = getActiveFilters(filters);
    // hide the chosen prints
    prints = prints.filter((print) => !offer.some((p) => p.id === print.id));
    // hide cards from hidden series
    if (activeFilters.hiddenSetts) {
        prints = prints.filter(({ sett_id: sid }) => (
            filters.hiddenSetts.every(({ id }) => id !== sid)
        ));
    }
    // hide cards involved in other trades
    if (filters.tradingCards === 1) {
        prints = prints.filter((print) => !isTrading(
            print,
            isItYou ? "give" : "receive",
            isItYou ? "print" : "card",
        ));
    }
    // card hiding based on card owner's number of owned copies
    if (activeFilters.holderOwns) {
        if (holdersCards.isLoading) {
            await holdersCards.waitLoading();
        }
        prints = prints.filter((print) => {
            const count = holdersCards.getPrintCount(print.id);
            return inRange(count, filters.holderOwns);
        });
    }
    // card hiding based on opposite user's number of owned copies
    if (activeFilters.oppositeOwns) {
        if (oppositesCards.isLoading) {
            await oppositesCards.waitLoading();
        }
        prints = prints.filter((print) => {
            const count = oppositesCards.getPrintCount(print.id);
            return inRange(count, filters.oppositeOwns);
        });
    }
    // card hiding based on the total card count
    if (activeFilters.cardCount) {
        prints = prints.filter((print) => {
            const count = print.num_prints_total;
            if (count === "unlimited") {
                return filters.cardCount[1] === Number.POSITIVE_INFINITY;
            }
            return inRange(count, filters.cardCount);
        });
    }
    // card hiding based on collection progress
    if (!filters.sett && (
        activeFilters.collection || filters.incompleteSetts && !filters.notOwned
    )) {
        prints = prints.filter((print) => {
            const settId = print.sett_id;
            // assume `collections` already contains filtered series
            return collections?.find(({ id }) => id === settId);
        });
    }
    // card hiding based on series type
    if (!filters.sett && (
        filters.oopSetts
        || filters.limCreditSetts
        || filters.limFreebieSetts
        || filters.unlimSetts
        || filters.rieSetts
    )) {
        const settTypes = await Promise.all(
            prints.map((print) => getSettType(print.sett_id)),
        );
        // eslint-disable-next-line array-callback-return
        prints = prints.filter((_, i) => {
            switch (settTypes[i]) {
                case "oop": return filters.oopSetts;
                case "limCredit": return filters.limCreditSetts;
                case "limFree": return filters.limFreebieSetts;
                case "unlim": return filters.unlimSetts;
                case "rie": return filters.rieSetts;
                default: return true;
            }
        });
    }

    output.update((arr) => arr.concat(prints));
}

async function createHiddenSett (print: NM.PrintInTrade, yourId: number, partner: NM.User) {
    const [yourProgress, partnerProgress] = await Promise.all([
        getProgress(yourId, print.sett_id),
        getProgress(partner.id, print.sett_id),
    ]);
    const yourTip = yourProgress ? makeShortTip(yourProgress) : "—";
    const partnerTip = partnerProgress ? makeShortTip(partnerProgress) : "—";
    return {
        id: print.sett_id,
        name: print.sett_name,
        tip: `You: ${yourTip}, ${partner.first_name}: ${partnerTip}`,
    } as HiddenSett;
}

/**
 * Merges active filters with the same prefix into one
 * @param afilters - the array with the filters
 * @param prefix - which filters to merge
 * @param newPrefix - the new prefix, by default used the old one.
 *      Empty prefix will result in removing the filters
 * @returns - the array with merged filters
 */
export function mergeActiveFilters (
    afilters: ActiveFilterLabel[],
    prefix: string,
    newPrefix = prefix,
) {
    const afs = afilters.filter((af) => af.prefix === prefix);
    if (afs.length === 0) return afilters;
    if (afs.length === 1 && newPrefix) {
        afs[0].prefix = newPrefix;
        return afilters;
    }
    const pos = afilters.indexOf(afs[0]);
    afilters = afilters.filter((af) => !afs.includes(af));
    if (newPrefix) {
        const af: ActiveFilterLabel = {
            prefix: newPrefix,
            icons: afs.flatMap(({ icons = [] }, i) => (i > 0 ? ["pipe", ...icons] : icons)),
            text: afs.find(({ text }) => text)?.text,
            tip: afs.map(({ tip }) => tip).join(", ").replaceAll(" cards,", ","),
        };
        afilters.splice(pos, 0, af);
    }
    return afilters;
}

/**
 * Creates an object whose props indicate whether the filter differ from the default value
 * @param filters - the filters to compare
 */
export function getActiveFilters (filters: Filters) {
    return new Proxy<object>({}, {
        get (_, prop: keyof Filters) {
            if (prop === "hiddenSetts") {
                return filters.sett === null && filters.hiddenSetts.length > 0;
            }
            if (prop === "sett") {
                return filters.sett !== DEFAULT_FILTERS.sett;
            }
            // whether a filter has value other than default one
            const value = filters[prop];
            const defValue = DEFAULT_FILTERS[prop];
            if (isRange(value) && isRange(defValue)) {
                return !areRangesEqual(value, defValue);
            }
            return value !== defValue;
        },
        ownKeys () {
            return Reflect.ownKeys(DEFAULT_FILTERS)
                .filter((key) => this.get!(filters, key, filters));
        },
    }) as Record<keyof Filters, boolean>;
}
