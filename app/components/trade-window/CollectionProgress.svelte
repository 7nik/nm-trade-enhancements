<!-- @component
    Render a collection progress with attached tooltip.

    Also, provides methods to generate collection progress text.
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { Progress } from "../../services/ownedCollections";
    import { firstName } from "../../services/user";
    import { htmlTip } from "../actions/tip";
    import { getProgress, makeLongTip, makeShortTip } from "./collectionProgress";

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
