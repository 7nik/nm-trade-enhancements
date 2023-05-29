import type NM from "../utils/NMTypes";
import type { fullURL } from "../utils/NMTypes";

import NMApi from "../utils/NMApi";
import { debug, LazyMap } from "../utils/utils";
import currentUser from "./currentUser";

type MetricsMap = Record<number, NM.SettMetrics>;

const data = new LazyMap<number, MetricsMap>(300_000);
const loading = new Map<number, Promise<NM.SettMetrics[]>>();

/**
 * Fetches the info about collections that the user owns
 * @param userId - the collections owner ID
 * @returns promise when the data get loaded
 */
async function loadOwnership (userId: number) {
    if (data.has(userId)) {
        // cancel removing
        data.get(userId);
        return;
    }
    if (loading.has(userId)) {
        await loading.get(userId);
        return;
    }
    const promise = NMApi.user.ownedSettsMetrics(userId);
    loading.set(userId, promise);
    try {
        const setts = await loading.get(userId)!;
        const map: MetricsMap = {};
        for (const sett of setts) {
            map[sett.id] = sett;
        }
        data.set(userId, map);
    } finally {
        loading.delete(userId);
    }
}

/**
 * Frees the user's info
 * @param userId - the user ID
 */
async function removeOwnership (userId: number) {
    if (userId === currentUser.id) return;
    if (loading.has(userId)) await loading.get(userId);
    if (data.delete(userId)) {
        debug(userId, "'s collections will be unloaded");
    }
}

export type Progress = {
    name: string,
    permalink: fullURL,
    core: {
        count: number,
        owned: number,
    },
    chase: {
        count: number,
        owned: number,
    },
    variant: {
        count: number,
        owned: number,
    },
    legendary: {
        count: number,
        owned: number,
    },
    total: {
        count: number,
        owned: number,
    },
}

class UserCollections {
    #promise: Promise<void> | null;
    #collections: MetricsMap;
    #userId;

    constructor (userId: number) {
        this.#userId = userId;
        this.#collections = {};
        this.#promise = loadOwnership(userId).then(() => {
            this.#collections = data.get(userId)!;
            this.#promise = null;
        });
    }

    /**
     * Whether the data is still loading
     */
    get isLoading () {
        return this.#promise !== null;
    }

    /**
     * Method to wait for finishing the loading
     * @returns Promise of completing the data loading
     */
    waitLoading () {
        return this.#promise ?? Promise.resolve();
    }

    freeUp () {
        removeOwnership(this.#userId);
    }

    /**
     * Get the user's collection as a list
     */
    getCollections () {
        return Object.values(this.#collections);
    }

    /**
     * Get info about collection progress
     * @param settId - series ID of the collection
     */
    getProgress (settId: number): Progress | null {
        if (!this.#collections[settId]) return null;
        const {
            name,
            links: { permalink },
            core_piece_count: coreCount,
            chase_piece_count: chaseCount,
            variant_piece_count: variantCount,
            legendary_piece_count: legendaryCount,
            owned_metrics: {
                owned_core_piece_count: coreOwned,
                owned_chase_piece_count: chaseOwned,
                owned_variant_piece_count: variantOwned,
                owned_legendary_piece_count: legendaryOwned,
            },
        } = this.#collections[settId];
        return {
            name,
            permalink,
            core: {
                count: coreCount,
                owned: coreOwned,
            },
            chase: {
                count: chaseCount,
                owned: chaseOwned,
            },
            variant: {
                count: variantCount,
                owned: variantOwned,
            },
            legendary: {
                count: legendaryCount,
                owned: legendaryOwned,
            },
            total: {
                count: coreCount + chaseCount + variantCount + legendaryCount,
                owned: coreOwned + chaseOwned + variantOwned + legendaryOwned,
            },
        };
    }
}

export default UserCollections;
