<script context="module" lang="ts">
    import type NM from "../../utils/NMTypes";
    import type { IconName } from "../elements/Icon.svelte";

    import { writable } from "svelte/store";
    import NMApi from "../../utils/NMApi";
    import { loadValue, saveValue } from "../../utils/storage";
    import { confirm, createDialog } from "../dialogs/modals";
    import NameFilterSet from "../dialogs/NameFilterSet.svelte";

    type Range = [number, number];
    type SettType = "oop"|"limCredit"|"limFree"|"unlim"|"rie";
    const settType: Record<number, SettType> = {};
    const loading: Record<number, Promise<NM.Sett>> = {};

    async function getSettType (settId: number) {
        if (settId in settType) return settType[settId];
        const sett = settId in loading
            ? await loading[settId]
            : await (loading[settId] = NMApi.sett.get(settId));
        let type: SettType;
        if (sett.discontinued || sett.percent_sold_out === 100) {
            type = "oop";
        } else if (sett.version !== 2 && sett.freebies_discontinued) {
            type = "limCredit";
        } else if (sett.version !== 2) {
            type = "limFree";
        } else if (new Date(sett.discontinue_date).getTime() - Date.now() < 365 * 86_400_000) {
            type = "unlim";
        } else {
            type = "rie";
        }
        settType[settId] = type;
        return type;
    }

    type hiddenSett = {
        id: number, // sett ID
        name: string, // sett name
        tip: string, // tooltip with collection progress
    }
    type ActiveFilter = {
        prefix: string,
        icons?: (IconName | "oop" | "rie" | "pipe")[],
        text?: string,
        tip: string,
    }
    type Filters = {
        // search filters
        cardName: string,
        shared: boolean,
        notOwned: boolean,
        wishlisted: boolean,
        duplicatesOnly: boolean,
        sett: {
            id: number,
            name: string,
        } | null,
        common: boolean,
        uncommon: boolean,
        rare: boolean,
        veryRare: boolean,
        extraRare: boolean,
        chase: boolean,
        variant: boolean,
        legendary: boolean,
        // extra filters
        incompleteSetts: boolean,
        hiddenSetts: hiddenSett[],
        notInTrades: boolean,
        holderOwns: Range, // the cardOwner
        oppositeOwns: Range, // the opposite user
        cardCount: Range,
        collection: Range,
        oopSetts: boolean,
        limCreditSetts: boolean,
        limFreebieSetts: boolean,
        unlimSetts: boolean,
        rieSetts: boolean,
    }
    type FilterSet = {
        name: string,
        includeSett: boolean,
        filters: Filters,
    }
    const filterSetList: Writable<FilterSet[]> = writable<FilterSet[]>([], (set) => {
        const fsets = loadValue<FilterSet[]>("filterSets", []);
        // the Infinity value cannot be stored in JSON, so
        // during serialization it gets replaced with null
        // now we need to fix it back
        for (const fset of fsets) {
            let prop: keyof Filters;
            for (prop in fset.filters) {
                if (prop === "hiddenSetts") continue;
                const val = fset.filters[prop];
                if (Array.isArray(val) && (val as (number|null)[]).includes(null)) {
                    (fset.filters[prop] as number[]) = val
                        .map((num) => (num === null ? Number.POSITIVE_INFINITY : num));
                }
            }
        }
        set(fsets);
    });

    function isRange (val: any): val is Range {
        return Array.isArray(val) && val.length === 2;
    }

    function areRangesEqual (r1: Range, r2:  Range) {
        return r1[0] === r2[0] && r1[1] === r2[1];
    }

    function inRange (value: number, [start, end]: Range) {
        return start <= value && value <= end;
    }

    /**
     * Checks is the filters and the filter set completely match
     */
    // eslint-disable-next-line sonarjs/cognitive-complexity
    function isEqualToFilterSet (filters: Filters, fset: FilterSet) {
        let prop: keyof Filters;
        for (prop in filters) {
            if (prop === "sett") {
                if (fset.includeSett && filters.sett?.id !== fset.filters.sett?.id) {
                    return false;
                }
            } else if (prop === "hiddenSetts") {
                if (filters.hiddenSetts.length !== fset.filters.hiddenSetts.length) {
                    return false;
                }
                if (filters.hiddenSetts.some(({ id }) => (
                    !fset.filters.hiddenSetts.some((sett) => sett.id !== id)))
                ) {
                    return false;
                }
            } else {
                const val1 = filters[prop];
                const val2 = fset.filters[prop];
                // prop is a range
                if (isRange(val1) && isRange(val2)) {
                    if (!areRangesEqual(val1, val2)) {
                        return false;
                    }
                // anything else: number, string, boolean
                } else if (val1 !== val2) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Saves the filters as a filter set
     * @param filters - the filters to save
     * @returns - the new filter set or null if saving was canceled
     */
    async function saveFilterSet (filters: Filters) {
        const data = await createDialog(NameFilterSet, {});
        if (!data) return null;
        const filterSet = {
            ...data,
            filters: { ...filters },
        };
        // no need to save these data
        if (!filterSet.includeSett) {
            filterSet.filters.sett = null;
        } else if (filterSet.filters.sett) {
            // rid of the extra info
            filterSet.filters.sett = {
                id: filterSet.filters.sett.id,
                name: filterSet.filters.sett.name,
            };
        }
        for (const sett of filterSet.filters.hiddenSetts) {
            sett.tip = "";
        }

        filterSetList.update((fsets) => {
            fsets = fsets.filter(({ name }) => name !== filterSet.name);
            fsets.push(filterSet);
            fsets.sort((fs1, fs2) => fs1.name.localeCompare(fs2.name));
            saveValue("filterSets", fsets);
            return fsets;
        });
        return filterSet;
    }
    /**
     * Delete the filter set
     * @param filterSet - the filter set to delete
     * @returns - if the filter set was deleted
     */
    async function deleteFilterSet (filterSet: FilterSet) {
        if (await confirm("Are you sure you want to delete this filter set?")) {
            filterSetList.update((fsets) => {
                fsets = fsets.filter((fs) => fs !== filterSet);
                saveValue("filterSets", fsets);
                return fsets;
            });
            return true;
        }
        return false;
    }
</script>
<!-- @component
    A component to edit print search filters
-->
<script lang="ts">
    import type { Progress, UserCollections } from "../../services/ownedCollections";
    import type { rarityCss } from "../../utils/NMTypes";
    import type { Actors } from "../TradeWindow.svelte";
    import type { Writable } from "svelte/store";

    import { createEventDispatcher, getContext, onDestroy } from "svelte";
    import OwnedCards from "../../services/ownedCards";
    import ownedCollections from "../../services/ownedCollections";
    import { isTrading } from "../../services/tradingCards";
    import { firstNamePossessive as possName } from "../../services/user";
    import { error, num2text } from "../../utils/utils";
    import DoubleRange from "../elements/DoubleRange.svelte";
    import Dropdown from "../elements/Dropdown.svelte";
    import Icon from "../elements/Icon.svelte";
    import PushSwitch from "../elements/PushSwitch.svelte";
    import { getProgress, makeShortTip } from "./CollectionProgress.svelte";

    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;
    /**
     * List of hidden setts
    */
    export const hiddenSetts = writable<hiddenSett[]>([]);
    /**
     * List of active filters
     */
    export const activeFilters = writable<ActiveFilter[]>([]);

    const actors = getContext<Actors>("actors");
    const cardOwner = getContext<NM.User>("cardOwner");
    const isItYou = getContext<boolean>("isItYou");

    const dispatch = createEventDispatcher();

    const RARITIES: rarityCss[] = [
        "common", "uncommon", "rare", "veryRare", "extraRare", "chase", "variant", "legendary",
    ];

    // ID of the user in another list
    const oppositeOwnerId = isItYou ? actors.partner.id : actors.you.id;

    const defaultFilters = {
        collection: [0, Number.POSITIVE_INFINITY],

        shared: false,
        incompleteSetts: false,
        sett: null,

        oopSetts: false,
        limCreditSetts: false,
        limFreebieSetts: false,
        unlimSetts: false,
        rieSetts: false,

        wishlisted: false,
        notInTrades: false,
        cardName: "",

        common: false,
        uncommon: false,
        rare: false,
        veryRare: false,
        extraRare: false,
        chase: false,
        variant: false,
        legendary: false,

        oppositeOwns: [0, Number.POSITIVE_INFINITY],
        holderOwns: [1, Number.POSITIVE_INFINITY],
        cardCount: [1, Number.POSITIVE_INFINITY],

        notOwned: false,
        duplicatesOnly: false,
        hiddenSetts: [],
    } as Filters;
    const holderOwnsNumbers = [1, 2, 3, 4, 5, 10, 20, 50, 100, Number.POSITIVE_INFINITY];
    const oppositeOwnsNumbers = [0, ...holderOwnsNumbers];
    // eslint-disable-next-line max-len, comma-spacing
    const cardCountNumbers = [1,10,50,100,250,500,750,1e3,1.5e3,2e3,3e3,4e3,5e3,7.5e3,1e4,1.5e4,2e4,3e4,4e4,5e4,7.5e4,1e5,Number.POSITIVE_INFINITY];
    // eslint-disable-next-line max-len, comma-spacing
    const collectionNumbers = [0,1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,110,120,130,140,150,160,170,180,190,200,Number.POSITIVE_INFINITY];

    $: defaultFilters.sett = sett;

    let filterSet = $filterSetList.find(({ name }) => name.toLowerCase() === "default") ?? null;
    let filters: Filters = filterSet
        ? { ...defaultFilters, ...filterSet.filters, sett }
        : { ...defaultFilters, sett };
    const isFilterActive = new Proxy<object>({}, {
        get (_, prop: keyof Filters) {
            if (prop === "hiddenSetts") {
                return filters.sett === null && filters.hiddenSetts.length > 0;
            }
            if (prop === "sett") {
                return filters.sett?.id !== defaultFilters.sett?.id;
            }
            // whether a filter has value other than default one
            const value = filters[prop];
            const defValue = defaultFilters[prop];
            if (isRange(value) && isRange(defValue)) {
                return !areRangesEqual(value, defValue);
            }
            return value !== defValue;
        },
        ownKeys () {
            return Reflect.ownKeys(defaultFilters)
                .filter((key) => this.get!(filters, key, filters));
        },
    }) as Record<keyof Filters, boolean>;

    /**
     * Resets `filterSet` to `null` if it doesn't match the passed filters
     * @param f - the filters to compare with
     */
    function resetFilterSet (f: Filters) {
        if (filterSet && !isEqualToFilterSet(f, filterSet)) {
            filterSet = null;
        }
    }
    $: resetFilterSet(filters);

    /**
     * Merges active filters with the same prefix into one
     * @param afilters - the array with the filters
     * @param prefix - which filters to merge
     * @param newPrefix - the new prefix, by default used the old one.
     *      Empty prefix will result in removing the filters
     * @returns - the array with merged filters
     */
    function mergeActiveFilters (afilters: ActiveFilter[], prefix: string, newPrefix = prefix) {
        const afs = afilters.filter((af) => af.prefix === prefix);
        if (afs.length === 0) return afilters;
        if (afs.length === 1 && newPrefix) {
            afs[0].prefix = newPrefix;
            return afilters;
        }
        const pos = afilters.indexOf(afs[0]);
        afilters = afilters.filter((af) => !afs.includes(af));
        if (newPrefix) {
            const af: ActiveFilter = {
                prefix: newPrefix,
                icons: afs.flatMap(({ icons = [] }, i) => (i > 0 ? ["pipe", ...icons] : icons)),
                text: afs.find(({ text }) => text)?.text,
                tip: afs.map(({ tip }) => tip).join(", ").replaceAll(" cards,", ","),
            };
            afilters.splice(pos, 0, af);
        }
        return afilters;
    }

    // re-filter the series list when these filters get changed
    let seriesListKey = "";
    // keep filters conformed and synced with the exported variables
    $: filters, conformFilters();
    function conformFilters () {
        if (filters.duplicatesOnly !== filters.holderOwns[0] > 1) {
            filters.duplicatesOnly = filters.holderOwns[0] > 1;
        }
        if (filters.notOwned !== (filters.oppositeOwns[1] === 0)) {
            filters.notOwned = filters.oppositeOwns[1] === 0;
        }
        if (filters.notOwned && !filters.incompleteSetts) {
            filters.incompleteSetts = true;
        }

        if (($hiddenSetts === filters.hiddenSetts) !== (filters.sett === null)) {
            $hiddenSetts = filters.sett ? [] : filters.hiddenSetts;
        }
        // re-filter the series list when these filters get changed
        const newSeriesListKey = [
            filters.shared,
            filters.incompleteSetts,
            filters.collection,
        ].toString();
        if (seriesListKey !== newSeriesListKey) {
            seriesListKey = newSeriesListKey;
            updateSeriesList();
        }

        let newActiveFilters: ActiveFilter[] = [];
        if (filterSet) {
            newActiveFilters.push({
                prefix: "FS",
                text: filterSet.name,
                tip: `Filter set "${filterSet.name}"`,
            });
            if (!filterSet.filters.sett && filters.sett) {
                newActiveFilters.push(getFilterLabel("sett")!);
            }
        } else {
            newActiveFilters = Reflect.ownKeys(isFilterActive)
                .map((name) => getFilterLabel(name as keyof Filters))
                .filter((af): af is ActiveFilter => af !== null);

            // join shared, incompleteSetts, and sett name
            newActiveFilters = mergeActiveFilters(newActiveFilters, "S");
            // join all series types into one
            newActiveFilters = mergeActiveFilters(newActiveFilters, "ST", "S");
            if (filters.sett) {
                newActiveFilters = mergeActiveFilters(newActiveFilters, "P'S", "");
                newActiveFilters = mergeActiveFilters(newActiveFilters, "U'S", "");
                newActiveFilters = mergeActiveFilters(newActiveFilters, "S", "");
                newActiveFilters.unshift(getFilterLabel("sett")!);
            }
            // join wishlisted, notInTrades, and cardName
            newActiveFilters = mergeActiveFilters(newActiveFilters, "C");
            // join all rarities into one
            newActiveFilters = mergeActiveFilters(newActiveFilters, "CR", "C");
        }
        $activeFilters = newActiveFilters;
        dispatch("filtersChange");
    }

    // CollectionProgress anyway uses ownedCollections
    // so it is ok to load this data even if it won't be displayed
    let ownerCollections: UserCollections;
    let oppositeCollections: UserCollections;
    let collections: NM.SettMetrics[]|null = null;
    async function updateSeriesList () {
        if (!ownerCollections) {
            ownerCollections = await ownedCollections(cardOwner.id)
                .then(({ userCollections }) => userCollections);
        }
        if (!oppositeCollections) {
            oppositeCollections = await ownedCollections(oppositeOwnerId)
                .then(({ userCollections }) => userCollections);
        }
        let newCollections = ownerCollections.getCollections();
        if (filters.shared) {
            const colls = oppositeCollections.getCollections();
            newCollections = newCollections
                .filter(({ id }) => colls.find((coll) => id === coll.id));
        }
        if (filters.incompleteSetts) {
            newCollections = newCollections.filter((coll) => {
                const progress = oppositeCollections.getProgress(coll.id);
                return !progress || progress.total.owned < progress.total.count;
            });
        }
        if (isFilterActive.collection) {
            newCollections = newCollections.filter((coll) => {
                const count = oppositeCollections.getProgress(coll.id)?.total.owned ?? 0;
                return inRange(count, filters.collection);
            });
        }
        collections = newCollections
            .sort((a, b) => a.name.replace(/^(the)? /i, "")
                .localeCompare(b.name.replace(/^(the)? /i, "")));
    }

    /**
     * Apply the current filter set
     */
    async function setFilters () {
        if (!filterSet) return;

        const oldSett = filters.sett;
        filters = { ...defaultFilters, ...filterSet.filters };
        if (!filterSet.includeSett) {
            filters.sett = oldSett;
        }
        $hiddenSetts = filterSet.filters.hiddenSetts;

        // update tips of the hidden setts
        if (filters.hiddenSetts.length > 0) {
            const hSetts = [] as typeof filters.hiddenSetts;
            // eslint-disable-next-line no-shadow
            for (const sett of filters.hiddenSetts) {
                // eslint-disable-next-line no-await-in-loop
                const [yourProgress, partnerProgress] = await Promise.all([
                    getProgress(actors.you.id, sett.id),
                    getProgress(actors.partner.id, sett.id),
                ]);
                const yourTip = yourProgress ? makeShortTip(yourProgress) : "—";
                const partnerTip = partnerProgress ? makeShortTip(partnerProgress) : "—";
                hSetts.push({
                    ...sett,
                    tip: `You: ${yourTip}, ${actors.partner.first_name}: ${partnerTip}`,
                });
            }
            filters.hiddenSetts = hSetts;
            $hiddenSetts = hSetts;
        }
    }
    /**
     * Save the current filters
     */
    async function saveNewFilterSet () {
        filterSet = await saveFilterSet(filters);
        if (filterSet) conformFilters();
    }
    /**
     * Delete the current filter set
     */
    async function deleteCurrentFilterSet () {
        if (!filterSet) return;
        if (await deleteFilterSet(filterSet)) {
            filterSet = null;
            conformFilters();
        }
    }

    /**
     * Get the filter hint
     */
    function getHint (name: keyof Filters) {
        switch (name) {
            case "shared": return isItYou
                ? `Series that both you and ${actors.partner.first_name} are collecting`
                : `Series that both ${actors.partner.first_name} and you are collecting`;
            case "notOwned": return isItYou
                ? `Cards ${actors.partner.first_name} doesn't own`
                : "Cards you don't own";
            case "incompleteSetts": return isItYou
                ? `Series that ${actors.partner.first_name} hasn't completed`
                : "Series that you haven't completed";
            case "wishlisted": return isItYou
                ? `Cards ${actors.partner.first_name} wishlisted`
                : "Cards you wishlisted";
            case "duplicatesOnly": return isItYou
                ? "Cards you own multiples of"
                : `Cards ${actors.partner.first_name} owns multiples of`;
            case "common": return "Common cards";
            case "uncommon": return "Uncommon cards";
            case "rare": return "Rare cards";
            case "veryRare": return "Very Rare cards";
            case "extraRare": return "Extra Rare cards";
            case "chase": return "Chase cards";
            case "variant": return "Variant cards";
            case "legendary": return "Legendary cards";
            case "notInTrades": return "Cards not involved in your trades";
            case "oopSetts": return "Out of print series";
            case "limCreditSetts": return "Limited series with credit packs only";
            case "limFreebieSetts": return "Limited series with freebie packs";
            case "unlimSetts": return "Unlimited series";
            case "rieSetts": return "Replica and Infinite Edition series";

            case "collection":
            case "cardCount":
            case "holderOwns":
            case "oppositeOwns":
            case "cardName":
            case "sett":
            case "hiddenSetts":
                return "";
            default:
                error("Unimplemented hint", name);
                return "";
        }
    }
    /**
     * Represent a range as a short and long text
     * @param range - range to convert to text
     * @param devRange - default values of the range
     * @returns object with short and long representation of the range
     */
    function rangeToString ([start, end]: Range, [defStart, defEnd]: Range) {
        let short: string;
        if (start === end) {
            short = num2text(start);
        } else if (end === defEnd) {
            short = `${num2text(start)}+`;
        } else if (start === defStart) {
            short = `${num2text(end)}-`;
        } else {
            short = `${num2text(start)}-${num2text(end)}`;
        }
        const full = start === end
            ? num2text(start)
            : `${num2text(start)} to ${num2text(end)}`;
        return { short, full };
    }
    /**
     * Get a data about the filter for displaying
     */
    // eslint-disable-next-line sonarjs/cognitive-complexity
    function getFilterLabel (name: keyof Filters): ActiveFilter | null {
        const tip = getHint(name);
        const range = isRange(filters[name]) && name !== "hiddenSetts"
            ? rangeToString(filters[name] as Range, defaultFilters[name] as Range)
            : { short: "", full: "" };
        switch (name) {
            case "shared": return {
                prefix: "S",
                icons: ["commonSeries"],
                tip,
            };
            case "notOwned": return null;
            case "wishlisted": return {
                prefix: "C",
                icons: ["wishlisted"],
                tip,
            };
            case "duplicatesOnly": return null;

            case "common":
            case "uncommon":
            case "rare":
            case "veryRare":
            case "extraRare":
            case "chase":
            case "variant":
            case "legendary": return {
                prefix: "CR",
                icons: [name],
                tip,
            };
            case "notInTrades": return {
                prefix: "C",
                icons: ["trade"],
                tip,
            };
            case "incompleteSetts": return {
                prefix: "S",
                icons: ["unownedCard"],
                tip,
            };
            case "oopSetts": return {
                prefix: "ST",
                icons: ["oop"],
                tip,
            };
            case "limCreditSetts": return {
                prefix: "ST",
                icons: ["limited", "credit"],
                tip,
            };
            case "limFreebieSetts": return {
                prefix: "ST",
                icons: ["limited", "freebie"],
                tip,
            };
            case "unlimSetts": return {
                prefix: "ST",
                icons: ["unlimited"],
                tip,
            };
            case "rieSetts": return {
                prefix: "ST",
                icons: ["rie"],
                tip,
            };
            case "collection": return {
                prefix: isItYou ? "P'S" : "U'S",
                text: range.short,
                tip: `${possName(actors.partner, true)} series with ${range.full} collected cards`,
            };
            case "cardCount": return {
                prefix: "CC",
                text: range.short,
                tip: `Cards with the total number from ${range.full}`,
            };
            case "holderOwns": return {
                prefix: isItYou ? "U'C" : "P'C",
                text: range.short,
                tip: `${possName(actors.partner, true)} cards with ${range.full} copies`,
            };
            case "oppositeOwns": return {
                prefix: isItYou ? "P'C" : "U'C",
                text: range.short,
                tip: `${possName(actors.partner, true)} cards with ${range.full} copies`,
            };
            case "cardName": return {
                prefix: "C",
                text: filters.cardName,
                tip: `Cards which names includes "${filters.cardName}"`,
            };
            case "sett": return filters?.sett
                ? {
                    prefix: "S",
                    text: filters.sett.name,
                    tip: `Cards only from the series "${filters.sett.name}"`,
                }
                : null;
            case "hiddenSetts": return null;
            default:
                error("Unimplemented filter label", name);
                return null;
        }
    }

    /**
     * Get the search filters
     */
    export function getQueryFilters () {
        return {
            cardId: null,
            cardName: filters.cardName || null,
            sharedWith: filters.shared ? oppositeOwnerId : null,
            notOwnedBy: filters.notOwned ? oppositeOwnerId : null,
            wishlistedBy: filters.wishlisted ? oppositeOwnerId : null,
            settId: filters.sett?.id || null,
            duplicatesOnly: filters.duplicatesOnly,
            common: filters.common,
            uncommon: filters.uncommon,
            rare: filters.rare,
            veryRare: filters.veryRare,
            extraRare: filters.extraRare,
            chase: filters.chase,
            variant: filters.variant,
            legendary: filters.legendary,
        };
    }

    const holdersCards = new OwnedCards(cardOwner.id);
    const oppositesCards = new OwnedCards(oppositeOwnerId);
    onDestroy(() => {
        holdersCards.stop();
        oppositesCards.stop();
    });
    /**
     * Apply the filters to the prints
     * @param prints - the prints to filters
     * @param offer - the prints to exclude
     * @param output - a store for filtered prints
     */
    // eslint-disable-next-line sonarjs/cognitive-complexity
    export async function applyFilters (
        prints: NM.PrintInTrade[],
        offer: NM.PrintInTrade[],
        output: Writable<NM.PrintInTrade[]>,
    ) {
        // hide the chosen prints
        prints = prints.filter((print) => !offer.some((p) => p.id === print.id));
        // hide cards from hidden series
        if (isFilterActive.hiddenSetts) {
            prints = prints.filter(({ sett_id: sid }) => (
                filters.hiddenSetts.every(({ id }) => id !== sid)
            ));
        }
        // hide cards involved in other trades
        if (isFilterActive.notInTrades) {
            prints = prints.filter((print) => !isTrading(
                print,
                isItYou ? "give" : "receive",
                isItYou ? "print" : "card",
            ));
        }
        // card hiding based on card owner's number of owned copies
        if (isFilterActive.holderOwns) {
            if (holdersCards.isLoading) {
                await holdersCards.waitLoading();
            }
            prints = prints.filter((print) => {
                const count = holdersCards.getPrintCount(print.id);
                return inRange(count, filters.holderOwns);
            });
        }
        // card hiding based on opposite user's number of owned copies
        if (isFilterActive.oppositeOwns) {
            if (oppositesCards.isLoading) {
                await oppositesCards.waitLoading();
            }
            prints = prints.filter((print) => {
                const count = oppositesCards.getPrintCount(print.id);
                return inRange(count, filters.oppositeOwns);
            });
        }
        // card hiding based on the total card count
        if (isFilterActive.cardCount) {
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
            isFilterActive.collection || filters.incompleteSetts && !filters.notOwned
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
            const missingInfo = prints
                .filter((print) => !(print.sett_id in settType))
                .map((print) => getSettType(print.sett_id));
            if (missingInfo.length > 0) await Promise.all(missingInfo);
            // eslint-disable-next-line array-callback-return
            prints = prints.filter((print) => {
                switch (settType[print.sett_id]) {
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

    /**
     * Set the print's series as a selected
     */
    export function selectSett (print: NM.PrintInTrade) {
        filters.sett = {
            id: print.sett_id,
            name: print.sett_name,
        };
    }
    /**
     * Add the print's series to the hidden ones
     */
    export async function hideSett (print: NM.PrintInTrade) {
        const [yourProgress, partnerProgress] = await Promise.all([
            getProgress(actors.you.id, print.sett_id),
            getProgress(actors.partner.id, print.sett_id),
        ]);
        const yourTip = yourProgress ? makeShortTip(yourProgress) : "—";
        const partnerTip = partnerProgress ? makeShortTip(partnerProgress) : "—";
        filters.hiddenSetts = [
            ...filters.hiddenSetts,
            {
                id: print.sett_id,
                name: print.sett_name,
                tip: `You: ${yourTip}, ${actors.partner.first_name}: ${partnerTip}`,
            },
        ];
        filters.hiddenSetts.sort((a, b) => a.name.localeCompare(b.name));
        $hiddenSetts = filters.hiddenSetts;
    }
    /**
     * Remove the series from the hidden ones
     */
    export function showSett (settId: number) {
        filters.hiddenSetts = filters.hiddenSetts.filter(({ id }) => id !== settId);
        $hiddenSetts = filters.hiddenSetts;
    }

    /**
     * Percent of collected cards of the series core
     */
    function collectionCore (coll: Progress | null) {
        return coll ? coll.core.owned / coll.core.count : 0;
    }

    /**
     * Percent of collected cards of special rarities
     */
    function collectionSpecial (coll: Progress | null) {
        return coll
            ? (coll.chase.owned + coll.variant.owned + coll.legendary.owned)
                / (coll.chase.count + coll.variant.count + coll.legendary.count)
            : 0;
    }
</script>

<article>
    <h1 class="small-caps">Filter Set</h1>
    <span class="row">
        <select bind:value={filterSet} on:change={setFilters}>
            <option value={null}>Choose a filter set</option>
            {#each $filterSetList as fs}
                <option value={fs}>{fs.name}</option>
            {/each}
        </select>
        {#if filterSet}
            <Icon icon="trash" size="12px" on:click={deleteCurrentFilterSet} />
        {:else}
            <Icon icon="save" size="12px" on:click={saveNewFilterSet} />
        {/if}
    </span>

    <h1 class="small-caps">Series</h1>
    <span class="row">
        <DoubleRange
            list={collectionNumbers}
            bind:value={filters.collection}
            title="{isItYou ? actors.partner.first_name : "You"} collected"
        />
        <Icon icon="reload" size="12px"
            on:click={() => { filters.collection = defaultFilters.collection; }}
        />
    </span>
    <span class="row">
        <PushSwitch
            bind:value={filters.shared}
            icon="commonSeries"
            hint={getHint("shared")}
        />
        <PushSwitch
            bind:value={filters.incompleteSetts}
            icon="unownedCard"
            hint={getHint("incompleteSetts")}
            on:change={() => {
                if (filters.incompleteSetts && filters.notOwned) {
                    filters.oppositeOwns = defaultFilters.oppositeOwns;
                    filters.incompleteSetts = false;
                }
            }}
        />
        <Dropdown list={collections ?? []} bind:value={filters.sett} let:item
            hint={collections ? "Choose a Series" : "Loading series..."}
            emptyListText="No series matching the filters"
        >
            <!-- if collections list is loaded then user collections loaded too -->
            {@const coll1 = (isItYou ? oppositeCollections : ownerCollections).getProgress(item.id)}
            {@const coll2 = (isItYou ? ownerCollections : oppositeCollections).getProgress(item.id)}
            <div class="collection">
                <div class="name">{item.name}</div>
                <div class="progress"
                    style:--left={collectionCore(coll1)}
                    style:--right={collectionCore(coll2)}
                />
                {#if (coll1 ?? coll2)?.core.count !== (coll1 ?? coll2)?.total.count}
                    <div class="progress"
                        style:--left={collectionSpecial(coll1)}
                        style:--right={collectionSpecial(coll2)}
                    />
                {/if}
            </div>
        </Dropdown>
        <Icon icon="reload" size="12px" on:click={() => { filters.sett = null; }}/>
    </span>
    <span class="row multi-switch">
        <PushSwitch
            bind:value={filters.oopSetts}
            text="OoP"
            hint={getHint("oopSetts")}
        />
        <PushSwitch
            bind:value={filters.limCreditSetts}
            icon={["limited", "credit"]}
            hint={getHint("limCreditSetts")}
        />
        <PushSwitch
            bind:value={filters.limFreebieSetts}
            icon={["limited", "freebie"]}
            hint={getHint("limFreebieSetts")}
        />
        <PushSwitch
            bind:value={filters.unlimSetts}
            icon="unlimited"
            hint={getHint("unlimSetts")}
        />
        <PushSwitch
            bind:value={filters.rieSetts}
            text="RIE"
            hint={getHint("rieSetts")}
        />
    </span>

    <h1 class="small-caps">Cards</h1>
    <span class="row">
        <PushSwitch
            bind:value={filters.wishlisted}
            icon="wishlist"
            activeIcon="wishlisted"
            hint={getHint("wishlisted")}
        />
        <PushSwitch
            bind:value={filters.notInTrades}
            icon="trade"
            hint={getHint("notInTrades")}
        />
        <input
            type=search
            class="search small search-card"
            placeholder="Search by card name"
            bind:value={filters.cardName}
        >
        <Icon icon="reload" size="12px" on:click={() => { filters.cardName = ""; }}/>
    </span>
    <span class="row multi-switch rarities">
        {#each RARITIES as rarity}
            <PushSwitch bind:value={filters[rarity]} icon={rarity} hint={getHint(rarity)} />
        {/each}
    </span>
    <span class="row">
        <DoubleRange
            list={holderOwnsNumbers}
            bind:value={filters.holderOwns}
            title={isItYou ? "You own" : `${actors.partner.first_name} owns`}
        />
        <PushSwitch
            value={filters.duplicatesOnly}
            text="2+" hint={getHint("duplicatesOnly")}
            on:change={() => {
                filters.holderOwns = filters.duplicatesOnly
                    ? defaultFilters.holderOwns
                    : [2, Number.POSITIVE_INFINITY];
            }}
        />
    </span>
    <span class="row">
        <DoubleRange
            list={oppositeOwnsNumbers}
            bind:value={filters.oppositeOwns}
            title={isItYou ? `${actors.partner.first_name} owns` : "You own"}
        />
        <PushSwitch
            value={filters.notOwned}
            icon="unowned"
            hint={getHint("notOwned")}
            on:change={() => {
                filters.oppositeOwns = filters.notOwned
                    ? defaultFilters.oppositeOwns
                    : [0, 0];
            }}
        />
    </span>
    <span class="row">
        <DoubleRange
            list={cardCountNumbers}
            bind:value={filters.cardCount}
            title="Card count"
        />
        <Icon
            icon="reload" size="12px"
            on:click={() => { filters.cardCount = defaultFilters.cardCount; }}
        />
    </span>
</article>

<style>
    article {
        background: white;
        padding: 15px;
        border: 1px solid #d6d6d6;
        border-radius: 10px;
        box-shadow: 0 0 20px #0002;
        min-width: 300px;
        width: 350px;
        box-sizing: border-box;
        font-size: 12px;
        line-height: 1em;
        color: #8b8a8c;
    }
    h1 {
        text-align: center;
        padding: 5px;
        margin: 0 -15px;
        color: #2c2830;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
    }
    h1:not(:first-of-type) {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #d6d6d6;
    }

    .row {
        display: flex;
        align-items: center;
        width: 100%;
        margin: 5px 0 0 0;
        gap: 0.5em;
    }
    .row > :global(*) {
        flex-grow: 1;
        margin-left: 0;
        margin-right: 0;
    }

    .row :global(.slider),
    .row :global(.container),
    .row select,
    .row input[type=search] {
        flex-grow: 500;
    }
    .row select {
        border: 1px solid #ccc;
        background-color: white;
        border-radius: 3px;
        outline: none;
        font-size: 12px;
    }
    .row :global(input[type=search]) {
        height: 28px;
        margin: 0;
        padding: 7.5px 11.25px;
        font-size: 11px;
        color: black;
        border: 1px solid #ccc;
        border-radius: 3px;
        box-shadow: inset 0 1px 2px #0001;
        outline: none;
        appearance: textfield;
        -webkit-appearance: textfield;
    }
    .row :global(input[type=search]::-webkit-search-cancel-button) {
        -webkit-appearance: none;
    }
    .row :global(.slider + /* reload icon */ span) {
        margin-top: 10px;
    }
    .row :global(label) {
        width: 38px;
        height: 28px;
    }
    .row :global(span:last-child) {
        cursor: pointer;
    }
    .row.multi-switch {
        gap: 0;
        border: 1px solid #d6d6d6;
        border-radius: 4px;
    }
    .row.multi-switch > :global(label) {
        box-shadow: none;
        border-right: 1px solid #d6d6d6;
        border-radius: 0;
    }
    .row.multi-switch > :global(label:last-child) {
        border-right: none;
    }
    .rarities {
        font-size: 16px;
    }

    .collection {
        padding: 2px 2px 0;
        color: black;
    }
    .collection .name {
        padding-top: 3px;
    }
    .collection:hover .name {
        background-color: #4BBBF5;
        color: white;
    }
    .collection .progress {
        position: relative;
        width: 100%;
        height: 2px;
    }
    .collection .progress::before,
    .collection .progress::after {
        content: "";
        display: block;
        position: absolute;
        height: 100%;
        background: #C18BF2;
    }
    .collection:not(:hover) .progress {
        opacity: 0.5;
    }
    .collection .progress+.progress::before,
    .collection .progress+.progress::after {
        background: #26b2db;
    }
    .collection .progress::before {
        width: calc(var(--left) * 50%);
        left: calc(50% - var(--left) * 50%);
    }
    .collection .progress::after {
        width: calc(var(--right) * 50%);
        left: calc(50% - 1px);
        border-left: 1px solid white;
    }
</style>
