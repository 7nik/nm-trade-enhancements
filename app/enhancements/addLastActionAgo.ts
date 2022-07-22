import { MutationSummary } from "mutation-summary";
import NMApi from "../utils/NMApi";
import { forAllElements, getScope } from "../utils/utils";


/**
 * Adds how ago was last action of the user
 * @param {HTMLElement} header - <div.nm-conversation--header>
 */
async function addLastActionAgo (header: HTMLElement, watchForChanges = true) {
    // TODO: move the logic to angular
    const userId: number = getScope<any>(header).recipient.id;
    const actions = await NMApi.user.activityFeed(userId);
    const lastActionAgo = actions[0]?.created ?? "one eternity ago";

    const div = document.createElement("div");
    div.className = "last-action";
    div.innerHTML = `last action: <i>${lastActionAgo}</i>`;
    const container = header.querySelector(".nm-conversation--header h3")!;
    container.append(div);

    if (watchForChanges === false) return;

    new MutationSummary({
        rootNode: container.querySelector("a")!,
        queries: [{ characterData: true }],
        callback: () => {
            header.querySelector(".last-action")?.remove();
            addLastActionAgo(header, false);
        },
    });
}

document.addEventListener("DOMContentLoaded", () => {
    forAllElements(document, "div.nm-conversation--header", addLastActionAgo);
});
