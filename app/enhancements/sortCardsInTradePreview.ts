import addPatches from "../utils/patchAngular";

/**
 * Sorts cards by rarity in a trade preview in the conversation
 */
addPatches(null, {
    names: ["partials/component/comments.partial.html"],
    patches: [{
        target: `comment.attachment.bidder_offer.prints`,
        append: ` | orderBy:'rarity.rarity':true`,
    }, {
        target: `comment.attachment.responder_offer.prints`,
        append: ` | orderBy:'rarity.rarity':true`,
    }],
});
