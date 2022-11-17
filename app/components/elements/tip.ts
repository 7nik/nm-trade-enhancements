import tippy from "tippy.js";

/**
 * Attach a text tooltip to the element
 * @param elem - element to trigger the tooltip
 * @param hint - the tooltip text
 */
function attachTip (elem: HTMLElement, hint: string) {
    // destroy previous tip if presented
    // eslint-disable-next-line no-underscore-dangle
    elem._tippy?.destroy();

    if (!hint) return;

    tippy(elem, {
        appendTo: document.body,
        content: hint,
        theme: "tooltip",
    });
}

/**
 * A svelte action for adding a tooltip
 * @param elem - element to trigger the tooltip
 * @param hint - the tooltip text
 */
export default function tradePreview (elem: HTMLElement, hint: string) {
    attachTip(elem, hint);
    return {
        update: attachTip.bind(null, elem),
        destroy() {
            elem._tippy?.destroy();
        }
    }
}
