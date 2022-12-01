<!-- @component
    A window with the reward for the completing the core
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import currentUser from "../../services/currentUser";
    import NMApi from "../../utils/NMApi";
    import { ordinal } from "../../utils/utils";
    import Icon from "../elements/Icon.svelte";
    import EarnedCarats from "../parts/EarnedCarats.svelte";
    import ImgAsset from "../parts/ImgAsset.svelte";
    import RewardWindow from "./RewardWindow.svelte";

    /**
     * The reward data
     */
    export let data: NM.Reward;

    let suggestions: NM.Sett[] = [];
    NMApi.user.suggestedSetts(currentUser.id, data.sett.id).then((setts) => {
        suggestions = setts;
    });

    let frame = 1;

    function showSecondFrame (ev: Event) {
        if (frame === 1) {
            frame = 2;
            // cancel closing
            ev.preventDefault();
        }
    }
</script>

<RewardWindow on:closed on:closing={showSecondFrame}
    title="Core Series Completed!"
    button={frame === 1 ? "Claim reward" : "Close"}
>
    {#if frame === 1}
        <h6>Awesome Job!</h6>
        <p>
            You've completed the base set of
            <br>
            {data.sett.name}
        </p>
        <a target="_self" href={data.sett.public_url}>
            <ImgAsset image={data.sett.sett_assets.small.url}
                alt="{data.sett.name}'s cover"
                icon={data.sett.difficulty.class_name}
            />
        </a>
        <section class="stats">
            <div>
                <span>Ranking</span>
                <span><Icon icon="rank"/> &nbsp; #{ordinal(data.rank)}</span>
            </div>
            <hr>
            <div>
                <span>Time</span>
                <span><Icon icon="time"/> &nbsp; {data.completion_time}</span>
            </div>
            <hr>
            <div>
                <span>Order</span>
                <span><Icon icon="completed"/> &nbsp; {ordinal(data.completion_order)}</span>
            </div>
        </section>
    {:else}
        <EarnedCarats
            earned={data.carats}
            proBonus={data.pro_bonus}
            difficultyBonus={data.difficulty_bonus}
            total={data.total}
        />
        <section class="setts">
            <h5>OTHER SERIES YOU MIGHT LIKE</h5>
            <div>
                {#each suggestions as sett}
                    <a target="_self" href={data.sett.public_url}>
                        <ImgAsset image={sett.sett_assets.small.url}
                            alt="{sett.name}'s cover"
                            icon={sett.difficulty.class_name}
                        />
                    </a>
                {/each}
            </div>
        </section>
    {/if}
</RewardWindow>

<style>
    section {
        align-self: stretch;
    }
    h6 {
        color: #D6D6D6;
        font-size: 16px;
        font-weight: 400;
        margin: 5px 0 0;
        letter-spacing: .5px;
    }
    p {
        margin: 5px 0 20px;
        display: inline-block;
        width: 275px;
        color: #B39EA9;
        letter-spacing: .42px;
    }
    a {
        display: block;
        width: 80px;
        height: 80px;
        margin: auto;
        border-radius: 8px;
        overflow: hidden;
    }
    .stats {
        margin: 20px 20px 0;
        display: flex;
        justify-content: space-evenly;
    }
    .stats hr {
        border: none;
        border-right: 1px solid #45373D;
    }
    .stats div {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .stats span:first-child {
        color: #b39ea9;
    }
    .stats span:last-child {
        font-weight: 500;
    }

    h5 {
        font-size: 12px;
        font-weight: 500;
        color: #B39EA9;
        margin: 3px 0;
    }
    .setts {
        margin-top: 15px;
        padding-top: 15px;
        display: flex;
        flex-direction: column;
        border-top: 1px solid #45373D;
    }
    .setts > div {
        display: flex;
        justify-content: space-evenly;
        margin-top: 10px;
    }
    .setts a {
        display: block;
        width: 60px;
        height: 60px;
        margin: 0;
        border-radius: 12px;
    }
</style>
