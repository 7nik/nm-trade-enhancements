import type NM from "../utils/NMTypes";

import NMApi from "../utils/NMApi";
import { debug, LazyMap } from "../utils/utils";
import currentUser from "./currentUser";

const data = new LazyMap<number, Set<number>>(300_000);
const loading = new Map<number, Promise<NM.Unmerged.FavoriteSetts["results"]>>();

/**
 * Fetches the list of the favorited setts by the user
 * @param userId - the user ID
 * @returns promise when the data get loaded
 */
async function loadData (userId: number) {
    if (data.has(userId)) {
        // cancel removing
        data.get(userId);
        return;
    }
    if (loading.has(userId)) {
        await loading.get(userId);
        return;
    }
    const promise = NMApi.sett.favoriteSetts(userId);
    loading.set(userId, promise);
    try {
        const setts = await loading.get(userId)!;
        const set = new Set(setts.map((s) => s.id));
        data.set(userId, set);
    } finally {
        loading.delete(userId);
    }
}

/**
 * Frees the user's info
 * @param userId - the user ID
 */
async function removeData (userId: number) {
    if (userId === currentUser.id) return;
    if (loading.has(userId)) await loading.get(userId);
    if (data.delete(userId)) {
        debug(userId, "'s favs will be removed");
    }
}

class FavoritedSetts {
    #promise: Promise<void> | null;
    #setts;

    constructor (userId: number) {
        this.#setts = new Set();
        this.#promise = loadData(userId).then(() => {
            this.#setts = data.get(userId)!;
            this.#promise = null;
            // for now there is no reason to keep data in the cache
            removeData(userId);
        });
    }

    /**
     * Method to wait for finishing the loading
     * @returns Promise of completing the data loading
     */
    waitLoading () {
        return this.#promise ?? Promise.resolve();
    }

    /**
     * Check whether the user has favorited the sett
     * @param settId - the sett's ID
     */
    has (settId: number) {
        return this.#setts.has(settId);
    }
}

export default FavoritedSetts;
