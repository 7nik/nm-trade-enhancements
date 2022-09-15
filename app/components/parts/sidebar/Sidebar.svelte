<script lang="ts">
    import type NM from "../../../utils/NMTypes";
    import type { ComponentProps, ComponentType, SvelteComponentTyped } from "svelte";

    import { derived } from "svelte/store";
    import { friendList } from "../../../services/user";
    import currentUser from "../../../services/currentUser";
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import FlagCounter from "../../elements/FlagCounter.svelte";
    import Conversation from "./Conversation.svelte";
    import Friends from "./Friends.svelte";
    import Milestones from "./Milestones.svelte";
    import Notifications from "./Notifications.svelte";
    import TradeMessages from "./TradeMessages.svelte";
    import NMApi from "../../../utils/NMApi";

    export let openTrade: (data: NM.User) => void;

    let hidden = true;
    let state: "none"|"milestone"|"friends"|"messages"|"notifications"|"conversation" = "none";

    let beginner = currentUser.areFeaturesGated;
    let showFriends = currentUser.canDo("friend");
    let canTrade = currentUser.canDo("trade");

    const unreadMessageAndTradeCount = derived(
        [liveListProvider("messages").store, liveListProvider("trades").store],
        ([messages, trades]) => {
            return messages.filter((msg) => !msg.read).length
                + trades.filter((trade) => trade.actor.id !== currentUser.id).length;
        },
    );
    const unreadNotificationCount = derived(
        liveListProvider("notifications").store,
        (notifications) => notifications.filter((n) => !n.read).length
    );
    const friendsOnline = friendList.getOnlineNumber();

    let collocutorId: number;
    let conversationData: {
        conversationId: number,
        collocutor: NM.UserCollocutor,
        canClose: boolean,
        canBack: boolean,
        onClose: ((back: boolean) => void),
        openTrade: typeof openTrade,
    };
    /**
     * Show a conversation tab
     * @param data - the collocutor's ID or the conversation's data
     */
    export async function openConversation(
        data: NM.ConversationInfo | number, 
        canClose = true, 
        oldState: typeof state | null = state
    ) {
        let conversation: NM.ConversationInfo;
        if (typeof data === "number") {
            if (data === collocutorId) {
                showTab("conversation");
                return;
            }
            conversation = await NMApi.user.getConversationInfo(data);
        } else {
            conversation = data;
        }
        conversationData = {
            conversationId: conversation.id,
            collocutor: conversation.users.find(({ id }) => id !== currentUser.id)!,
            canBack: oldState === "messages" || oldState === "friends" || oldState === null && window.innerWidth < 640,
            canClose,
            onClose: (back) => { showTab(back ? oldState : "none"); },
            openTrade,
        };
        collocutorId = conversationData.collocutor.id;
        showTab("conversation");
    }

    /**
     * Show the sidebar's tab, if `null`, just hides the current tab.
     * To show conversation, use `openConversation` method.
     * @param tab - the tab to show
     */
    export function showTab(tab: typeof state | null) {
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
    export function showOverlay<T extends SvelteComponentTyped>(comp: ComponentType<T> | null, props?: ComponentProps<T>) {
        component = comp;
        componentProps = props ?? {};
    }

    $: document.body.style.overflow = component ? "hidden" : "";
</script>

<div class="nmte-overlay" hidden={hidden && !component}>
    {#if component}
        <div class="nm-overlay modal trade-modal nm-overlay-content">
            <!-- recreate the component when the props get changed -->
            {#key componentProps} 
                <svelte:component this={component} {...componentProps} />
            {/key}
        </div>
    {:else}
        <div class="nm-notifications--backdrop" on:click={() => showTab("none")}></div>
    {/if}
    <div class="nm-notifications {state}" id="notification-center" {hidden}>
        {#if state !== "conversation"}
            <div class="nm-notifications--nav nm-segmented-ui-controller text-small">
                {#if !beginner}
                    <a id="milestone-list-button"
                        class:segment-shown={state === "milestone"}
                        on:click={() => showTab("milestone")}
                    >
                        <span>Milestones</span>
                    </a>
                {/if}
                {#if showFriends}
                    <a id="friends-list-button"
                        class:segment-shown={state === "friends"}
                        on:click={() => showTab("friends")}
                    >
                        <span>
                            Friends
                            <FlagCounter class="friends nm-friends--count-flag"
                                value={$friendsOnline}
                            />
                        </span>
                    </a>
                {/if}
                {#if canTrade}
                    <a id="messages-feed-button"
                        class:segment-shown={state === "messages"}
                        on:click={() => showTab("messages")}
                    >
                        <span>
                            Trades &amp; Messages
                            <FlagCounter class="nm-messages--unread-flag"
                                value={$unreadMessageAndTradeCount}
                            />
                        </span>
                    </a>
                {/if}
                <a id="notifications-feed-button"
                class:segment-shown={state === "notifications"}
                on:click={() => showTab("notifications")}>
                    <span>
                        Alerts
                        <FlagCounter class="nm-messages--unread-flag"
                            value={$unreadNotificationCount}
                        />
                    </span>
                </a>
                <span class="nm-notifications--close" 
                    on:click={() => showTab("none")}
                >
                    <i class="close-x small">&times;</i>
                </span>
            </div>
        {/if}

        <div class="nm-notifications--content">
            {#if state === "milestone"}
                <Milestones/>
            {:else if state === "friends"}
                <Friends {openConversation} />
            {:else if state === "messages"}
                <TradeMessages {openConversation} />
            {:else if state === "notifications"}
                <Notifications />
            {:else if state === "conversation"}
                {#key collocutorId}
                    <Conversation {...conversationData} />
                {/key}
            {/if}
        </div>
    </div>
</div>

<style>
    .nmte-overlay:not([hidden]) {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        z-index: 1100;
        align-content: center;
    }
    .nm-notifications--backdrop {
        position: static;
        flex-grow: 1;
    }
    .nm-overlay {
        flex-grow: 1;
        visibility: visible;
        opacity: 1;
        position: static;
        display: flex;
        align-items: center;
        text-align: initial;
        padding: 40px 0 40px 32px;
    }
    .nm-notifications {
        flex-grow: 0;
        flex-shrink: 0;
        position: relative;
    }

    .nm-notifications :global(.load-indicator.large) {
        display: block;
        margin: 40vh auto 0;
    }
</style>
