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

    /**
     * Limit the value by minimum and maximum
     * @param min - minimal value
     * @param max - maximum value
     * @param val - the value to limit
     */
    // eslint-disable-next-line no-shadow
    function lim (min: number, max: number, val: number) {
        return Math.max(min, Math.min(max, val));
    }

    /**
     * Convert 0-1 range to output value
     * @param val - the value to convert into the output units
     */
    function toStep (val: number) {
        return list
            ? list[Math.floor(lim(0, steps, val * (steps + 1)))]
            : Math.floor(lim(min, max, val * steps));
    }

    let timer: NodeJS.Timer;
    /**
     * Updates the value with a delay
     * @param idx - which part of the value update
     * @param val - the new value in 0-1 format
     */
    function setValue (idx: number, val: number) {
        // "round" the value
        val = list
            ? list.indexOf(toStep(val)) / steps
            : (toStep(val) - min) / steps;
        // check for changes and update the inner value
        if (idx) {
            if (val === end) return;
            end = val;
        } else {
            if (val === start) return;
            start = val;
        }

        clearTimeout(timer);
        timer = setTimeout(() => {
            value = idx ? [value[0], toStep(val)] : [toStep(val), value[1]];
        }, 300);
    }

    function startDrag (ev: MouseEvent | TouchEvent, isLeft: boolean) {
        ev.preventDefault();
        const isTouch = ev instanceof TouchEvent;
        const elem = ev.target as HTMLElement;
        elem.classList.add("dragging");
        const { left,  width } = elem.closest(".slider")!.getBoundingClientRect();
        window.addEventListener(isTouch ? "touchmove" : "mousemove", move);
        window.addEventListener(
            isTouch ? "touchend" : "mouseup",
            () => {
                window.removeEventListener(isTouch ? "touchmove" : "mousemove", move);
                elem.classList.remove("dragging");
            },
            { once: true },
        );
        function move (ev: MouseEvent | TouchEvent) {
            const x = ev instanceof MouseEvent ? ev.clientX : ev.touches[0].clientX;
            if (isLeft) {
                setValue(0, lim(0, end, (x - left) / width));
            } else {
                setValue(1, lim(start, 1, (x - left) / width));
            }
        }
    }

    // try to locate the title at the center of the slider but without intersecting the labels
    let titleWidth = 0.4;
    let titlePos = 0.5;
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
        <div class="handle"
            on:mousedown={(ev) => startDrag(ev, true)}
            on:touchstart={(ev) => startDrag(ev, true)}
        >
            <div class="label">{num2text(toStep(start))}</div>
        </div>
        {#if start < 1}
            <div class="handle"
                on:mousedown={(ev) => startDrag(ev, false)}
                on:touchstart={(ev) => startDrag(ev, false)}
            >
                <div class="label">{num2text(toStep(end))}</div>
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
        left: var(--start);
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
    .handle:global(.dragging) {
        width: 12px;
        height: 12px;
        left: calc(var(--start) + 1px);
        top: calc(-50% - 4px);
    }
    .handle ~ .handle:global(.dragging) {
        left: calc(var(--end) + 1px);
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
