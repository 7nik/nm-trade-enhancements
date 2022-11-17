<script lang="ts">
    import type NM from "../../../utils/NMTypes";

    import { firstName } from "../../../services/user";
    import currentUser from "../../../services/currentUser";
    import Avatar from "../../elements/Avatar.svelte";
    import { timeAgo } from "../../../utils/date";
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import { getContext } from "svelte";

    /**
     * The message data
     */
    export let message: NM.MessageNotification;

    const openConversation = getContext<(data: NM.ConversationInfo) => void>("openConversation");

    const recipient = message.object.users.find((user) => user.id !== currentUser.id)!;

    function messageClick() {
        if (!message.read) {
            liveListProvider("messages").markRead(message.id);
        }
        openConversation(message.object);
    }
</script>

<li class="nm-notification user-status" class:unread={!message.read}>
    <div
        id="message-notification"
        class:unread={!message.read}
        on:click={messageClick}
    >
        <Avatar user={recipient} size="small" class="user-status--icon" />
        <div class="user-status--content">
            <span id="message-name" class="text-prominent">{firstName(recipient)}</span>
            <time class="text-emphasis">{timeAgo(message.actor.time)}</time>
            <div id="message-text">
                {#if recipient.id === currentUser.id}
                    <span class="small-caps">You:</span>
                {/if}
                <span
                    class="message-preview"
                    art-truncate-words="getMessage()"
                    truncate-filters="['linky', 'textToHtml']"
                    max-words="100"
                    word-tolerance="50"
                >
                    {message.actor.action_data}
                </span>
            </div>
        </div>
    </div>
</li>
