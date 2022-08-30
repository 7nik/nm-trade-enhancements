import type NM from "../utils/NMTypes";

import NMApi from "../utils/NMApi";

const data: Record<number, Record<number,NM.SettMetrics>> = {};
const loading: Record<number, Promise<NM.SettMetrics[]>> = {};
const removing: Record<number, NodeJS.Timeout> = {};

/**
 * Fetches the info about collections that the user owns
 * @param userId - the collections owner ID
 * @returns promise when the data get loaded
 */
async function loadOwnership (userId: number) {
    if (userId in data) {
        // cancel removing
        if (userId in removing) {
            clearTimeout(removing[userId]);
        }
        return;
    }
    if (userId in loading) {
        await loading[userId];
        return;
    }
    loading[userId] = NMApi.user.ownedSettsMetrics(userId);
    try {
        const setts = await loading[userId];
        data[userId] = {};
        for (const sett of setts) {
            data[userId][sett.id] = sett;
        }
    } finally {
        delete loading[userId];
    }
}
/**
 * Frees the user's info
 * @param userId - the user ID
 */
async function removeOwnership (userId: number) {
    if (userId in loading) await loading[userId];
    if (userId in removing) {
        clearTimeout(removing[userId]);
    }
    removing[userId] = setTimeout(() => {
        delete data[userId];
        delete removing[userId];
    }, 300_000);
}

// type Progress = {
//     name: string,
//     permalink: string,
//     coreCount: number,
//     chaseCount: number,
//     variantCount: number,
//     legendaryCount: number,
//     totalCount: number,
//     coreOwned: number,
//     chaseOwned: number,
//     variantOwned: number,
//     legendaryOwned: number,
//     totalOwned: number,
// }
type Progress = {
    name: string,
    permalink: string,
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
    private collections;
    constructor (collections: Record<number, NM.SettMetrics>) {
        this.collections = collections;
    }
    getCollections () {
        return Object.values(this.collections);
    }
    /**
     * Get info about collection progress
     * @param settId - series ID of the collection
     */
    getProgress (settId: number): Progress | null {
        if (!this.collections[settId]) return null;
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
        } = this.collections[settId];
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

export default async function (userId: number) {
    if (!(userId in data)) await loadOwnership(userId);
    return {
        userCollections: new UserCollections(data[userId]),
        freeData: removeOwnership.bind(null, userId),
    };
}
export type { UserCollections, Progress }
