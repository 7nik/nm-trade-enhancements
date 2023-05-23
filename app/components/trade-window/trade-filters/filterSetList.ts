import type { FilterSet, Filters } from "./filterUtils";
import type { Writable } from "svelte/store";

import { get, writable } from "svelte/store";
import { loadValue, saveValue } from "../../../utils/storage";
import { confirm, createDialog } from "../../dialogs/modals";
import NameFilterSet from "../../dialogs/NameFilterSet.svelte";

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

export default {
    subscribe: filterSetList.subscribe,
    add: saveFilterSet,
    remove: deleteFilterSet,
    find: (filterName: string) => {
        filterName = filterName.toLowerCase();
        return get(filterSetList)
            .find(({ name }) => name.toLowerCase() === filterName) ?? null;
    },
};
