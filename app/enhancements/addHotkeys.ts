/**
 * Clicks the mentioned element if it exists
 * @param selector - element to click
 * @returns whether the element exists
 */
function click (selector: string) {
    const elem = document.querySelector(selector);
    if (!elem) return false;
    (elem as HTMLElement).click();
    return true;
}

/**
 * Allows you to confirm/decline a confirm message and close a trade by keyboard.
 * @param {Event} ev - keyup event
 */
 function addHotkeys (ev: KeyboardEvent) {
    // do not trigger hotkeys when user types a text
    const typing = ["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName!);

    if (!typing && ["Enter", "NumpadEnter", "Space"].includes(ev.code)
        && click("#message.show #confirm-btn, #message.show #ok-btn, #alert.show #alert-btn")
    ) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    if (ev.code === "Escape") {
        // if a confirm message is shown
        if (click("#message.show")) {
            ev.stopPropagation();
        // if a trade window is open
        } else if (click(".nm-modal--actionbar--left span")) {
            ev.stopPropagation();
        }
        // remove tippy tips
        document.querySelector("[data-tippy-root]")?.remove();
        // otherwise an overlay will be closed by the angular
    }
    if (ev.code === "ArrowRight") {
        click("#piece-detail-container .next");
    }
    if (ev.code === "ArrowLeft") {
        click("#piece-detail-container .previous");
    }
}

document.addEventListener("keyup", addHotkeys, true);

export default null;
