<!-- @component
    A window to display the reward for card discarding
 -->
<script lang="ts">
    import EarnedCarats from "../parts/EarnedCarats.svelte";
    import RewardWindow from "./RewardWindow.svelte";

    /**
     * Number of earned carats
     */
    export let earned: number;
    /**
     * The total number of carats
     */
    export let total: number;
</script>

<RewardWindow on:closed title="Discard Completed" button="Close">
    <EarnedCarats {earned} {total} />
</RewardWindow>
