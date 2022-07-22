import type NM from "../utils/NMTypes";

import { loadValue, saveValue } from "../utils/storage";
import { forAllElements, getScope } from "../utils/utils";
import NMApi from "../utils/NMApi";

let numberUpdated: Promise<boolean> | null = null;
let realFreebiesNumber = loadValue("realFreebiesNumber", 3);

/**
 * Check the number of freebies in the series and updates the value in the storage
 * @param settId - series for checking
 * @returns whether the `realFreebiesNumber` was changed
 */
async function updateFreebieNumber(settId: number): Promise<boolean> {
    const packs = await NMApi.sett.packTiers(settId);
    const freebieNumber = packs
        .filter((pack) => pack.currency === "freebie")
        // eslint-disable-next-line unicorn/no-reduce
        .reduce((num, pack) => num + pack.count, 0);
    if (realFreebiesNumber !== freebieNumber) {
        realFreebiesNumber = freebieNumber;
        saveValue("realFreebiesNumber", freebieNumber);
        return true;
    }
    return false;
}

/**
 * Fixes the Open Pack button color for series with additional freebie packs
 * @param  {HTMLElement} button - <span.collect-it-button>
 */
async function fixFreebieCount (button: HTMLElement) {
    const { sett } = getScope<{ sett: NM.Sett}>(button);
    // skip discontinued, unreleased, limited
    if (sett.discontinued
        || new Date(sett.released).getTime() > Date.now()
        || sett.edition_size === "limited"
    ) {
        return;
    }
    // assume all series with extra freebies packs have the same number of them
    // use value from the previous visit
    if (realFreebiesNumber !== 3) {
        sett.daily_freebies = realFreebiesNumber;
    }
    // get the current number of freebies
    if (!numberUpdated) {
        numberUpdated = updateFreebieNumber(sett.id);
    }
    if (await numberUpdated) {
        sett.daily_freebies = realFreebiesNumber;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    forAllElements(document, "span.collect-it.collect-it-button", fixFreebieCount);
});
