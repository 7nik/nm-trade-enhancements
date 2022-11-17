<!-- @component
    Colors the content in the rarity's color
-->
<script lang="ts">
    import type { rarityCss } from "../../utils/NMTypes";

    /**
     * How to color the text
     */
    export let rarity: rarityCss;
</script>

<span class={rarity}><slot/></span>

<style>
    .common {
        color: #728a94;
    }
    .uncommon {
        color: #18c68f;
    }
    .rare {
        color: #48c2e4;
    }
    .veryRare {
        color: #B28AC6;
    }
    .extraRare {
        color: #E7327C;
    }
    .chase {
        background: -webkit-linear-gradient(0deg,#E7327C,#f7cf25);
    }
    .variant {
        background: -webkit-linear-gradient(0deg,#728a94,#412e3f);
    }
    .legendary {
        background: -webkit-linear-gradient(0deg,#c56c13,#7289c6);
    }
    .chase, .variant, .legendary {
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
