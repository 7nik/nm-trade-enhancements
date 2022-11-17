<!-- @component
    Adds a supper flag with the given number
 -->
<script lang="ts">
    /**
     * The flag's value
     */
    export let value: number;
    /**
     * The flag's color, by default - #EA2360
     */
    export let color = "#EA2360";

    let jumping = true;
    $: jump(value);
    function jump(v: number) {
        if (v < 1) return;
        jumping = true;
        setTimeout(() => jumping = false, 500);
    }
</script>

{#if value > 0}
    <span>
        <span class:jumping style:--fill={color}>
            {value}
            <svg xmlns="http://www.w3.org/2000/svg" height="3" width="6" version="1.1" viewBox="0 0 6 3">
                <path d="M0,0 L0,1 C0,1.6 0.5,2 1,2 C1,2 1.6,2 1.8,1.8 L3.6,0.6 C4.1,0.3 4.5,0 6,0 Z"></path>
            </svg>
        </span>
    </span>
{/if}

<style>
    span {
        position: relative;
    }
    span span {
        position: absolute;
        top: -1.3em;
        height: 1em;
        box-sizing: content-box;
        border-radius: 1em 1em 1em 0;
        padding: 0.2em 0.4em;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        background: var(--fill);
    }
    svg {
        position: absolute;
        bottom: -3px;
        left: 0;
        fill: var(--fill);
    }
    .jumping {
        transform-origin: center bottom;
        animation: jump .3s cubic-bezier(.175,.885,.32,1.275) forwards;
    }
    @keyframes jump {
        0% {
            transform: scale(0);
        }
        50% {
            transform: scale(1.3);
        }
        100% {
            transform: scale(1);
        }
    }
</style>
