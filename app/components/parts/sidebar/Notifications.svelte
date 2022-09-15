<script lang="ts">
    import type NM from "../../../utils/NMTypes";
    
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import AlertNotification from "./AlertNotification.svelte";

    const notificationList = liveListProvider("notifications");
    const {
        store: notifications,
        loading,
    } = notificationList;
    
    function markAllRead() {
        notificationList.markRead();
    }

    function viewNotification(notification: NM.Notification<object, string, string>) {
        if (notification.object.type === "trade") {
            return true; // the global catcher will open the trade
        }
        // TODO implement rest
        return false;
    }
</script>

{#if $loading}
    <i class="load-indicator large"></i>
{:else if $notifications.length > 0}
    <ul class="nm-notifications-feed">
        {#if $notifications.some(({ read }) => !read)}
            <li class="small-caps user-status--list--heading">
                <span class="text-link" on:click={markAllRead}>Mark all as read</span>
            </li>
        {/if}
        {#each $notifications as notification (notification.id)}
            <AlertNotification {notification} {viewNotification} />
        {/each}
    </ul>
{:else}
    <div class="empty-state">
        <i class="empty-alert--notifications"></i>
        <p class="text-emphasis text-subdued text-small">No notifications</p>
    </div>
{/if}
