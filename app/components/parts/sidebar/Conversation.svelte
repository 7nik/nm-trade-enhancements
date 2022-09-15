<script lang="ts">
    import type NM from "../../../utils/NMTypes";
    
    import { blockedUsers, firstName, friendList } from "../../../services/user";
    import currentUser from "../../../services/currentUser";
    import Avatar from "../../elements/Avatar.svelte";
    import Button from "../../elements/Button.svelte";
    import Message from "./Message.svelte";
    import { getUserStatus, liveListProvider } from "../../../utils/NMLiveApi";
    import NMApi from "../../../utils/NMApi";
    import { afterUpdate, onDestroy } from "svelte";
    import config from "../../../services/config";
    import { timestampNow } from "../../../utils/date";

    const MESSAGE_LINK_MAX_MS = 5*60_000;
    const MESSAGE_MAX_SIZE = 1000;

    export let conversationId: number;
    export let collocutor: NM.UserCollocutor;
    export let openTrade: (user: NM.User) => void;
    export let onClose: ((back: boolean) => void);
    export let canBack: boolean;
    export let canClose: boolean;

    $: isRecipientOnline = getUserStatus(collocutor.id);
    let lastActionAgo = "...";
    NMApi.user.activityFeed(collocutor.id).then((actions) => {
        lastActionAgo = actions[0]?.created ?? "one eternity ago";
    }); 

    $: isFriend = friendList.isFriend(collocutor.id);
    $: blocked = blockedUsers.isBlocked(collocutor.id);
    $: ({ isBlocked, isBlockedByUser } = $blocked);

    const canTrade = currentUser.canDo("trade");
    const canFriend = currentUser.canDo("friend");
    const canMessage = currentUser.canDo("comments");

    const messageList = liveListProvider("conversation", conversationId);
    onDestroy(() => {
        messageList.stopListening();
    });
    const messagesLoading = messageList.loading;
    const messages = messageList.store;
    $: remainingMessagesCount = messageList.total - $messages.length;
    
    // whether the scrollbar is at the bottom
    let isScrolledDown = true;
    let text = "";
    $: remainingCharCount = MESSAGE_MAX_SIZE - text.length;

    let isRecipientTyping = false;
    let offTypingTimer: NodeJS.Timer;
    messageList.on("typing", (isTyping: boolean) => {
        isRecipientTyping = isTyping;
        clearTimeout(offTypingTimer);
        if (isRecipientTyping) {
            offTypingTimer = setTimeout(() => {
                isRecipientTyping = false;
            }, 3000);
        }
    });

    let unreadMessageCount = 0;
    messageList.on("add", () => {
        unreadMessageCount += 1;
        isRecipientTyping = false;
        if (isScrolledDown) scrollDown();
    });

    function sendMessage() {
        if (!text.trim()) return;
        isScrolledDown = true;
        const msg/*: NM.Message*/ = {
            // id: null,
            comment: text.trim(),
            created: timestampNow(),
            modified: timestampNow(),
            user_id: currentUser.id,  
            
            content_type_id: config["social_network.conversation"],
            object_id: conversationId,
        };
        messageList.sendAddItem(msg);
        text = "";
    }

    let messageListElem: HTMLElement;
    function updateScroll() {
        if (!messageListElem) return;
        const scrolled = messageListElem.offsetHeight + messageListElem.scrollTop;
        isScrolledDown = messageListElem.scrollHeight - scrolled <= 5;   
        if (isScrolledDown && unreadMessageCount > 0) {
            NMApi.user.markNotificationsRead(
                [`${conversationId}-comment-conversation`], 
                "messages",
            );
            unreadMessageCount = 0;
        }
    }
    function scrollDown() {
        isScrolledDown = true;
        messageListElem?.scrollTo({ top: messageListElem.scrollHeight });
        updateScroll();
    }
    function handleKeypress(ev: KeyboardEvent) {
        if (ev.code === "Enter" && !ev.shiftKey && text.trim()) {
            ev.preventDefault();
            ev.stopPropagation();
            sendMessage();
            return;
        }
        messageList.send("typing", {
            id: conversationId,
            active: true,
        });
    }
    afterUpdate(() => {
        if (isScrolledDown) scrollDown();
    });
</script>

