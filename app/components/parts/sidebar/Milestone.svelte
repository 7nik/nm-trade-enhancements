<script lang="ts">
    import type NM from "../../../utils/NMTypes";

    import { num2text } from "../../../utils/utils";
    import { timeAgo, timeTil } from "../../../utils/date";
    import SettAsset from "../SettAsset.svelte";

    export let milestone: NM.Milestone;
    export let gotoPackOpenPage: (settId: number) => void;
</script>

<svelte:options immutable />

<li>
    <span on:click={() => gotoPackOpenPage(milestone.sett.id)}>
        <span class="milestone-series">
            <span class="thumb">
                <SettAsset sett={milestone.sett} size="small"/>
            </span>
            <span class="info">
                <span class="text-fav-set">{milestone.sett.name}</span>
                <br>
                <small class="creator-info">
                    <span>By</span>
                    {#if milestone.sett.creator.pro_status}
                        <span title="Pro Collector" class="svg-pro-icon tip"></span>
                    {/if}
                    <span class="creator-name">{milestone.sett.creator.name}</span>
                </small>
                <span class="discontinue-info">
                    {#if milestone.completed_date}
                        {timeAgo(milestone.completed_date)}
                    {:else if (milestone.discontinue_date)}
                        {timeTil(milestone.discontinue_date, false, 24)} to collect
                    {/if}
                </span>
            </span>
        </span>
        <span class="badges">
            <span class="rarity creator-info">
                <i class="i {milestone.css_class}"></i>
                <span class="rarity-count">
                    <span class="text text-rarity-{milestone.css_class}">
                        {milestone.owned}/{milestone.total}
                    </span>
                </span>
            </span>
            <span class="rarity discontinue-info">
                <i class="i carat medium"></i>
                <span class="rarity-count">
                    <span class="text">{num2text(milestone.reward, 0)}</span>
                </span>
            </span>
        </span>
    </span>
</li>
    
<style>
    li > span {
        width: 100%;
    }
</style>
