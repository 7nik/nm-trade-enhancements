<!-- @component
    An auto-updating time label
 -->
<script lang="ts">
    import { onMount } from "svelte";
    import date from "../../utils/date";

    export let stamp: string;
    // export let condense = false; - never was used
    // export let hourToDate = 72; - was used only in Milestone

    const steps = [
        1000, // 1s
        60_000, // 1m
        3600_000, // 1h
        72*3600_000, // 3d
        Infinity,
    ]

    const d = date(stamp);
    const diff = d.diff(Date.now());

    function getTime() {
        const time = diff < 0 ? d.fromNow() : d.toNow();
        const aDiff = Math.abs(diff);
        const next = steps.find((_, i, arr) => arr[i+1] > aDiff)! / 3;
        return [time, next] as const;
    }
    let [time, next] = getTime();

    onMount(() => {
        // do not update dates that are further then 1 day from now
        if (next > 86400_000) return;
        let timer = setTimeout(function fn() {
            [time, next] = getTime();
            timer = setTimeout(fn, next);
        }, next);
        return () => clearTimeout(timer);
    });
</script>

<time>{time}</time>

<style>
    time {
        font-size: 12px;
        font-weight: 400;
        color: #857a90;
        font-style: italic;
    }
</style>
