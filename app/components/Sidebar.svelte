<script lang="ts">
    import type NM from "../utils/NMTypes";
    import type { ComponentProps, ComponentType, SvelteComponentTyped } from "svelte";

    import { setContext } from "svelte";
    import { derived } from "svelte/store";
    import currentUser from "../services/currentUser";
    import { friendList } from "../services/user";
    import NMApi from "../utils/NMApi";
    import { liveListProvider } from "../utils/NMLiveApi";
    import { alert } from "./dialogs/modals";
    import FlagCounter from "./elements/FlagCounter.svelte";
    import Icon from "./elements/Icon.svelte";
    import Conversation from "./sidebar/Conversation.svelte";
    import Friends from "./sidebar/Friends.svelte";
    import Milestones from "./sidebar/Milestones.svelte";
    import Notifications from "./sidebar/Notifications.svelte";
    import TradeMessages from "./sidebar/TradeMessages.svelte";

    /**
     * A method to open an existing trade or start a new one
     */
    export let openTrade: (data: NM.User | number) => void;

    let hidden = true;
    let state: "none"|"milestone"|"friends"|"messages"|"notifications"|"conversation" = "none";

    const beginner = currentUser.areFeaturesGated;
    const showFriends = currentUser.canDo("friend");
    const canTrade = currentUser.canDo("trade");

    const unreadMessageAndTradeCount = derived(
        [liveListProvider("messages").store, liveListProvider("trades").store],
        ([messages, trades]) => (
            messages.filter((msg) => !msg.read).length
            + trades.filter((trade) => trade.actor.id !== currentUser.id).length
        ),
    );
    const unreadNotificationCount = derived(
        liveListProvider("notifications").store,
        (notifications) => notifications.filter((n) => !n.read).length,
    );
    const friendsOnline = friendList.getOnlineNumber();

    let collocutorId: number;
    let conversationData: {
        conversationId: number,
        collocutor: NM.UserCollocutor,
        canClose: boolean,
        canBack: boolean,
        onClose: ((back: boolean) => void),
    };
    /**
     * Show a conversation tab
     * @param data - the collocutor's ID or the conversation's data
     */
    export async function openConversation (
        data: NM.ConversationInfo | number,
        canClose = true,
        oldState: typeof state | null = state,
    ) {
        const canBack = oldState === "messages"
            || oldState === "friends"
            || oldState === null && window.innerWidth < 640;
        const onClose = (back: boolean) => showTab(back ? oldState : "none");
        let conversation: NM.ConversationInfo;
        if (typeof data === "number") {
            if (data === collocutorId) {
                conversationData.canClose = canClose;
                conversationData.canBack = canBack;
                conversationData.onClose = onClose;
                showTab("conversation");
                return;
            }
            try {
                conversation = await NMApi.user.getConversationInfo(data);
            } catch (reason) {
                alert(String(reason));
                return;
            }
        } else {
            conversation = data;
        }
        conversationData = {
            conversationId: conversation.id,
            collocutor: conversation.users.find(({ id }) => id !== currentUser.id)!,
            canBack,
            canClose,
            onClose,
        };
        collocutorId = conversationData.collocutor.id;
        showTab("conversation");
    }

    /**
     * Show the sidebar's tab, if `null`, just hides the current tab.
     * To show conversation, use `openConversation` method.
     * @param tab - the tab to show
     */
    export function showTab (tab: typeof state | null) {
        if (tab === null) {
            hidden = true;
        } else {
            if (tab === "conversation" && !conversationData) {
                tab = "none";
            }
            hidden = tab === "none";
            state = tab;
        }
    }

    let component: ComponentType<SvelteComponentTyped> | null = null;
    let componentProps: Record<string, any>;
    /**
     * Set or remove the overlay content
     * @param comp - the new content
     * @param props - optional, the content component props
     */
    export function showOverlay<
        T extends SvelteComponentTyped
    > (comp: ComponentType<T> | null, props?: ComponentProps<T>) {
        component = comp;
        componentProps = props ?? {};
    }
    $: document.body.style.overflow = component ? "hidden" : "";

    setContext("openTrade", openTrade);
    setContext("openConversation", openConversation);
    setContext("showOverlay", showOverlay);
</script>

<article class:hidden={hidden && !component}>
    {#if component}
        <section>
            <!-- recreate the component when the props get changed -->
            {#key componentProps}
                <svelte:component this={component} {...componentProps} />
            {/key}
        </section>
    {:else}
        <aside on:click={() => showTab("none")}></aside>
    {/if}
    <main>
        {#if state !== "conversation"}
            <nav>
                {#if !beginner}
                    <span class:active={state === "milestone"}
                        on:click={() => showTab("milestone")}
                    >
                        Milestones
                    </span>
                {/if}
                {#if showFriends}
                    <span class:active={state === "friends"}
                        on:click={() => showTab("friends")}
                    >
                        Friends
                        <FlagCounter color="#17C48D" value={$friendsOnline} />
                    </span>
                {/if}
                {#if canTrade}
                    <span class:active={state === "messages"}
                        on:click={() => showTab("messages")}
                    >
                        Trades &amp; Messages
                        <FlagCounter value={$unreadMessageAndTradeCount} />
                    </span>
                {/if}
                <span class:active={state === "notifications"}
                    on:click={() => showTab("notifications")}
                >
                    Alerts
                    <FlagCounter value={$unreadNotificationCount} />
                </span>
                <span>
                    <Icon icon="close" size="16px" on:click={() => showTab("none")} />
                </span>
            </nav>
        {/if}

        <div>
            {#if state === "milestone"}
                <Milestones/>
            {:else if state === "friends"}
                <Friends />
            {:else if state === "messages"}
                <TradeMessages />
            {:else if state === "notifications"}
                <Notifications />
            {:else if state === "conversation"}
                {#key collocutorId}
                    <Conversation {...conversationData} />
                {/key}
            {/if}
        </div>
    </main>
</article>

<style>
    article {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        z-index: 1100;
        align-content: stretch;
    }
    article.hidden {
        display: none;
    }
    section, aside {
        flex-grow: 1;
    }
    section {
        background: rgba(37,26,48,.9);
    }
    main {
        width: 360px;
        flex-shrink: 0;
        box-shadow: 0 0 50px #0002;
        z-index: 1;
        display: flex;
        flex-direction: column;
        background: white;
    }
    nav {
        flex-shrink: 0;
        height: 50px;
        border-bottom: 1px solid #e6e6e6;
        box-sizing: border-box;
        display: flex;
        padding: 17px 10px;
        gap: 16px;
        color: #5f5668;
        font-size: 13px;
    }
    nav span {
        cursor: pointer;
    }
    nav .active {
        color: #2c2830;
        display: inline-block;
        position: relative;
    }
    nav .active::after {
        content: "";
        display: block;
        height: 2px;
        position: absolute;
        left: 0;
        right: 0;
        bottom: -18px;
        background-image: linear-gradient(90deg,#61D3A5,#64b8d7,#B078B1);
    }
    nav > :last-child {
        height: 1em;
        font-weight: 600;
        color: black;
        margin-left: auto;
        position: relative;
        top: -5px;
        cursor: pointer;
    }
    nav > :last-child:not(:hover) {
        opacity: 0.4;
    }
    main > div {
        flex-grow: 1;
        overflow: auto;
        display: flex;
        flex-direction: column;
    }
</style>
