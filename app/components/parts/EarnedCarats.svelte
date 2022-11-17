<!-- @component
    A component to display various earned carats
 -->
<script lang="ts">
    import { comma } from "../../utils/utils";
    import Icon from "../elements/Icon.svelte";

    /**
     * The main earned carats
     */
    export let earned: number;
    /**
     * The additional carats for being Pro
     */
    export let proBonus: number = 0;
    /**
     * The additional carats for series difficulty
     */
    export let difficultyBonus: number = 0;
    /**
     * The new total number of the carats
     */
    export let total: number;
</script>

<section>
    <span>Carats earned:</span>
    <Icon icon="carat" size="15px"/>
    <span>{comma(earned)}</span>

    {#if proBonus}
        <span><Icon icon="pro" size="13px"/> Pro carat bonus:</span>
        <Icon icon="carat" size="15px"/>
        <span>{comma(proBonus)}</span>
    {/if}

    {#if difficultyBonus}
        <span>Difficulty bonus:</span>
        <Icon icon="carat" size="15px"/>
        <span>{comma(difficultyBonus)}</span>
    {/if}

    <span>TOTAL CARATS:</span>
    <Icon icon="carat" size="20px"/>
    <span>{comma(total)}</span>
</section>

<style>
    section {
        margin: 0 15px;
        display: grid;
        grid-template-columns: 45% 15% 30%;
        gap: 7px 0;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 400;
    }
    section span:nth-child(3n+1) {
        color: #B39EA9;
        justify-self: end;
    }
    section :global(span:nth-child(3n+2)) {
        justify-self: center;
    }
    section span:nth-child(3n) {
        justify-self: start;
    }
    section span:nth-last-child(-n+3) {
        color: white;
        font-weight: 500;
    }
    section span:last-child {
        font-size: 18px;
    }
</style>
