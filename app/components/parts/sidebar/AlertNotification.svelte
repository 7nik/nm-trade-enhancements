<script lang="ts">
    import type NM from "../../../utils/NMTypes";

    import { firstName, firstNamePossessive } from "../../../services/user";
    import Avatar from "../../elements/Avatar.svelte";
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import { sharedTradePreview } from "../../tradePreviews";
    import Icon from "../../elements/Icon.svelte";
    import { getContext } from "svelte";
    import CoreCompleted from "../../dialogs/CoreCompleted.svelte";
    import { createDialog } from "../../dialogs/modals";
    import Time from "../../elements/Time.svelte";

    /**
     * The notification to display
     */
    export let notification: NM.Notification<object, string, string>;

    let verbPhrase = notification.verb_phrase;
    // getVerbPhrase
    {
        const noun = notification.object.noun;
        const ending = notification.actor.action_data ? ":" : ".";
            // is it even used?
            if (["proposed", "withdrew", "modified"].includes(verbPhrase)) {
                verbPhrase = `${verbPhrase} a ${noun} to ${firstName(notification.object.users[0])}${ending}`;
            } else if (verbPhrase === "expired") {
                verbPhrase = `let ${firstNamePossessive(notification.object.users[0])} ${noun} expire.`;
            } else if (notification.verb === "friend") {
                verbPhrase = `${verbPhrase} ${firstName(notification.object.users[0])} as a friend.`;
            } else if (["submission-series", "coming-soon", "leveled-up", "series-completed"].includes(notification.verb)) {
                verbPhrase = ""; // We will have action_data coming from backend
            } else if (notification.object.users.length > 0) {
                const list = notification.object.users
                    .flatMap((user, i, {length}) =>  i === length-1
                        ? [length === 1 ? "" : "and ", firstNamePossessive(user)]
                        : [firstName(user), length > 2 ? ", " : " "]
                    )
                    .join("");
                 verbPhrase = `${verbPhrase} ${list} ${noun}${ending}`;
            } else {
                verbPhrase = verbPhrase + " the " + noun + ending;
            }
    }

    const notificationPreview = notification.object.type === "trade-event"
        ? (elem: HTMLElement) => { sharedTradePreview(elem, notification.object.id); }
        : () => {};

    function markRead(ev: Event) {
        if (notification.read) return;
        liveListProvider("notifications").markRead(notification.id);
        ev.stopPropagation();
    }

    const openTrade = getContext<(id: number) => void>("openTrade");
    function notificationClick(ev: Event & {currentTarget:HTMLAnchorElement}) {
        markRead(ev);
        ev.preventDefault();

        switch (notification.object.type) {
            case "trade-event":
                openTrade(notification.object.id);
                break;
            case "series-completed":
                const data = notification.object as unknown as NM.Reward;
                createDialog(CoreCompleted, { data });
                break;
            case "Series-remainder":
            case "badge-obtained":
                window.open(ev.currentTarget.href);
                break;
        }
    }
</script>

<svelte:options immutable />

<a href={notification.object.url}
    class:unread={!notification.read}
    on:click={notificationClick}
    use:notificationPreview
>
    <Avatar user={notification.actor} />
    <section>
        <div>
            {#if verbPhrase}
                <strong>{firstName(notification.actor)}</strong>
                {verbPhrase}
            {/if}
            {#if notification.actor.action_data}
                <i>{notification.actor.action_data}</i>
            {/if}
        </div>
        <div class="bottom">
            <Time stamp={notification.actor.time} />
            {#if !notification.read}
                <span class="read">
                    <Icon icon="checkmark" size="14px" hint="Mark as read" on:click={markRead} />
                </span>
            {/if}
        </div>
    </section>
    <img src={notification.object.images[0]} alt="Notification thumbnail">
</a>

<style>
    a {
        padding: 7.5px 10px;
        gap: 0 10px;
        text-decoration: none;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        cursor: pointer;
        font-size: 14px;
        font-weight: 400;
    }
    a.unread {
        background: rgba(75,187,245,.2);
    }
    a:hover {
        background: #f4f4f4;
    }
    :global(a) + a::before {
        content: "";
        display: block;
        height: 1px;
        width: 100%;
        background: #efefef;
        margin: 0 -10px 0 50px;
        position: relative;
        top: -9px;
    }
    a:hover::before {
        background: transparent;
    }
    section {
        flex-grow: 1;
        max-width: calc(100% - 100px);
        display: flex;
        gap: 2px;
        flex-direction: column;
        justify-content: center;
        color: #857a90;
    }
    div.bottom {
        display: flex;
        justify-content: space-between;
    }
    strong, i {
        color: #2c2830;
        font-weight: 400;
    }
    .unread:not(:hover) .read {
        display: none;
    }
    img {
        max-width: 40px;
    }
</style>
