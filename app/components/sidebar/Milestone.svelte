<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { num2text } from "../../utils/utils";
    import Icon from "../elements/Icon.svelte";
    import RarityText from "../elements/RarityText.svelte";
    import Time from "../elements/Time.svelte";
    import ImgAsset from "../parts/ImgAsset.svelte";

    /**
     * The milestone data
     */
    export let milestone: NM.Milestone;

    function gotoPackOpenPage (settId: number) {
        // in fact, it should open the pack opening layer
        // but there are too much to implement
        window.open(`https://neonmob.com/series/${settId}`);
    }
</script>

<svelte:options immutable />

<article on:click={() => gotoPackOpenPage(milestone.sett.id)}>
    <a target="_self" href={milestone.sett.public_url}>
        <ImgAsset image={milestone.sett.sett_assets.small.url}
            alt="{milestone.sett.name}'s cover"
            icon={milestone.sett.difficulty.class_name}
        />
    </a>
    <section>
        <header>{milestone.sett.name}</header>
        <div>
            <span class="default">
                By <span class="creator">{milestone.sett.creator.name}</span>
            </span>
            <span class="hovered">
                {#if milestone.completed_date}
                    <Time stamp={milestone.completed_date} />
                {:else if (milestone.discontinue_date)}
                    <Time stamp={milestone.discontinue_date} />
                    to collect
                {/if}
            </span>
        </div>
    </section>
    <div class="badge">
        <div class="default">
            <Icon icon={milestone.css_class} />
            <RarityText rarity={milestone.css_class}>
                {milestone.owned}/{milestone.total}
            </RarityText>
        </div>
        <div class="hovered">
            <Icon icon="carat" />
            {num2text(milestone.reward, 0, false)}
        </div>
    </div>
</article>

<style>
    article {
        padding: 10px;
        gap: 0 10px;
        text-decoration: none;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        cursor: pointer;
        font-size: 15px;
        font-weight: 400;
        overflow: hidden;
    }
    article:hover {
        background: #f4f4f4;
    }
    :global(article) + article {
        border-top: 1px solid #efefef;
    }
    article:not(:hover) .hovered, article:hover .default {
        display: none;
    }
    a {
        width: 40px;
        border-radius: 8px;
        overflow: hidden;
    }
    section {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        color: #2c2830;
    }
    section div {
        font-size: 13px;
        color: #8A7F95;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    section div span :global(time) {
        font-size: 13px;
        font-style: normal;
    }
    .creator {
        color: #109DE6;
    }
    .badge {
        width: 24px;
        margin-bottom: 4px;
    }
    .badge > * {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        font-size: 12px;
        text-transform: uppercase;
    }
    .badge .hovered {
        font-weight: 500;
        color: #085B85;
    }
</style>
