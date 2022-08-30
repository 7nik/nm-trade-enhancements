<script context="module" lang="ts">
    import type { UserCollections, Progress } from "../../services/ownedCollections";

    import { writable } from "svelte/store";
    import getInfo from "../../services/ownedCollections";

    const collections: Record<number, UserCollections> = {};
    const dataChanges = writable(0);
    const loading: Record<number, ReturnType<typeof getInfo>> = {};

    async function preloadCollectionInfo (userId: number) {
        loading[userId] = getInfo(userId);
        collections[userId] = (await loading[userId]).userCollections;
        dataChanges.update(n => n + 1);
    }
    async function unloadCollectionInfo (userId: number) {
        (await loading[userId])?.freeData();
        delete loading[userId];
        delete collections[userId];
    }
    function getProgress (userId: number, settId: number) {
        if (collections[userId]) {
            return collections[userId].getProgress(settId);
        }
        if (!loading[userId]) preloadCollectionInfo(userId);
        return loading[userId]
            .then(() => collections[userId]?.getProgress(settId));
    }
    function makeLongTip (progress: Progress) {
        const types = ["core", "chase", "variant", "legendary"] as ("core"|"chase"|"variant"|"legendary")[];
        const data = types.map((rarity) =>
            progress[rarity].count
                ? `${progress[rarity].owned}/${progress[rarity].count}&nbsp;<i class="i ${rarity}"></i>`
                : ""
        ).filter(s => s);
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
        preloadCollectionInfo, 
        unloadCollectionInfo, 
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
    
    import tippy from "tippy.js";

    export let user: NM.User;
    /**
     * The series ID of which the progress will be displayed
     */
    export let settId: number;
    
    let ready = false;
    let progress = getProgress(user.id, settId);
    let shortTip: string;
    let longTip: string;
    let link: string;

    function setTips(progress: Progress | null) {
        if (!progress) {
            shortTip = longTip = link = "";
        } else {
            shortTip = makeShortTip(progress);
            longTip = makeLongTip(progress);
            link = `${progress.permalink}/user${user.links.profile}/cards/`
        }
        ready = true;
    }

    if (progress instanceof Promise) {
        progress.then(setTips);
    } else {
        setTips(progress);
    }
</script>

<svelte:options immutable />

<span class:text-warning={ready && !shortTip}>
    {user.first_name}:
    {#if !ready}
        ?
    {:else if !shortTip}
        —
    {:else}
        <a  class="href-link" href={link} target="_blank" 
            use:tippy={{ allowHTML: true, content: longTip, theme: "tooltip" }}
        >
            {shortTip}
        </a>
    {/if}
</span>
