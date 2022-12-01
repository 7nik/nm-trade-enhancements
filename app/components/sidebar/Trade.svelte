<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { getContext } from "svelte";
    import { firstName } from "../../services/user";
    import { sharedTradePreview } from "../actions/tradePreviews";
    import Avatar from "../elements/Avatar.svelte";
    import Time from "../elements/Time.svelte";

    /**
     * The trade data
     */
    export let trade: NM.TradeNotification;

    const openTrade = getContext<(id: number) => void>("openTrade");
</script>

<svelte:options immutable />

<a href={trade.object.url} class:unread={!trade.read}
    use:sharedTradePreview={trade.object.id}
    on:click|preventDefault|stopPropagation={() => openTrade(trade.object.id)}
>
    <Avatar user={trade.actor} />
    <section>
        <span>
            {firstName(trade.actor)}
            <Time stamp={trade.object.expires_on}/>
        </span>
        <div>{trade.verb_phrase} a trade</div>
    </section>
</a>

<style>
    a {
        height: 55px;
        padding: 0 10px;
        gap: 10px;
        text-decoration: none;
        display: flex;
        align-items: center;
    }
    a.unread {
        background: rgba(75,187,245,.2);
    }
    a:hover {
        background: #f4f4f4;
    }
    section {
        flex-grow: 1;
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    a + a section {
        border-top: 1px solid #efefef;
    }
    a:hover + a section {
        border-top-color: transparent;
    }
    span {
        font-size: 14px;
        color: #2c2830;
    }
    div {
        font-size: 14px;
        color: #5f5668;
    }
</style>
