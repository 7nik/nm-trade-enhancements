import tooltip from "../../utils/tooltip";

import "./tip.css";

/**
 * A svelte action for adding a tooltip
 * @param elem - element to trigger the tooltip
 * @param hint - the tooltip text
 */
export default tooltip(
    "text",
    { className: "nmte-tip" },
    (text:string) => text,
);

/**
 * A svelte action for adding a tooltip with HTML support
 * @param elem - element to trigger the tooltip
 * @param hint - the tooltip HTML
 */
const htmlTip = tooltip(
    "html",
    { className: "nmte-tip" },
    (html:string) => html,
);
export { htmlTip };
