<script context="module" lang="ts">
    import type NM from "../../utils/NMTypes";

    import NMApi from "../../utils/NMApi";
    import { loadValue, saveValue } from "../../utils/storage";
    import NameFilterSet from "../dialogs/NameFilterSet.svelte";
    import { confirm } from "../dialogs/modals";

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
        } else if (new Date(sett.discontinue_date).getTime() - Date.now() < 365*24*60*60_000) {
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
        icon?: string,
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
        holderOwns: [number, number], // the cardOwner
        oppositeOwns: [number, number], // the opposite user
        cardCount: [number, number],
        collection: [number, number],
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
    let filterSetList: Writable<FilterSet[]> = writable<FilterSet[]>([], (set) => {
        const fsets = loadValue<FilterSet[]>("filterSets", []);
        // the Infinity value cannot be stored in JSON, so
        // during serialization it gets replaced with null
        // now we need to fix it back
        fsets.forEach((fset) => {
            let prop: keyof Filters;
            for (prop in fset.filters) {
                if (prop === "hiddenSetts") continue;
                let val = fset.filters[prop];
                if (Array.isArray(val) && (val as (number|null)[]).includes(null)) {
                    (fset.filters[prop] as number[]) = val.map((num) => num === null ? Infinity : num);
                }
            }
        });
        set(fsets);
    })

    /**
     * Checks is the filters and the filter set completely match
     */
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
                if (filters.hiddenSetts.some(({ id }) => !fset.filters.hiddenSetts.find(sett => sett.id === id))) {
                    return false;
                }
            } else {
                const val1 = filters[prop];
                const val2 = fset.filters[prop];
                // prop is a range
                if (Array.isArray(val1) && Array.isArray(val2)) {
                    if (val1[0] !== val2[0] || val1[1] !== val2[1]) {
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
        const data = await new Promise<{name:string,includeSett:boolean}|null>((resolve) => {
            const dialog = new NameFilterSet({
                target: document.body,
                props: {
                    onclose(data) {
                        dialog.$destroy();
                        resolve(data);
                    },
                },
            });
        });
        if (!data) return null;
        const filterSet = {
            ...data,
            filters: {...filters},
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
        filterSet.filters.hiddenSetts.forEach(sett => {
            sett.tip = "";
        });

        filterSetList.update(fsets => {
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
    async function deleteFilterSet(filterSet: FilterSet) {
        if (await confirm("Are you sure you want to delete this filter set?")) {
            filterSetList.update(fsets => {
                fsets = fsets.filter(fs => fs !== filterSet);
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
    import type { rarityCss } from "../../utils/NMTypes";
    import type { Actors } from "../TradeWindow.svelte";
    import type { Writable } from "svelte/store";
    import type { UserCollections } from "../../services/ownedCollections";

    import { writable } from "svelte/store";
    import { createEventDispatcher, onDestroy } from "svelte";
    import ownedCollections from "../../services/ownedCollections";
    import { getProgress, makeShortTip } from "./CollectionProgress.svelte";
    import DoubleRange from "../elements/DoubleRange.svelte";
    import Toggle from "../elements/Toggle.svelte";
    import Dropdown from "../elements/Dropdown.svelte";
    import { isTrading } from "../../utils/cardsInTrades";
    import OwnedCards from "../../services/ownedCards";
    import { error, num2text } from "../../utils/utils";

    /**
     * Users involved in the trade
     */
    export let actors: Actors;
    /**
     * Whose side is it
     */
    export let cardOwner: NM.User;
    /**
     * The initial sett to select
     */
    export let sett: { id: number, name: string } | null = null;
    /**
     * filters.sett !== null
     */
    export const isSettSelected = writable(false);
    /**
     * List of hidden setts
    */
    export const hiddenSetts = writable<hiddenSett[]>([]);
    /**
     * List of active filters
     */
    export const activeFilters = writable<ActiveFilter[]>([]);

    const dispatch = createEventDispatcher();

    const RARITIES: rarityCss[] = ["common", "uncommon", "rare", "veryRare", "extraRare", "chase", "variant", "legendary"];

    const isItYou = cardOwner.id === actors.you.id;
    // ID of the user in another list
    const oppositeOwnerId = isItYou ? actors.partner.id : actors.you.id;

    const defaultFilters = {
        collection: [0, Infinity],

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
        
        oppositeOwns: [0, Infinity],
        holderOwns: [1, Infinity],
        cardCount: [1, Infinity],

        notOwned: false,
        duplicatesOnly: false,
        hiddenSetts: [],
    } as Filters;
    const holderOwnsNumbers = [1,2,3,4,5,10,20,50,100,Infinity];
    const oppositeOwnsNumbers = [0,...holderOwnsNumbers];
    const cardCountNumbers = [1,10,50,100,250,500,750,1e3,1.5e3,2e3,3e3,4e3,5e3,7.5e3,1e4,1.5e4,2e4,3e4,4e4,5e4,7.5e4,1e5,Infinity];
    const collectionNumbers = [0,1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,110,120,130,140,150,160,170,180,190,200,Infinity];

    $: defaultFilters.sett = sett;

    let filterSet = $filterSetList.find(({ name }) => name.toLowerCase() === "default") ?? null;
    let filters: Filters = filterSet 
        ? {...defaultFilters, ...filterSet.filters, sett}
        : {...defaultFilters, sett};
    // try to unset filterSet when the filters changes
    $: if (filterSet && !isEqualToFilterSet(filters, filterSet)) {
        filterSet = null;
    }
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
            if (Array.isArray(defValue) && defValue.length === 2) {
                return (value as number[])[0] !== defValue[0] || (value as number[])[1] !== defValue[1];
            }
            return value !== defValue;
        },
        ownKeys (_) {
            return Reflect.ownKeys(defaultFilters).filter(key => this.get!(filters, key, filters));
        },
    }) as Record<keyof Filters, boolean>;

    /**
     * Merges active filters with the same prefix into one
     * @param filters - the array with the filters
     * @param prefix - which filters to merge
     * @param newPrefix - the new prefix, by default used the old one
     * @returns - the array with merged filters
     */
    function mergeActiveFilters (filters: ActiveFilter[], prefix: string, newPrefix = prefix) {
        const afs = filters.filter((af) => af.prefix === prefix);
        if (afs.length === 0) return filters;
        if (afs.length === 1) {
            afs[0].prefix = newPrefix;
            return filters;
        }
        const pos = filters.indexOf(afs[0]);
        filters = filters.filter((af) => !afs.includes(af));
        const af: ActiveFilter = {
            prefix: newPrefix,
            icons: afs.flatMap(({ icons = [] }, i) => i > 0 ? ["pipe", ...icons] : icons),
            text: afs.find((af) => af.text)?.text,
            tip: afs.map(af => af.tip).join(", ").replaceAll(" cards,", ","),
        };
        filters.splice(pos, 0, af);
        return filters;
    }

    // re-filter the series list when these filters get changed
    let seriesListKey = [filters.shared, filters.collection].toString();
    // keep filters conformed and synced with the exported variables
    $: filters, conformFilters();
    function conformFilters() {
        if (filters.duplicatesOnly !== filters.holderOwns[0] > 1) {
            filters.duplicatesOnly = filters.holderOwns[0] > 1;
        }
        if (filters.notOwned !== (filters.oppositeOwns[1] === 0)) {
            filters.notOwned = filters.oppositeOwns[1] === 0
        }
        if (filters.notOwned && !filters.incompleteSetts) {
            filters.incompleteSetts = true;
        }

        if ($isSettSelected != (filters.sett !== null)) {
            $isSettSelected = filters.sett !== null;
            $hiddenSetts = $isSettSelected
                ? filters.hiddenSetts
                : [];
        }
        // re-filter the series list when these filters get changed
        let newSeriesListKey = [filters.shared, filters.incompleteSetts, filters.collection].toString();
        if (seriesListKey !== newSeriesListKey) {
            seriesListKey = newSeriesListKey;
            updateSeriesList();
        }

        let newActiveFilters: ActiveFilter[] = [];
        if (filterSet) {
            newActiveFilters.push({ 
                prefix: "FS", 
                text: filterSet.name, 
                tip: `Filter set "${filterSet.name}"` 
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
    let collections: NM.SettMetrics[] = [];
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
            let collections = oppositeCollections.getCollections();
            newCollections = newCollections
                .filter(({ id }) => collections.find(coll => id === coll.id));
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
            .sort((a, b) => a.name.replace(/^(the)? /i, "").localeCompare(b.name.replace(/^(the)? /i, "")));
    }

    /**
     * Apply the current filter set
     */
    async function setFilterSet() {
        if (!filterSet) return;

        const oldSett = filters.sett;
        filters = {...defaultFilters, ...filterSet.filters};
        if (!filterSet.includeSett) {
            filters.sett = oldSett;
        }
        $hiddenSetts = filterSet.filters.hiddenSetts;

        // update tips of the hidden setts
        if (filters.hiddenSetts.length > 0) {
            let hSetts = [] as typeof filters.hiddenSetts;
            for (const sett of filters.hiddenSetts) {
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
    async function saveNewFilterSet() {
        filterSet = await saveFilterSet(filters);
        if (filterSet) conformFilters();
    }
    /**
     * Delete the current filter set
     */
    async function deleteCurrentFilterSet() {
        if (!filterSet) return;
        if (await deleteFilterSet(filterSet)) {
            filterSet = null;
            conformFilters();
        }
    }

    /**
     * Get the filter hint
     */
    function getHint (name: keyof Filters | "sharedS" | "uncompletedS") {
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
    function rangeToString ([start, end]: [number, number], [defStart, defEnd]: [number, number]) {
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
        let full = start === end
            ? num2text(start)
            : `${num2text(start)} to ${num2text(end)}`;
        return { short, full };
    }
    /**
     * Get a data about the filter for displaying
     */
    function getFilterLabel (name: keyof Filters): ActiveFilter | null {
        const tip = getHint(name);
        const range = Array.isArray(filters[name]) && name !== "hiddenSetts"
            ? rangeToString(filters[name] as [number,number], defaultFilters[name] as [number,number])
            : { short:"", full:"" }
        switch (name) {
            case "shared": return {
                prefix: "S",
                icon: "icon-im-common-series",
                tip,
            };
            case "notOwned": return null;
            case "wishlisted": return {
                prefix: "C",
                icon: "icon-im-wishlisted",
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
                icon: `i rarity ${name}`,
                tip,
            };
            case "notInTrades": return {
                prefix: "C",
                icon: "icon-nmte-not-traded",
                tip,
            };
            case "incompleteSetts": return {
                prefix: "S",
                icons: ["unownedCard"],
                tip,
            }
            case "oopSetts": return {
                prefix: "ST",
                icon: "icon-nmte-oop",
                tip,
            };
            case "limCreditSetts": return {
                prefix: "ST",
                icon: "icon-im-limited, credit",
                tip,
            };
            case "limFreebieSetts": return {
                prefix: "ST",
                icon: "icon-im-limited, icon-im-freebie",
                tip,
            };
            case "unlimSetts": return {
                prefix: "ST",
                icon: "icon-im-unlimited",
                tip,
            };
            case "rieSetts": return {
                prefix: "ST",
                icon: "icon-nmte-rie",
                tip,
            };
            case "collection": return {
                prefix: isItYou ? "P'S" : "U'S",
                text: range.short,
                tip: `${isItYou ? actors.partner.first_name+"'s" : "Your"} series with ${range.full} collected cards`,
            };
            case "cardCount": return {
                prefix: "CC",
                text: range.short,
                tip: `Cards with the total number from ${range.full}`,
            };
            case "holderOwns": return {
                prefix: isItYou ? "U'C" : "P'C",
                text: range.short,
                tip: `${isItYou ? "Your" : actors.partner.first_name+"'s"} cards with ${range.full} copies`,
            };
            case "oppositeOwns": return {
                prefix: isItYou ? "P'C" : "U'C",
                text: range.short,
                tip: `${isItYou ? actors.partner.first_name+"'s" : "Your"} cards with ${range.full} copies`,
            };
            case "cardName": return {
                prefix: "C",
                text: filters.cardName,
                tip: `Cards which names includes "${filters.cardName}"`,
            };
            case "sett": return filters.sett ? {
                    prefix: "S",
                    text: filters.sett.name,
                    tip: `Cards only from the series "${filters.sett.name}"`,
                } : null;
            case "hiddenSetts": return null;
            default: 
                error("Unimplemented filter label", name);
                return null;
        }
    }   

    /**
     * Get the search filters
     */
    export function getQueryFilters() {
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

    function inRange(value: number, [start, end]: [number, number]) {
        return start <= value && value <= end;
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
    export async function applyFilters(prints: NM.PrintInTrade[], offer: NM.PrintInTrade[], output: Writable<NM.PrintInTrade[]>) {
        // hide the chosen prints
        prints = prints.filter((print) => !offer.find((p) => p.id === print.id))
        // hide cards from hidden series
        if (isFilterActive.hiddenSetts) {
            prints = prints.filter(({ sett_id }) => filters.hiddenSetts.every(({ id }) => id !== sett_id));
        }
        // hide cards involved in other trades
        if (isFilterActive.notInTrades) {
            prints = prints.filter((print) => {
                return isTrading(print, isItYou ? "give" : "receive", isItYou ? "print" : "card");
            });
        }
        // card hiding based on card owner's number of owned copies
        if (isFilterActive.holderOwns) {
            prints = prints.filter((print) => {
                const count = holdersCards.getPrintCount(print.id);
                return inRange(count, filters.holderOwns);
            })
        }
        // card hiding based on opposite user's number of owned copies
        if (isFilterActive.oppositeOwns) {
            prints = prints.filter((print) => {
                const count = oppositesCards.getPrintCount(print.id);
                return inRange(count, filters.oppositeOwns);
            })
        }
        // card hiding based on the total card count
        if (isFilterActive.cardCount) {
            prints = prints.filter((print) => {
                const count = print.num_prints_total;
                if (count === "unlimited") {
                    return filters.cardCount[1] === Infinity;
                }
                return inRange(count, filters.cardCount);
            })
        }
        // card hiding based on collection progress
        if (isFilterActive.collection
            || filters.incompleteSetts && !filters.notOwned
        ) {
            prints = prints.filter((print) => {
                const settId = print.sett_id;
                // assume `collections` already contains filtered series
                return collections.find(({ id }) => id === settId);
            });
        }
        // card hiding based on series type
        if (filters.oopSetts 
            || filters.limCreditSetts 
            || filters.limFreebieSetts 
            || filters.unlimSetts 
            || filters.rieSetts
        ) {
            const missingInfo = prints
                .filter((print) => !(print.sett_id in settType))
                .map((print) => getSettType(print.sett_id));
            if (missingInfo.length > 0) await Promise.all(missingInfo);
            prints = prints.filter((print) => {
                switch (settType[print.sett_id]) {
                    case "oop": return filters.oopSetts;
                    case "limCredit": return filters.limCreditSetts;
                    case "limFree": return filters.limFreebieSetts;
                    case "unlim": return filters.unlimSetts;
                    case "rie": return filters.rieSetts;
                }
            })
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
        filters.hiddenSetts.sort((a,b) => a.name.localeCompare(b.name));
        $hiddenSetts = filters.hiddenSetts;
    }
    /**
     * Remove the series from the hidden ones
     */
    export function showSett (settId: number) {
        filters.hiddenSetts = filters.hiddenSetts.filter(({ id }) => id !== settId);
        $hiddenSetts = filters.hiddenSetts;
    }
</script>

<div class="trade--edit-filters--menu">
    <h1 class="small-caps">Filter Set</h1>
    <span class="filter-row">
        <select bind:value={filterSet} on:change={setFilterSet}>
            <option value={null}>Choose a filter set</option>
            {#each $filterSetList as fs}
                <option value={fs}>{fs.name}</option>
            {/each}
        </select>
        {#if filterSet}
            <i class="icon-trash" on:click={deleteCurrentFilterSet}></i>
        {:else}
            <i class="icon-nmte-save" on:click={saveNewFilterSet}></i>
        {/if}
    </span>

    <h1 class="small-caps">Series</h1>
    <span class="filter-row">
        <DoubleRange list={collectionNumbers} bind:value={filters.collection} title="{isItYou ? actors.partner.first_name : "You"} collected"/>
        <i class="icon-nmte-reset" on:click={() => filters.collection = defaultFilters.collection}/>
    </span>
    <span class="row">
        <PushSwitch bind:value={filters.shared} icon="commonSeries" hint={getHint("shared")}/>
        <PushSwitch bind:value={filters.incompleteSetts} icon="unownedCard" hint={getHint("incompleteSetts")}
            on:change={() => {
                if (filters.incompleteSetts && filters.notOwned) {
                    filters.oppositeOwns = defaultFilters.oppositeOwns;
                    filters.incompleteSetts = false;
                }
            }}
        />
        <Dropdown list={collections} bind:value={filters.sett} let:item
            hint={collections.length ? "Choose a Series" : "Loading series..."}
        >
            <!-- if collections list is loaded then user collections loaded too -->
            {@const coll1 = (isItYou ? oppositeCollections : ownerCollections).getProgress(item.id)}
            {@const coll2 = (isItYou ? ownerCollections : oppositeCollections).getProgress(item.id)}
            <div class="collection">
                <div class="name">{item.name}</div>
                <div class="progress" 
                    style:--left={coll1 ? coll1.core.owned/coll1.core.count : 0} 
                    style:--right={coll2 ? coll2.core.owned/coll2.core.count : 0} 
                />
                {#if (coll1 ?? coll2)?.core.count !== (coll1 ?? coll2)?.total.count}
                    <div class="progress" 
                        style:--left={coll1 ? (coll1.chase.owned+coll1.variant.owned+coll1.legendary.owned)/(coll1.chase.count+coll1.variant.count+coll1.legendary.count) : 0} 
                        style:--right={coll2 ? (coll2.chase.owned+coll2.variant.owned+coll2.legendary.owned)/(coll2.chase.count+coll2.variant.count+coll2.legendary.count) : 0} 
                    />
                {/if}
            </div>
        </Dropdown> 
        <i class="icon-nmte-reset" on:click={() => filters.sett = null}/>
    </span>
    <span class="filter-row filter-group">
        <Toggle bind:value={filters.oopSetts} icon="icon-nmte-oop" hint={getHint("oopSetts")}/>
        <Toggle bind:value={filters.limCreditSetts} icon="icon-im-limited" hint={getHint("limCreditSetts")}>
            <i class="credit"></i>
        </Toggle>
        <Toggle bind:value={filters.limFreebieSetts} icon="icon-im-limited" hint={getHint("limFreebieSetts")}>
            <i class="icon-im-freebie"></i>
        </Toggle>
        <Toggle bind:value={filters.unlimSetts} icon="icon-im-unlimited" hint={getHint("unlimSetts")} />
        <Toggle bind:value={filters.rieSetts} icon="icon-nmte-rie" hint={getHint("rieSetts")}/>
    </span>
    
    <h1 class="small-caps">Cards</h1>
    <span class="filter-row">
        <Toggle bind:value={filters.wishlisted} icon={filters.wishlisted ? "icon-im-wishlisted" : "icon-im-wishlist"} hint={getHint("wishlisted")}/>
        <!-- <Toggle bind:value={filters.shared} icon="icon-im-common-series" hint={getHint("shared")}/> -->
        <Toggle bind:value={filters.notInTrades} icon="icon-nmte-not-traded" hint={getHint("notInTrades")}/>
        <input type=search class="search small search-card" placeholder="Search by card name" bind:value={filters.cardName}>
        <i class="icon-nmte-reset" on:click={() => filters.cardName = ""}/>
    </span>
    <span class="filter-row filter-group">
        {#each RARITIES as rarity}
            <Toggle bind:value={filters[rarity]} icon="i rarity {rarity}" hint={getHint(rarity)} />
        {/each}
    </span> 
    <span class="filter-row">
        <DoubleRange list={holderOwnsNumbers} bind:value={filters.holderOwns} title={isItYou ? "You own" : `${actors.partner.first_name} owns`}/>
        <Toggle value={filters.duplicatesOnly} hint={getHint("duplicatesOnly")}
            on:change={() => filters.holderOwns = filters.duplicatesOnly ? defaultFilters.holderOwns : [2, Infinity]} 
        >2+</Toggle>
    </span>
    <span class="filter-row">
        <DoubleRange list={oppositeOwnsNumbers} bind:value={filters.oppositeOwns} title={isItYou ? `${actors.partner.first_name} owns` : "You own"}/>
        <Toggle value={filters.notOwned} icon="icon-im-unowned" hint={getHint("notOwned")}
            on:change={() => filters.oppositeOwns = filters.notOwned ? defaultFilters.oppositeOwns : [0, 0]} 
        />
    </span>
    <span class="filter-row">
        <DoubleRange list={cardCountNumbers} bind:value={filters.cardCount} title="Card count"/>
        <i class="icon-nmte-reset" on:click={() => filters.cardCount = defaultFilters.cardCount}/>
    </span>
</div>

<style>
    .trade--edit-filters--menu {
        background: white;
        padding: 10px;
        border: 1px solid #d6d6d6;
        border-radius: 10px;
        box-shadow: 0 0 20px #0002;
        min-width: 300px;
        width: 350px;
        font-size: 12px;
        line-height: 1em;
        color: #5f5668;
    }
    .trade--edit-filters--menu h1 {
        text-align: center;
        padding: 5px 5px;
        margin: 0 -10px;
        color: #2c2830;
    }
    .trade--edit-filters--menu h1:not(:first-of-type) {
        margin-top: 5px;
        padding-top: 10px;
        border-top: 1px solid #d6d6d6;
    }    
    
    .filter-row {
        display: flex;
        align-items: baseline;
        width: 100%;
        margin: 5px 0 0 0;
        gap: 0.5em;
    }
    .filter-row > :global(*) {
        flex-grow: 1;
        margin-left: 0;
        margin-right: 0;
    }

    .filter-row :global(.slider),
    .filter-row :global(.container),
    .filter-row select,
    .filter-row input[type=search] {
        flex-grow: 500;
    }
    .filter-row select {
        border: 1px solid #ccc;
        background-color: white;
        border-radius: 3px;
    }
    .filter-row :global(input[type=search]) {
        height: 28px;
        margin: 0;    
        padding: 7.5px 11.25px;
        font-size: 11px;
    }
    .filter-row.filter-group {
        gap: 0;
    }
  
    .filter-row.filter-group > :global(*) {
        padding: 6.5px 0;
        margin: 0;
    }
   
    .trade--edit-filters--menu :global(.i.rarity) {
        width: 16px;
        height: 16px;
        margin: -5px;
    }
    .trade--edit-filters--menu .credit {
        width: 12px;
        height: 12px;
    }
    .trade--edit-filters--menu .icon-trash {
        cursor: pointer;
    }
    .trade--edit-filters--menu :global(.btn [class*="icon-"]::before) {
        color: #8b8a8c;
    }
    .trade--edit-filters--menu :global(.btn.selected [class*="icon-"]::before) {
        color: #1482A1;
    }
    .trade--edit-filters--menu :global(.btn .text-icon) {
        min-width: 12px;
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
