<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { afterUpdate, getContext, onDestroy } from "svelte";
    import config from "../../services/config";
    import currentUser from "../../services/currentUser";
    import { blockedUsers, firstName, friendList } from "../../services/user";
    import { timestampNow } from "../../utils/date";
    import NMApi from "../../utils/NMApi";
    import { getUserStatus, liveListProvider } from "../../utils/NMLiveApi";
    import Avatar from "../elements/Avatar.svelte";
    import Button from "../elements/Button.svelte";
    import Icon from "../elements/Icon.svelte";
    import List from "./List.svelte";
    import Message from "./Message.svelte";

    const MESSAGE_LINK_MAX_MS = 5 * 60_000;
    const MESSAGE_MAX_SIZE = 1000;

    /**
     * The conversation ID, it doesn't match the collocutor's ID
     */
    export let conversationId: number;
    /**
     * The collocutor data
     */
    export let collocutor: NM.UserCollocutor;
    /**
     * Action on closing the conversation
     */
    export let onClose: ((back: boolean) => void);
    /**
     * Show the button Back
     */
    export let canBack: boolean;
    /**
     * Show the button Close
     */
    export let canClose: boolean;

    const openTrade = getContext<(user: NM.User) => void>("openTrade");

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

    function sendMessage () {
        if (!text.trim()) return;
        isScrolledDown = true;
        const msg/*: NM.Message */ = {
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
    function updateScroll () {
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
    function scrollDown () {
        isScrolledDown = true;
        messageListElem?.scrollTo({ top: messageListElem.scrollHeight });
        updateScroll();
    }
    function handleKeypress (ev: KeyboardEvent) {
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

<article>
    <header>
        {#if canBack}
            <Button type="borderless" on:click={() => onClose(true)}>
                <span class="back-btn">‹</span>
            </Button>
        {/if}
        <section>
            <h6>Messages With</h6>
            <a href={collocutor.links.profile} target="_self">
                <span class="dot" class:online={$isRecipientOnline}></span>
                {#if collocutor.pro_badge}
                    <Icon icon="pro" size="13px" hint="Pro Collector" />
                {/if}
                {collocutor.name}
            </a>
            <span class="last-action">
                last action: <i>{lastActionAgo}</i>
            </span>
        </section>
        {#if canClose}
            <span class="close-btn">
                <Icon icon="close" on:click={() => onClose(false)}/>
            </span>
        {/if}
    </header>
    <menu>
        {#if canTrade}
            <Button type="subdued-light" icon="trade" size="mini"
                on:click={() => openTrade({ ...collocutor, last_name: "" })}
            >Trade</Button>
        {/if}
        {#if !$isFriend && !isBlocked && canFriend}
            <Button type="subdued-light" icon="add" size="mini"
                on:click={() => friendList.startFriendship(collocutor.id)}
            >Friends List</Button>
        {/if}
        <span class="spacer"></span>
        {#if !isBlocked}
            <Button type="subdued-light" size="mini"
                on:click={() => blockedUsers.blockUser(collocutor.id)}
            >Block</Button>
        {/if}
        {#if isBlocked && isBlockedByUser}
            <Button type="subdued-light" size="mini"
                on:click={() => blockedUsers.unblockUser(collocutor.id)}
            >Unblock</Button>
        {/if}
    </menu>
    <List icon="chat" emptyMessage="Type a message to {collocutor.name} to get this conversation started"
        show={$messages.length > 0 ? "content" : ($messagesLoading ? "loading" : "empty")}
    >
        <ul bind:this={messageListElem} on:scroll={updateScroll}>
            {#if remainingMessagesCount > 0}
                <li class="show-more" on:click={() => messageList.loadMore()}>
                    {#if $messagesLoading}
                        <div>
                            <Icon icon="loader"></Icon>
                        </div>
                        Loading previous comments
                    {:else}
                        <div>
                            <Icon icon="more"></Icon>
                        </div>
                        Show {remainingMessagesCount} previous
                        comment{remainingMessagesCount > 1 ? "s" : ""}
                    {/if}
                </li>
            {/if}
            {#each $messages as message, i (message.id)}
                {@const prevMsg = $messages[i - 1]}
                {@const isCondensed = prevMsg
                    && !message.attachment
                    && message.user_id === prevMsg.user_id
                    && new Date(message.created).getTime() - new Date(prevMsg.created).getTime() < MESSAGE_LINK_MAX_MS
                }
                <Message {message} {collocutor} {isCondensed} />
            {/each}
            {#if isRecipientTyping}
                <li class="typing">
                    <span>
                        <Avatar user={collocutor} />
                    </span>
                    <div>
                        { firstName(collocutor) } is typing&hellip;
                    </div>
                </li>
            {/if}
        </ul>
    </List>
    {#if unreadMessageCount > 0}
        <div class="unread" on:click={scrollDown}>
            <span>
                You have {unreadMessageCount} unread
                message{unreadMessageCount > 1 ? "s" : ""}
            </span>
        </div>
    {/if}
    {#if canMessage}
        <form>
            <textarea
                class:disabled={isBlocked}
                placeholder="Add a message"
                disabled={isBlocked}
                on:keypress={handleKeypress}
                bind:value={text}
            ></textarea>
            <span class="remains"
                class:warn={remainingCharCount <= 20}
                class:error={remainingCharCount < 0}
            >
                {remainingCharCount}
            </span>
            <!-- The button is only for devices without mouse -->
            <!-- <Button size="max" on:click={sendMessage}>
                Post Message
            </Button> -->
        </form>
    {/if}
</article>

<style>
    article {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1px;
        background: #EFEFEF;
        color: #857a90;
    }
    header {
        padding: 10px;
        background: #fff;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        grid-template-areas: "l c r";
    }
    header .back-btn {
        align-self: start;
        padding: 7px;
        font-size: 40px;
        font-weight: 200;
        color: #857a90;
    }
    header .close-btn {
        grid-area: r;
        text-align: right;
        padding: 4px;
        color: black;
        cursor: pointer;
    }
    header .close-btn:not(:hover) {
        opacity: 0.4;
    }
    header section {
        grid-area: c;
        display: flex;
        flex-direction: column;
        text-align: center;
    }
    header h6 {
        margin: 0;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.035em;
        text-transform: uppercase;
    }
    header a:link, header a:visited {
        font-size: 13px;
        color: #0d9ce6;
        text-decoration: none;
    }
    header a:hover {
        color: #085b85;
    }
    .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 100%;
        margin: 0 2px 2px 0;
        vertical-align: middle;
        background: #d9d9d9;
    }
    .dot.online {
        background: #61D3A5;
    }
    header .last-action {
        font-size: 12px;
    }

    menu {
        background: #fff;
        padding: 7px;
        margin: 0;
        display: flex;
        gap: 7px;
        height: 28px;
        box-sizing: content-box;
    }
    menu .spacer {
        flex-grow: 1;
    }

    .unread {
        height: 0;
        text-align: center;
    }
    .unread span {
        background: #E82C8E;
        border-radius: 2em;
        color: #fff;
        z-index: 1;
        font-size: 14px;
        padding: 3.33px 10px;
        cursor: pointer;
        display: inline-block;
        position: relative;
        white-space: nowrap;
        top: -30px;
    }
    menu + :global(*) {
        min-height: 0;
        background: white;
    }

    .show-more, .typing {
        padding: 5px 10px;
        display: flex;
        gap: 5px;
        align-items: center;
        justify-content: stretch;
        cursor: pointer;
        font-size: 14px;
        color: #5f5668;
    }
    .show-more:hover {
        color: #085b85;
    }
    .show-more div {
        width: 40px;
        height: 40px;
        border-radius: 100%;
        background: #d9d9d9;
        color: #5f5668;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    ul {
        padding: 4px 0;
        margin: 0;
        overflow: auto;
    }
    .typing {
        cursor: initial;
        font-style: italic;
    }
    .typing span {
        position: relative;
    }
    .typing span::after {
        content:"";
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="white"%3e%3ccircle transform="translate(8)" cy="16" r="0" %3e%3canimate attributeName="r" values="0%3b 4%3b 0%3b 0" dur="1.6s" repeatCount="indefinite" begin="0" keyTimes="0%3b0.2%3b0.7%3b1" keySplines="0.2 0.2 0.4 0.8%3b0.2 0.6 0.4 0.8%3b0.2 0.6 0.4 0.8" calcMode="spline"/%3e%3c/circle%3e%3ccircle transform="translate(16)" cy="16" r="0"%3e%3canimate attributeName="r" values="0%3b 4%3b 0%3b 0" dur="1.6s" repeatCount="indefinite" begin=".3" keyTimes="0%3b0.2%3b0.7%3b1" keySplines="0.2 0.2 0.4 0.8%3b0.2 0.6 0.4 0.8%3b0.2 0.6 0.4 0.8" calcMode="spline"/%3e%3c/circle%3e%3ccircle transform="translate(24)" cy="16" r="0"%3e%3canimate attributeName="r" values="0%3b 4%3b 0%3b 0" dur="1.6s" repeatCount="indefinite" begin=".6" keyTimes="0%3b0.2%3b0.7%3b1" keySplines="0.2 0.2 0.4 0.8%3b0.2 0.6 0.4 0.8%3b0.2 0.6 0.4 0.8" calcMode="spline"/%3e%3c/circle%3e%3c/svg%3e') center center no-repeat rgba(0,0,0,.2);
        border-radius: 100%;
    }
    .typing div {
        flex-grow: 1;
    }
    .typing:not(:first-child) div::before {
        content: "";
        display: block;
        height: 1px;
        width: 100%;
        background: #efefef;
        position: relative;
        top: -14px;
    }

    form {
        margin: 10px;
        position: relative;
    }
    textarea {
        resize: none;
        display: block;
        height: 80px;
        padding: 10px 20px 10px 10px;
        width: 100%;
        box-sizing: border-box;
        color: #2c2830;
        font-family: inherit;
        font-size: 14px;
        line-height: normal;
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 3px;
        background-clip: padding-box;
        box-shadow: inset 0 1px 0 rgb(0 0 0 / 5%);
        outline: none;
    }
    textarea:focus {
        background: #f4f0c9;
        border-color: #f4f0c9;
        color: #2c2830;
    }
    textarea::placeholder {
        color: #A4A1A6
    }
    form .remains {
        display: none;
        position: absolute;
        right: 0;
        bottom: 0;
        z-index: 1;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: .05em;
        text-transform: uppercase;
        padding: 2px 6px 0;
    }
    .remains.warn {
        display: inline-block;
        background: #0001;
        color: #5e4f63;
    }
    .remains.error {
        display: inline-block;
        background: #E62160;
        color: #fff;
    }
</style>
