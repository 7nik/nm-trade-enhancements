<!-- @component
    The window to display congratulation on level upping
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    import type { IconName } from "../elements/Icon.svelte";

    import { fade } from "svelte/transition";
    import RewardWindow from "./RewardWindow.svelte";
    import Icon from "../elements/Icon.svelte";
    import animate from "../actions/animate";
    import currentUser from "../../services/currentUser";
    import config from "../../services/config";
    import EarnedCarats from "../parts/EarnedCarats.svelte";

    /**
     * The level up data
     */
    export let data: NM.UserLevelUp;

    const icon = data.app_icon_selector as IconName;
    let iconColor = currentUser.level.icon_color;
    let level = data.level - 1;
    let levelName = data.previous_level_name;
    let animating = false;

    const src = `${config["po-animation-assets"]}/levels/${data.level-1}.json`;

    function onCompleted() {
        animating = true;
        level = data.level;
        levelName = data.name;
        iconColor = data.icon_color;
        currentUser.level = data;
    }
</script>

<RewardWindow on:closed on:closed={() => location.reload()}
    title="Level Up!" button="Great!"
>
    <h2>
        Level
        <div class:animating>
            {#key level}
                <span transition:fade={{ duration:630 }} on:outroend={() => animating = false}>
                    {level}
                </span>
            {/key}
        </div>
    </h2>
    <div class="level-icon">
        <span style:background={iconColor}>
            <Icon {icon} size="28px"/>
        </span>
        <div use:animate={{ src, onCompleted }}></div>
    </div>
    <h3>
        <div class:animating>
            {#key levelName}
                <span transition:fade={{ duration:630 }} style:color={iconColor}>
                    {levelName}
                </span>
            {/key}
        </div>
    </h3>
    <p>{data.copy}</p>
    <EarnedCarats earned={data.carats} proBonus={data.pro_bonus} total={data.total_carats} />
</RewardWindow>

<style>
    h2 {
        font-size: 22px;
        font-weight: 700;
        margin: -12px 0 px;
        letter-spacing: .61px;
        color: white;
    }
    h2 div, h3 div {
        display: inline-flex;
        flex-direction: column;
        position: relative;
        height: 1.3em;
        top: 0;
    }
    h2 div.animating, h3 div.animating {
        top: -1.3em;
        transition: top .6s;
    }
    .level-icon {
        width: min-content;
        height: min-content;
        margin: 10px auto;
        padding: 3px;
        border: 4px solid #241f21;
        border-radius: 50%;
        position: relative;
    }
    .level-icon span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        color: white;
        border-radius: 100%;
        vertical-align: middle;
    }
    .level-icon div {
        position: absolute;
        top: -7px;
        left:-7px;
        width: 70px;
        height: 70px;
    }
    h3 {
        margin: 3px;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
    }
    p {
        margin: 5px;
        display: inline-block;
        width: 275px;
        color: #B39EA9;
        letter-spacing: .42px;
    }
</style>