<div class="nm-messages">
    <div class="nm-conversation" id="messages">
        <div class="nm-conversation--header">
            {#if canBack}
                <span id="conversation-back-btn"
                    class="text-subdued text-large nm-conversation--back"
                    on:click={() => onClose(true)}
                >
                    &lsaquo;
                </span>
            {/if}
            <h3>
                <small class="small-caps">Messages With</small>
                <i id="user-status" class:online={$isRecipientOnline} class="nm-conversation--user-status"></i>
                <a class="text-small text-strong nm-conversation-header--recipient" href={collocutor.links.profile} target="_self">
                    {#if collocutor.pro_badge}
                        <span class="{collocutor.pro_badge} tip" title="Pro Collector"></span>
                    {/if}
                    {collocutor.name}
                </a>
                <div class="last-action">
                    last action: <i>{lastActionAgo}</i>
                </div>
            </h3>
            {#if canClose}
                <a id="conversation-close-btn" class="close-x small"
                    on:click={() => onClose(false)}
                >
                    <span>&times;</span>
                </a>
            {/if}

            <!-- class:nm-conversation--loading={isLoading}  -->
            <div class="nm-conversation--user-actions" 
                class:only-block={!canTrade && !canFriend}
            >
                {#if !isBlocked}
                    <Button class="subdued small text-subdued pull-right" 
                        on:click={() => blockedUsers.blockUser(collocutor.id)}
                    >Block</Button>
                {/if}
                {#if isBlocked && isBlockedByUser}
                    <Button class="subdued small text-subdued pull-right" 
                        on:click={() => blockedUsers.unblockUser(collocutor.id)}
                    >Unblock</Button>
                {/if}
                {#if canTrade}
                    <Button class="small subdued" icon="trade" 
                        on:click={() => openTrade({...collocutor, last_name: ""})}
                    >Trade</Button>
                {/if}
                {#if !$isFriend && !isBlocked && canFriend}
                    <Button class="subdued small" icon="add" 
                        on:click={() => friendList.startFriendship(collocutor.id)}
                    >Friends List</Button>
                {/if}
            </div>
        </div>

        {#if canMessage}
             <div class="comments">
                {#if $messagesLoading}
                    <i class="load-indicator large"></i>
                {:else if $messages.length === 0}
                    <div class="empty-state">
                        <i class="nm-messages--empty--icon">
                            <i class="icon-chat"></i>
                        </i>
                        <p class="text-emphasis text-subdued text-small">
                            Type a message to {collocutor.name} to get this conversation started.
                        </p>
                    </div>
                {:else}
                    <div class="comments--list--container" bind:this={messageListElem} on:scroll={updateScroll}>
                        <ul class="comments--list">
                            {#if remainingMessagesCount > 0}
                                <li class="comment comment--show-more" 
                                    on:click={() => messageList.loadMore()}
                                >
                                    {#if $messagesLoading}
                                        <i class="comment--icon load-indicator"></i>
                                        <div class="comment--content">
                                            <span class="comment--heading text-subdued">
                                                Loading previous comments
                                            </span>
                                        </div>
                                    {:else}
                                        <i class="comment--icon icon-more"></i>
                                        <div class="comment--content">
                                            <span class="comment--heading comment--show-more--button">
                                                Show {remainingMessagesCount} previous comment{remainingMessagesCount>1 ? "s" : ""}
                                            </span>
                                        </div>
                                    {/if}
                                </li>
                            {/if}
                            {#each $messages as message, i (message.id)}
                                {@const prevMsg = $messages[i-1]}
                                {@const isCondensed = prevMsg 
                                    && !message.attachment 
                                    && message.user_id === prevMsg.user_id
                                    && new Date(message.created).getTime() - new Date(prevMsg.created).getTime() < MESSAGE_LINK_MAX_MS
                                }
                                <Message {message} {collocutor} {isCondensed} />
                            {/each}
                            {#if isRecipientTyping}
                                <li class="comment not-condensed typing">
                                    <span class="comment--icon comment--typing-indicator">
                                        <Avatar user={collocutor} />
                                    </span>
                                    <div class="comment--content">
                                        <div class="comment--attachment text-subdued text-emphasis">
                                            { firstName(collocutor) } is typing&hellip;
                                        </div>
                                    </div>
                                </li>
                            {/if}
                        </ul>
                    </div>
                {/if}
            
                <form class="comments--field" name="commentForm">
                    {#if unreadMessageCount > 0}
                        <div class="comments--unread-messages" on:click={scrollDown}>
                            You have {unreadMessageCount} unread message{unreadMessageCount>1 ? "s" : ""}
                        </div>
                    {/if}
                    <div>
                        <textarea class="comments--field--entry"
                            class:disabled={isBlocked}
                            placeholder="Add a message"
                            name="comment"
                            disabled={isBlocked}
                            on:keypress={handleKeypress}
                            bind:value={text}
                        ></textarea>
                        <Button class="touch-only comments--field--add-button" on:click={sendMessage}>
                            Post Message
                        </Button>
                        <span class="comments--field--character-count count"
                              class:character-count--warn={remainingCharCount <= 20}
                              class:character-count--error={remainingCharCount < 0}
                        >
                            {remainingCharCount}
                        </span>
                    </div>
                </form>
            </div>    
        {/if}
    </div>
</div>

<style>
    #messages {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }
    #messages .last-action {
        font-size: 9pt;
        color: #857a90;
    }
    #messages > :last-child {
        overflow: auto;
        flex-grow: 1;
    }
    #messages .comments {
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    #messages .comments--list--container {
        flex-shrink: 1;
        flex-grow: 1;
        position: initial;
    }
    #messages .comments--field:not(:only-child) {
        position: relative;
    }
</style>
