<script lang="ts">
    import type NM from "../../../utils/NMTypes";
    
    import { friendList } from "../../../services/user";
    import currentUser from "../../../services/currentUser";
    import Avatar from "../../elements/Avatar.svelte";
    import { readable } from "svelte/store";
    import { getUserStatus } from "../../../utils/NMLiveApi";

    export let friend: NM.UserFriend;
    export let isSearching = false;
    export let startConversation: (userId: number) => void;
    
    const isOnline = isSearching ? readable(false) : getUserStatus(friend.id);
    const isFriend = friendList.isFriend(friend.id);

    const isVerified = currentUser.isVerified;
    const showFriends = currentUser.canDo("friends");
</script>

<svelte:options immutable />

<li class="friends-list--friend user-status" class:offline={!$isOnline && !isSearching}
    on:click={() => startConversation(friend.id)}
>
    <Avatar user={friend} size="small" class="friends-list--friend--icon user-status--icon"/>
    <div class="user-status--content text-prominent text-body">
        <div class="friends-list--friend--name">
            {#if friend.pro_status}
                <span title="Pro Collector" class="{friend.pro_badge} tip"></span> 
            {/if}
            {friend.name}
        </div>
        <div class="text-small text-emphasis text-subdued friends-list--friend--username">
            @{friend.username}
        </div>
    </div>
    {#if !isSearching}
        <i class="friends-list--friend--online flag-dot" 
            class:online={$isOnline} class:offline={!$isOnline}
        ></i>
    {:else if isVerified && showFriends && !isFriend}
        <a id="add-friend-btn" 
            class="btn small friends-list--toggle-friend user-status--action tip"
            title="Add to Friends List"
            on:click={() => friendList.startFriendship(friend.id)}
        >
            <i class="icon-add"></i>
        </a>
    {/if}

</li>
