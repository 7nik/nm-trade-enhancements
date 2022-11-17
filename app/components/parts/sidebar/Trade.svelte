<script lang="ts">
    import type NM from "../../../utils/NMTypes";
    
    import { firstName } from "../../../services/user";
    import { timeTil } from "../../../utils/date";
    import Avatar from "../../elements/Avatar.svelte";
    import { sharedTradePreview } from "../../tradePreviews";
    import { getContext } from "svelte";

    /**
     * The trade data
     */
    export let trade: NM.TradeNotification;

    const openTrade = getContext<(id: number) => void>("openTrade");
</script>

<svelte:options immutable />

<li class="nm-notification user-status" class:unread={!trade.read} 
    use:sharedTradePreview={trade.object.id}
>
    <a class:unread={!trade.read} href={trade.object.url}>
        <Avatar user={trade.actor} size="small" class="user-status--icon" />
        <div class="user-status--content">
            <span id="message-name" class="text-prominent">{firstName(trade.actor)}</span>
            <time class="text-emphasis">{timeTil(trade.object.expires_on)}</time>
            <div id="message-text">
                <span class="message-preview">
                    {trade.verb_phrase} a trade
                </span>
            </div>
        </div>
    </a>
</li>
