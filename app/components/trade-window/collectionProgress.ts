import type { UserCollections, Progress } from "../../services/ownedCollections";

import getInfo from "../../services/ownedCollections";

const collections = new Map<number, UserCollections>();
const loading = new Map<number, ReturnType<typeof getInfo>>();

function getCollectionInfo (userId: number) {
    if (collections.has(userId)) return collections.get(userId)!;
    if (loading.has(userId)) {
        return loading.get(userId)!.then((data) => data.userCollections);
    }
    const promise = getInfo(userId);
    loading.set(userId, promise);
    return promise.then((data) => {
        collections.set(userId, data.userCollections);
        return data.userCollections;
    });
}

async function unloadCollectionInfo (userId: number) {
    if (!loading.has(userId)) return;
    // eslint-disable-next-line unicorn/no-await-expression-member
    (await loading.get(userId))?.freeData();
    loading.delete(userId);
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
