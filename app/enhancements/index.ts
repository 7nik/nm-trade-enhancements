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
import "./skipPromoPage";
import "./sortCardsInTradePreview";

// hide all tips after clicking
window.addEventListener("click", (ev) => {
    if ((ev.target as HTMLElement).closest(".tip")) {
        for (let el of document.querySelectorAll("body>.tooltip")) {
            el.remove();
        }
    }
}, { capture: true });
