import tippy from "tippy.js";

/**
 * Attach a text tooltip to the element
 * @param elem - element to trigger the tooltip
 * @param hint - the tooltip text
 */
function attachTip (elem: HTMLElement, hint: string | { html: string }) {
    // destroy previous tip if presented
    // eslint-disable-next-line no-underscore-dangle
    elem._tippy?.destroy();

    const allowHTML = typeof hint === "object";
    const content = allowHTML ? hint.html : hint;
    if (!content) return;

    tippy(elem, {
        appendTo: document.body,
        theme: "tooltip",
        allowHTML,
        content,
    });
}

/**
 * A svelte action for adding a tooltip
 * @param elem - element to trigger the tooltip
 * @param hint - the tooltip text
 */
export default function (elem: HTMLElement, hint: string | { html: string }) {
    attachTip(elem, hint);
    return {
        update: attachTip.bind(null, elem),
        destroy() {
            elem._tippy?.destroy();
        }
    }
}
