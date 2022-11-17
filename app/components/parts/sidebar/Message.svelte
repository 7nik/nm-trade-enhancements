<script lang="ts">
    import type NM from "../../../utils/NMTypes";

    import { firstName } from "../../../services/user";
    import currentUser from "../../../services/currentUser";
    import { timeAgo } from "../../../utils/date";
    import { linky } from "../../../utils/utils";
    import Avatar from "../../elements/Avatar.svelte";
    import TradePreviews from "../../TradePreviews.svelte";

    export let message: NM.Message;
    export let collocutor: NM.UserCollocutor;
    export let isCondensed = false;

    const commenter = message.user_id === currentUser.id ? currentUser.you : collocutor;    
    let isTradeActive = message.attachment?.active ?? false;

    // converts the attachment into TradePreview compatible object
    function makeTradeObject(data: Exclude<NM.Message["attachment"], undefined>) {
        const youAreBidder = data.bidder_id === currentUser.id;
        // make the prints go in descending order of rarity
        data.bidder_offer.prints.reverse().sort((a, b) => b.rarity.rarity - a.rarity.rarity);
        data.responder_offer.prints.reverse().sort((a, b) => b.rarity.rarity - a.rarity.rarity);
        return {
            ...data,
            bidder: youAreBidder ? currentUser.you : collocutor,
            responder: youAreBidder ? collocutor : currentUser.you
        };
    }
</script>

<svelte:options immutable />

<li class="comment {isCondensed ? "condensed" : "non-condensed"}" 
    class:with-attachment={message.attachment}
>
    <a class="comment--icon" target="_self" href={commenter.links.profile}>
        <Avatar user={commenter} />
    </a>
    <div class="comment--content">
        {#if message.attachment?.type === "trade"}
            <div
                class="comment--attachment trade {message.attachment.state}"
                class:active={isTradeActive}
            >
                <span class="text-prominent comment--heading">
                    {firstName(commenter)} {message.comment}
                </span>
                <time class="comment--time text-emphasis">
                    {timeAgo(message.created)}
                </time>
                <span
                    class="text-link comment--trade-details-link"
                    on:click={() => isTradeActive = !isTradeActive}
                >
                    {#if isTradeActive}
                        <TradePreviews trades={[makeTradeObject(message.attachment)]} />
                    {:else}
                        Show Details
                    {/if}
                </span>
            </div>
        {:else}
            <div class="comment--default">
                <a class="text-prominent comment--heading"
                    target="_self" href={commenter.links.profile}
                >
                    {firstName(commenter)}
                </a>
                <time class="comment--time text-emphasis">
                    {timeAgo(message.created)}
                </time>
                <div class="comment--text">
                    {linky(message.comment)}
                </div>
            </div>
        {/if}
    </div>
</li>
