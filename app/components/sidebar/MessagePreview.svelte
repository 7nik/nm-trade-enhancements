<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { getContext } from "svelte";
    import currentUser from "../../services/currentUser";
    import { firstName } from "../../services/user";
    import { liveListProvider } from "../../utils/NMLiveApi";
    import Avatar from "../elements/Avatar.svelte";
    import Time from "../elements/Time.svelte";

    /**
     * The message data
     */
    export let message: NM.MessageNotification;

    const openConversation = getContext<(data: NM.ConversationInfo) => void>("openConversation");

    const recipient = message.object.users.find((user) => user.id !== currentUser.id)!;

    function messageClick () {
        if (!message.read) {
            liveListProvider("messages").markRead(message.id);
        }
        openConversation(message.object);
    }
</script>

<article class:unread={!message.read} on:click={messageClick}>
    <Avatar user={recipient} />
    <section>
        <span>
            {firstName(recipient)}
            <Time stamp={message.actor.time} />
        </span>
        <div>
            {#if message.object.users[0].id === currentUser.id}
                <span>You:</span>
            {/if}
            {message.actor.action_data}
        </div>
    </section>
</article>

<style>
    article {
        height: 55px;
        padding: 0 10px;
        gap: 10px;
        display: flex;
        align-items: center;
        cursor: pointer;
    }
    article.unread {
        background: rgba(75,187,245,.2);
    }
    article:hover {
        background: #f4f4f4;
    }
    section {
        flex-grow: 1;
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    span {
        font-size: 14px;
        color: #2c2830;
    }
    article + article section {
        border-top: 1px solid #efefef;
    }
    article:hover + article section {
        border-top-color: transparent;
    }
    div {
        font-size: 14px;
        color: #5f5668;
    }
    div span {
        color: #857a90;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
    }
</style>
