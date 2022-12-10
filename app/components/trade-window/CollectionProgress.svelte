<script context="module" lang="ts">
    import type { UserCollections, Progress } from "../../services/ownedCollections";

    import getInfo from "../../services/ownedCollections";

    const collections = new Map<number, UserCollections>();
    const loading = new Map<number, ReturnType<typeof getInfo>>();
    const collectionUsage: Record<number, number> = {};

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
            html = html.replace(`"chase"></i><i class="pipe"></i>`, `"chase"></i><br>`);
        }
        return html;
    }
    function makeShortTip (progress: Progress) {
        return `${progress.total.owned}/${progress.total.count}`;
    }

    export {
        getProgress,
        makeShortTip,
        makeLongTip,
    };
</script>
<!-- @component
    Render a collection progress with attached tooltip.

    Also, provides methods to generate collection progress text.
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { onDestroy } from "svelte";
    import { firstName } from "../../services/user";
    import { htmlTip } from "../actions/tip";

    export let user: NM.User;
    /**
     * The series ID of which the progress will be displayed
     */
    export let settId: number;

    const progress = getProgress(user.id, settId);
    let ready = false;
    let shortTip: string;
    let longTip: string;
    let link: string;

    function setTips (p: Progress | null) {
        if (p) {
            shortTip = makeShortTip(p);
            longTip = makeLongTip(p);
            link = `${p.permalink}/user${user.links.profile}/cards/`;
        } else {
            shortTip = "";
            longTip = "";
            link = "";
        }
        ready = true;
    }

    if (progress instanceof Promise) {
        progress.then(setTips);
    } else {
        setTips(progress);
    }

    collectionUsage[user.id] = 1 + (collectionUsage[user.id] ?? 0);
    onDestroy(() => {
        collectionUsage[user.id] -= 1;
        if (collectionUsage[user.id] === 0) {
            unloadCollectionInfo(user.id);
        }
    });
</script>

<svelte:options immutable />

<span class:text-warning={ready && !shortTip}>
    {firstName(user)}:
    {#if !ready}
        ?
    {:else if !shortTip}
        —
    {:else}
        <a href={link} target="_blank" rel="noreferrer"
            use:htmlTip={longTip}
        >
            {shortTip}
        </a>
    {/if}
</span>

<style>
    a {
        color: #0d9ce6 !important;
        text-decoration: none;
    }
    .text-warning {
        color: #E7327C;
    }
</style>
