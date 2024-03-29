import "./skipPromoPage"; // to prevent blocking by currentUser
import "./addArrowsOnCardView";
import "./addHotkeys";
import "./addLastActionAgo";
import "./addNumberOfSeekersAndNeeders";
import "./addRollbackTradeButton";
import "./addTradeEnhancementsSettings";
import "./addTradePreview";
import "./addTradeWindowEnhancements";
import "./addWishlistButton";
import "./fixAutoWithdrawnTrade";
import "./makePiecePeekable";
import "./patchPieceService";
import "./patchWebSockets";
import "./replaceCheckmarkWithNumber";
import "./sortCardsInTradePreview";

// hide all tips after clicking
window.addEventListener("click", (ev) => {
    if ((ev.target as HTMLElement).closest(".tip")) {
        for (const el of document.querySelectorAll("body>.tooltip")) {
            el.remove();
        }
    }
}, { capture: true });

// reset the list of the opened pack at midnight
const midnight = new Date();
midnight.setDate(midnight.getDate() + 1);
midnight.setHours(0, 0, 0, 0);
setTimeout(function reset () {
    NM.you.attributes.todays_freebies_count = {};
    // reset at the next midnight
    setTimeout(reset, 86_400_000);
}, midnight.getTime() - Date.now());
