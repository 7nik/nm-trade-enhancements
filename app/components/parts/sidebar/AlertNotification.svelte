<script lang="ts">
    import type NM from "../../../utils/NMTypes";

    import { firstName, firstNamePossessive } from "../../../services/user";
    import { timeAgo } from "../../../utils/date";
    import Avatar from "../../elements/Avatar.svelte";
    import { liveListProvider } from "../../../utils/NMLiveApi";
    import { sharedTradePreview } from "../../tradePreviews";
    import { getContext } from "svelte";

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

    function markRead() {
        if (notification.read) return;
        liveListProvider("notifications").markRead(notification.id);
    }

    const openTrade = getContext<(id: number) => void>("openTrade");
        markRead();
        if (viewNotification(notification)) {
            ev.preventDefault();
            ev.stopPropagation();
        }
    }
</script>

<svelte:options immutable />

<li class="nm-notifications-feed--item user-status" class:unread={!notification.read}
    use:notificationPreview
>
    <a id="notification-{notification.id}"
        href={notification.object.url}
        class="nm-notification"
        on:click={notificationClick}
    >
        <Avatar user={notification.actor} size="small" class="nm-notification--icon user-status--icon" />
        <div class="user-status--attachment nm-notification--image {notification.object.images_class}">
            {#each notification.object.images as src}
                <img {src} alt="Notification thumbnail">
            {/each}
        </div>
        <div class="nm-notification--content user-status--content">
            <span class="nm-notification--story text-subdued">
                {#if verbPhrase}
                    <span class="nm-notification--story-content">
                        <strong>{firstName(notification.actor)}</strong>
                    <span>{verbPhrase}</span>
                    </span>
                {/if}
                {#if notification.actor.action_data}
                    <span class="nm-notification--story-comment text-prominent text-emphasis">
                        {notification.actor.action_data}
                    </span>
                {/if}
            </span>
            <span class="nm-notification--meta text-subdued text-emphasis">
                <time>{timeAgo(notification.actor.time)}</time>
                <i class="icon-checkmark dark nm-notification--mark-read tip" title="Mark as read"
                    on:click|preventDefault|stopPropagation={markRead}
                ></i>
            </span>
        </div>
    </a>
</li>
