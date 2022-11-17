<!-- @component
    Renders a print image
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    import Icon from "../elements/Icon.svelte";

    /**
     * The print to display
     */
    export let print: NM.Print | NM.PrintInTrade;
    /**
     * Whether to highlight the print
     */
    export let highlight: boolean = false;
</script>

<svelte:options immutable/>

<div class:highlight-card={highlight}>
    <figure>
        <img src="{print.piece_assets.image.small.url}" alt="{print.name}">
        <span>
            <Icon icon={print.rarity.class} />
        </span>
    </figure>
</div>

<style>
    div {
        margin: 5px;
    }
    .highlight-card {
        border-radius: 5px;
        box-shadow: 0 2px 5px #8400ff;
    }

    figure {
        position: relative;
        border-radius: 4px;
        overflow: hidden;
        margin: 0;
    }
    img {
        width: 74px;
        height: 74px;
        vertical-align: bottom;
    }
    figure span {
        position: absolute;
        bottom: 0;
        left: 0;
        display: block;
        width: 30px;
        height: 30px;
        box-sizing: border-box;
        padding: 10px 0 0 2px;
        background-color: #efefef;
        mask-image: url(https://d1ld1je540hac5.cloudfront.net/assets/svg/piece-small-info-bg.svg);
        -webkit-mask-image: url(https://d1ld1je540hac5.cloudfront.net/assets/svg/piece-small-info-bg.svg);
        mask-repeat: no-repeat;
        -webkit-mask-repeat: no-repeat;
        mask-size: cover;
        -webkit-mask-size: cover;
    }
</style>
