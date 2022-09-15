<script lang="ts">
    import config from "../../../services/config";
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import Milestone from "./Milestone.svelte";

    const {
        store: recentMilestones,
        loading: recentLoading,
    } = liveListProvider(config.MILESTONE_RECENT_KEY);
    const {
        store: suggestedMilestones,
        loading: suggestedLoading,
    } = liveListProvider(config.MILESTONE_SUGGESTION_KEY);
    const completed = liveListProvider(config.MILESTONE_COMPLETED_KEY);
    const {
        store: completedMilestones,
        loading: completedLoading
    } = completed;
    // the milestones do not receive updates, so do this to
    // get the actual completed milestones at the next time
    completed.on("init", () => {
        completed.stopListening();
    })

    $: loading = $recentLoading || $suggestedLoading || $completedLoading;

    function gotoPackOpenPage(settId: number) {
        // TODO implement pack opening?
        window.open("https://neonmob.com/series/"+settId);
    }
</script>

<div class="milestone-notification-cont">
    {#if $recentMilestones.length > 0}
        <ul>
            <div class="milestone-classifications">
                <span class="milestone-type">recent progress</span>
                <span class="see-all-milestone">
                    <a target="_self" href="{config["profile-milestones"]}">see all milestones</a>
                </span>
            </div>
            {#each $recentMilestones as milestone (milestone)}
                <Milestone {milestone} {gotoPackOpenPage} />
            {/each}
        </ul>
    {/if}
    {#if $suggestedMilestones.length > 0}
        <ul>
            <div class="milestone-classifications">
                <span class="milestone-type">MILESTONE SUGGESTION</span>
            </div>
            {#each $suggestedMilestones as milestone (milestone)}
                <Milestone {milestone} {gotoPackOpenPage} />
            {/each}
        </ul>
    {/if}
    {#if $completedMilestones.length > 0}
        <ul class="disable-completed">
            <span class="milestone-classifications">
                <span class="milestone-type">RECENTLY COMPLETED</span>
            </span>
            {#each $completedMilestones as milestone (milestone)}
                <Milestone {milestone} {gotoPackOpenPage} />
            {/each}
        </ul>
    {/if}

    {#if loading}
        <i class="load-indicator large"></i>
    {:else if !$recentMilestones.length && !$suggestedMilestones.length && !$completedMilestones.length}
        <div class="empty-state">
            <i class="nm-messages--empty--icon">
                <i class="icon-badge"></i>
            </i>
            <p class="text-emphasis text-subdued text-small">No Milestones.</p>
        </div>
    {/if}
</div>
