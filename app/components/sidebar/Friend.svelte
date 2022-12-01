<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { getContext } from "svelte";
    import { readable } from "svelte/store";
    import currentUser from "../../services/currentUser";
    import { friendList } from "../../services/user";
    import { getUserStatus } from "../../utils/NMLiveApi";
    import Avatar from "../elements/Avatar.svelte";
    import Button from "../elements/Button.svelte";
    import Icon from "../elements/Icon.svelte";

    /**
     * The person's data
     */
    export let friend: NM.UserFriend;
    /**
     * Whether to show the on/offline status
     */
    export let showStatus = false;

    const startConversation = getContext<(userId: number) => void>("openConversation");

    const isOnline = showStatus ? readable(false) : getUserStatus(friend.id);
    const isFriend = friendList.isFriend(friend.id);

    const { isVerified } = currentUser;
    const showFriends = currentUser.canDo("friends");
</script>

<svelte:options immutable />

<article class:offline={!$isOnline && showStatus} class:online={$isOnline}
    on:click={() => startConversation(friend.id)}
>
    <aside>
        <Avatar user={friend} />
    </aside>
    <section>
        <div>
            {#if friend.pro_status}
                <Icon icon="pro" size="10px"/>
            {/if}
            {friend.name}
        </div>
        <i>
            @{friend.username}
        </i>
    </section>
    {#if showStatus}
        <b></b>
    {:else if isVerified && showFriends && !$isFriend}
        <Button icon="add" size="mini"
            hint="Add to Friends List"
            on:click={() => friendList.startFriendship(friend.id)}
        />
    {/if}
</article>

<style>
    article {
        padding: 0 10px;
        gap: 0 10px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        cursor: pointer;
    }
    article:hover {
        background: #f4f4f4;
    }
    article::before {
        content: "";
        display: block;
        height: 1px;
        width: 100%;
        background: #efefef;
        margin: 0 -10px 0 50px;
        position: relative;
        top: -1px;
    }
    article:hover::before {
        background: transparent;
    }
    aside {
        width: 40px;
        padding: 7px 0;
    }
    .offline aside {
        filter: grayscale(1) opacity(.5);
    }
    section {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    div {
        color: #2c2830;
        font-size: 15px;
        font-weight: 400;
    }
    .offline div {
        opacity: .5;
    }
    i {
        font-size: 13px;
        color: #857a90;
    }
    b {
        background: #c6c6c6;
        width: 8px;
        height: 8px;
        border-radius: 4px;
    }
    .online b {
        background: #17C48D;
    }
</style>
