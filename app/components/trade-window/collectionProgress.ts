import type { Progress } from "../../services/ownedCollections";

import OwnedCollections from "../../services/ownedCollections";

const collections = new Map<number, OwnedCollections>();

function getCollectionInfo (userId: number) {
    let collection = collections.get(userId);
    if (!collection) {
        collection = new OwnedCollections(userId);
        collections.set(userId, collection);
    }
    if (!collection.isLoading) {
        return collection;
    }
    return collection.waitLoading().then(() => collection!);
}

async function unloadCollectionInfo (userId: number) {
    collections.get(userId)?.freeUp();
    collections.delete(userId);
}

function getProgress (userId: number, settId: number) {
    const collection = getCollectionInfo(userId);
    if (collection instanceof Promise) {
        return collection.then((data) => data.getProgress(settId));
    }
    return collection.getProgress(settId);
}

function makeLongTip (progress: Progress) {
    const types = ["core", "chase", "variant", "legendary"] as const;
    const data = types.map((rarity) => (progress[rarity].count
        ? `${progress[rarity].owned}/${progress[rarity].count}&nbsp;<i class="i ${rarity}"></i>`
        : ""
    )).filter(Boolean);
    let html = data.join(`<i class="pipe"></i>`);
    // if here are all 4 types then locate them in 2 rows
    if (data.length === 4) {
        html = html.replace(` chase"></i><i class="pipe"></i>`, ` chase"></i><br>`);
    }
    return html;
}

function makeShortTip (progress: Progress) {
    return `${progress.total.owned}/${progress.total.count}`;
}

export {
    getCollectionInfo as loadCollectionInfo,
    unloadCollectionInfo,
    getProgress,
    makeShortTip,
    makeLongTip,
};
