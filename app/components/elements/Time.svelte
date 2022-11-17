<!-- @component
    An auto-updating time label
 -->
<script lang="ts">
    import { onMount } from "svelte";
    import moment from "../../utils/date";

    export let stamp: string;
    export let condense = false;
    export let hourToDate = 72;

    const steps = [
        1000, // 1s
        60_000, // 1m
        3600_000, // 1h
        hourToDate*3600_000, // default - 3d
        Infinity,
    ]

    moment.relativeTimeThreshold('h', hourToDate);

    const m = moment(stamp);
    const diff = m.diff(Date.now());
    m.locale(condense ? "nm-condense" : diff < 0 ? "nm-base" : "nm-til");

    function getTime() {
        const time = diff < 0 ? m.fromNow() : moment().to(m);
        const d = Math.abs(diff);
        const next = steps.find((_, i, arr) => arr[i+1] > d)! / 3;
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
