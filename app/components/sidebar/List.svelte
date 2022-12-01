<!-- @component
    A container that can show loading or empty status
 -->

<script lang="ts">
    import type { IconName } from "../elements/Icon.svelte";

    import Icon from "../elements/Icon.svelte";

    export let show: "loading" | "empty" | "content";
    export let icon: IconName;
    export let emptyTitle = "";
    export let emptyMessage: string;
</script>

<article class:center={show !== "content"}>
    {#if show === "loading"}
        <Icon icon="loader" size="40px"/>
    {:else if show === "empty"}
        <div><Icon {icon} size="40px"/></div>
        {#if emptyTitle}
            <h3>{emptyTitle}</h3>
        {/if}
        <i>{emptyMessage}</i>
    {:else}
        <slot/>
    {/if}
</article>

<style>
    article {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    .center {
        padding: 30%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1ch;
        color: #857a90;
    }
    div {
        color: #dfdde1;
    }
    h3 {
        margin: 20px 0 0 0;
        font-size: 15px;
        color: #2c2830;
        font-weight: 400;
        text-align: center;
    }
    i {
        font-size: 13px
    }
</style>
