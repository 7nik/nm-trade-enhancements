<!-- @component
    Allows to edit both ends of a range
 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { num2text } from "../../utils/utils";

    /**
     * List of sorted values
     */
    export let list: number[] | undefined;
    /**
     * Minimal allowed value
     */
    export let min = list ? list[0] : 0;
    /**
     * Maximum allowed value
     */
    export let max = list ? list[list.length - 1] : 100;
    /**
     * The current range
     */
    export let value: [number, number];
    /**
     * Title of the range
     */
    export let title = "";

    const dispatch = createEventDispatcher();
    $: dispatch("change", value);

    const steps = list ? list.length - 1 : (max - min);
    if (list) {
        // ensure the range consist of values from the list
        value = [
            list.find((x) => x >= value[0]) ?? list[steps],
            list.find((x) => x >= value[1]) ?? list[steps],
        ];
    }
    // 0-1
    $: start = list
        ? list.indexOf(value[0]) / steps
        : lim(0, 1, (value[0] - min) / steps);
    // 0-1
    $: end = list
        ? lim(start, steps, list.indexOf(value[1]) / steps)
        : lim(0, 1, (value[1] - min) / steps);

    // limit the value by minimum and maximum
    // eslint-disable-next-line no-shadow
    function lim (min: number, max: number, val: number) {
        return Math.max(min, Math.min(max, val));
    }
    // convert 0-1 range to output value
    function toStep (val: number) {
        return list
            ? list[Math.floor(lim(0, steps, val * (steps + 1)))]
            : Math.floor(lim(min, max, val * steps));
    }

    function startDrag (ev: MouseEvent, isLeft: boolean) {
        ev.preventDefault();
        const { left,  width } = (ev.target as HTMLElement)
            .closest(".slider")!.getBoundingClientRect();
        window.addEventListener("mousemove", move);
        window.addEventListener(
            "mouseup",
            () => window.removeEventListener("mousemove", move),
            { once: true },
        );
        function move ({ clientX: x }: MouseEvent) {
            if (isLeft) {
                const newValue = toStep(Math.round(lim(0, end, (x - left) / width) * steps) / steps);
                if (newValue !== value[0]) {
                    value = [newValue, value[1]];
                }
            } else {
                const newValue = toStep(Math.round(lim(start, 1, (x - left) / width) * steps) / steps);
                if (newValue !== value[1]) {
                    value = [value[0], newValue];
                }
            }
        }
    }

    // try to locate the title at the center of the slider but without intersecting the labels
    let titleWidth = 0.4;
    let  titlePos = 0.5;
    $: {
        const left = 0.5 - titleWidth / 2;
        const right = 0.5 + titleWidth / 2;
        if (start < left && right < end || end < left || right < start) {
            titlePos = 0.5;
        } else if (start < 0.5 && end > 0.5 && end - start > titleWidth) {
            titlePos = end - 0.5 < 0.5 - start
                ? end - titleWidth / 2
                : start + titleWidth / 2;
        } else {
            titlePos = start > 1 - end
                ? start - titleWidth / 2
                : end + titleWidth / 2;
        }
    }

    function getWidth (elem: HTMLElement) {
        function calculateWidth () {
            const { width: elemWidth } = elem.getBoundingClientRect();
            const { width: totalWidth } = elem.closest(".slider")!.getBoundingClientRect();
            // assume that labels are 30px or less
            const width = (elemWidth + 30) / totalWidth;
            // when inside of an element with display:none, widths are 0 -> (0+30)/0 -> Infinity
            if (!Number.isFinite(width)) {
                return false;
            }
            titleWidth = width;
            return true;
        }

        if (!calculateWidth()) {
            // recalculate width when the elements became "visible" and measurable
            new IntersectionObserver(async (entries, observer) => {
                if (entries[0].intersectionRatio > 0 && calculateWidth()) {
                    observer.disconnect();
                }
            }).observe(elem);
        }
    }
</script>

<svelte:options immutable />

<span class="slider" style:--start="{start * 100}%" style:--end="{end * 100}%">
    <div class="range"></div>
    <div class="handles">
        <div class="handle" on:mousedown={(ev) => startDrag(ev, true)}>
            <div class="label">{num2text(value[0])}</div>
        </div>
        {#if start < 1}
            <div class="handle" on:mousedown={(ev) => startDrag(ev, false)}>
                <div class="label">{num2text(value[1])}</div>
            </div>
        {/if}
        <div class="title" style:--title-pos="{titlePos * 100}%" use:getWidth>{title}</div>
    </div>
</span>

<style>
    .slider {
        display: inline-block;
        min-width: 100px;
        height: 3px;
        box-shadow: 0 0 0 1px #d6d6d6;
        border-radius: 10px;
        background: #efefef;
        position: relative;
        margin-top: calc(10px + 1em);
        margin-bottom: 10px;
    }
    .range {
        height: 100%;
        background: #4BBBF5;
        position: absolute;
        left: var(--start);
        right: calc(100% - var(--end));
    }
    .handles {
        margin-right: 14px;
        position: relative;
    }
    .handle {
        position: absolute;
        left: calc(var(--start));
        top: calc(-50% - 6px);
        width: 15px;
        height: 15px;
        background: white;
        box-shadow: inset 0 0 0 1px grey;
        border-radius: 100%;
        cursor: pointer;
    }
    .handle ~ .handle {
        left: calc(var(--end));
    }
    .label, .title {
        position: absolute;
        top: calc(-3px - 1em);
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        width: max-content;
    }
    .title {
        top: calc(-8px - 1em);
        left: calc(var(--title-pos, 50%) + 7.5px);
    }
</style>
