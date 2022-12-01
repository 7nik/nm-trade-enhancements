<script lang="ts">
    import { liveListProvider } from "../../utils/NMLiveApi";
    import Header from "./Header.svelte";
    import List from "./List.svelte";
    import Message from "./MessagePreview.svelte";
    import Trade from "./Trade.svelte";

    const { store: trades, loading: loadingTrades } = liveListProvider("trades");
    const messageList = liveListProvider("messages");
    const { store: messages, loading: loadingMessages } = messageList;
    $: loading = $loadingTrades || $loadingMessages;

    function markAllRead () {
        messageList.markRead();
    }
</script>

<List icon="trade" emptyMessage="No trades or messages"
    show={loading ? "loading" : ($messages.length > 0 || $trades.length > 0 ? "content" : "empty")}
>
    {#if $trades.length > 0}
        <Header>
            {$trades.length} Pending Trade{$trades.length > 1 ? "s" : ""}
        </Header>
        {#each $trades as trade (trade.id)}
            <Trade {trade} />
        {/each}
    {/if}
    {#if $messages.length > 0}
        <Header>
            Messages
            {#if $messages.some(({ read }) => !read)}
                <span on:click={markAllRead}>
                    Mark all as read
                </span>
            {/if}
        </Header>
        {#each $messages as message (message.id)}
            <Message {message} />
        {/each}
    {/if}
</List>

<style>
    span {
        color: #0d9ce6;
        cursor: pointer;
    }
    span:hover {
        color: #085b85;
    }
</style>
