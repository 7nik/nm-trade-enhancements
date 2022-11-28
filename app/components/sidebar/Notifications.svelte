<script lang="ts">
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import AlertNotification from "./AlertNotification.svelte";
    import Header from "./Header.svelte";
    import List from "./List.svelte";

    const notificationList = liveListProvider("notifications");
    const {
        store: notifications,
        loading,
    } = notificationList;

    function markAllRead() {
        notificationList.markRead();
    }
</script>

<List icon="notifications" emptyMessage="No notifications"
    show={$loading ? "loading" : $notifications.length > 0 ? "content" : "empty"}
>
    {#if $notifications.some(({ read }) => !read)}
        <Header>
            <span on:click={markAllRead}>Mark all as read</span>
        </Header>
    {/if}
    {#each $notifications as notification (notification.id)}
        <AlertNotification {notification} />
    {/each}
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
