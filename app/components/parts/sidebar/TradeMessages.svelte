<script lang="ts">
    import type NM from "../../../utils/NMTypes";

    import { liveListProvider } from "../../../utils/NMLiveApi";
    import Message from "./MessagePreview.svelte";
    import Trade from "./Trade.svelte";

    export let openConversation: (data: NM.ConversationInfo) => void;

    const { store: trades, loading: loadingTrades } = liveListProvider("trades");
    const messageList = liveListProvider("messages");
    const { store: messages, loading: loadingMessages } = messageList;
    $: loading = $loadingTrades || $loadingMessages;

    function markAllRead() {
        messageList.markRead();
    }
</script>

{#if loading}
    <i class="load-indicator large"></i>
{:else if $messages.length > 0 || $trades.length > 0}
    <ul class="user-status--list">
        {#if $trades.length > 0}
            <li class="small-caps user-status--list--heading">
                {$trades.length} Pending Trade{$trades.length>1 ? "s" : ""}
            </li>
            {#each $trades as trade (trade.id)}
                <Trade {trade} />
            {/each}
        {/if}
        {#if $messages.length > 0}
            <li class="small-caps user-status--list--heading">
                Messages
                {#if $messages.some(({ read }) => !read)}
                    <span class="text-link user-status--list--heading--action" on:click={markAllRead}>
                        Mark all as read
                    </span>
                {/if}
            </li>
            {#each $messages as message (message.id)}
                <Message {message} {openConversation} />
            {/each}
        {/if}
    </ul>
{:else}
    <div class="empty-state">
        <i class="nm-messages--empty--icon">
            <i class="icon-trade"></i>
        </i>
        <p class="text-emphasis text-subdued text-small">No trades or messages</p>
    </div>
{/if}
