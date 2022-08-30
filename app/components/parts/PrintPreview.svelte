<!-- @component
    Renders a print image
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

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

<span class="trade-preview--print" class:highlight-card={highlight}>
    <div class="piece small fluid">
        <figure class="front">
            <img class="asset" src="{print.piece_assets.image.small.url}" alt="{print.name}">
            <span class="piece-info">
                <i class="i tip {print.rarity.class}"></i>
            </span>
        </figure>
    </div>
</span>

<style>
    .highlight-card {
        border-radius: 5px;
        box-shadow: 0 2px 5px #8400ff;
    }
</style>
