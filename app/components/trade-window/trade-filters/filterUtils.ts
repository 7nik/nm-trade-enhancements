import type { IconName } from "app/components/elements/Icon.svelte";
import type NM from "app/utils/NMTypes";

import { firstNamePossessive } from "app/services/user";
import NMApi from "app/utils/NMApi";
import { error, num2text } from "app/utils/utils";

export type Range = [number, number];
export type HiddenSett = {
    id: number, // sett ID
    name: string, // sett name
    tip: string, // tooltip with collection progress
}
export type ActiveFilterLabel = {
    prefix: string,
    icons?: (IconName | "oop" | "rie" | "pipe")[],
    text?: string,
    tip: string,
}
export type Filters = {
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
    hiddenSetts: HiddenSett[],
    holderOwns: Range, // the cardOwner
    oppositeOwns: Range, // the opposite user
    cardCount: Range,
    collection: Range,
    oopSetts: boolean,
    limCreditSetts: boolean,
    limFreebieSetts: boolean,
    unlimSetts: boolean,
    rieSetts: boolean,
    favoritedCards: boolean,
    favoritedSetts: boolean,
    /**
     * 0 - off, 1 - no trading cards, 2 - only trading cards
     */
    tradingCards: 0|1|2,
}
export type FilterSet = {
    name: string,
    includeSett: boolean,
    filters: Filters,
}

export const DEFAULT_FILTERS = {
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
    favoritedCards: false,
    favoritedSetts: false,
    tradingCards: 0,
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

/**
 * Checks whether the value is a Range
 */
export function isRange (val: any): val is Range {
    return Array.isArray(val) && val.length === 2;
}

/**
 * Checks whether the passed ranges are identical
 */
export function areRangesEqual (r1: Range, r2: Range) {
    return r1[0] === r2[0] && r1[1] === r2[1];
}

/**
 * Checks whether the number is withing the passed range
 */
export function inRange (number: number, [start, end]: Range) {
    return start <= number && number <= end;
}

/**
 * Checks is the filters and the filter set completely match
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function isEqualToFilterSet (filters: Filters, fset: FilterSet) {
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
            const val2 = fset.filters[prop] ?? DEFAULT_FILTERS[prop];
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

type SettType = "oop"|"limCredit"|"limFree"|"unlim"|"rie";
const settType: Record<number, SettType> = {};
const loading: Record<number, Promise<NM.Sett>> = {};
/**
 * Get the sett type
 */
export function getSettType (settId: number) {
    if (settId in settType) return settType[settId];
    const promise = settId in loading
        ? loading[settId]
        : (loading[settId] = NMApi.sett.get(settId));
    return promise.then((sett) => {
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
    });
}

/**
 * Get a data about the filter for displaying
 * @param name - name of the filter
 * @param value - the filter value
 * @param isItYou - it's for the current user, not partner
 * @param partner - the trade partner
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function getFilterLabel<N extends keyof Filters> (
    name: N,
    value: Filters[N],
    isItYou: boolean,
    partner: NM.User,
): ActiveFilterLabel | null {
    const tip = getFilterHint(name, isItYou, partner);
    const range = isRange(value) && name !== "hiddenSetts"
        ? rangeToString(value as Range, DEFAULT_FILTERS[name] as Range)
        : { short: "", full: "" };
    switch (name) {
        case "shared": return {
            prefix: "S",
            icons: ["commonSeries"],
            tip,
        };
        case "notOwned": return null;
        case "favoritedCards": return {
            prefix: "C",
            icons: ["liked"],
            tip,
        };
        case "favoritedSetts": return {
            prefix: "S",
            icons: ["liked"],
            tip,
        };
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
        case "tradingCards": return {
            prefix: "C",
            icons: [value === 1 ? "no-trading" : "trading-only"],
            tip: value === 1
                ? "Hide cards involved in trades"
                : "Show only cards involved in trades",
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
            tip: `${firstNamePossessive(partner, true)} series with ${range.full} collected cards`,
        };
        case "cardCount": return {
            prefix: "CC",
            text: range.short,
            tip: `Cards with the total number from ${range.full}`,
        };
        case "holderOwns": return {
            prefix: isItYou ? "U'C" : "P'C",
            text: range.short,
            tip: `${firstNamePossessive(partner, true)} cards with ${range.full} copies`,
        };
        case "oppositeOwns": return {
            prefix: isItYou ? "P'C" : "U'C",
            text: range.short,
            tip: `${firstNamePossessive(partner, true)} cards with ${range.full} copies`,
        };
        case "cardName": return {
            prefix: "C",
            text: value as string,
            tip: `Cards which names includes "${value}"`,
        };
        case "sett": return value
            ? {
                prefix: "S",
                text: (value as Filters["sett"])!.name,
                tip: `Cards only from the series "${(value as Filters["sett"])!.name}"`,
            }
            : null;
        case "hiddenSetts": return null;
        default:
            error("Unimplemented filter label", name);
            return null;
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
 * Get the filter hint
 * @param name - name of the filter
 * @param isItYou - it's for the current user, not partner
 * @param partner - the trade partner
 */
export function getFilterHint (name: keyof Filters, isItYou: boolean, partner: NM.User) {
    switch (name) {
        case "shared": return isItYou
            ? `Series that both you and ${partner.first_name} are collecting`
            : `Series that both ${partner.first_name} and you are collecting`;
        case "notOwned": return isItYou
            ? `Cards ${partner.first_name} doesn't own`
            : "Cards you don't own";
        case "incompleteSetts": return isItYou
            ? `Series that ${partner.first_name} hasn't completed`
            : "Series that you haven't completed";
        case "favoritedSetts": return isItYou
            ? `Series ${partner.first_name} favorited`
            : "Series you favorited";
        case "wishlisted": return isItYou
            ? `Cards ${partner.first_name} wishlisted`
            : "Cards you wishlisted";
        case "favoritedCards": return isItYou
            ? `Cards ${partner.first_name} favorited`
            : "Cards you favorited";
        case "duplicatesOnly": return isItYou
            ? "Cards you own multiples of"
            : `Cards ${partner.first_name} owns multiples of`;
        case "common": return "Common cards";
        case "uncommon": return "Uncommon cards";
        case "rare": return "Rare cards";
        case "veryRare": return "Very Rare cards";
        case "extraRare": return "Extra Rare cards";
        case "chase": return "Chase cards";
        case "variant": return "Variant cards";
        case "legendary": return "Legendary cards";
        case "tradingCards": return "Cards involved in your trades";
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
 * Get the search filters
 */
export function filters2query (filters: Filters, oppositeOwnerId: number) {
    return {
        cardId: null,
        cardName: filters.cardName || null,
        sharedWith: !filters.sett && filters.shared ? oppositeOwnerId : null,
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
        // extra
        favoritedBy: filters.favoritedCards ? oppositeOwnerId : null,
        tradingCards: filters.tradingCards === 2,
    };
}
