import "./tooltip.css";

import type { Placement } from "@floating-ui/dom";
import type { Action } from "svelte/action";

import {
    autoUpdate,
    computePosition,
    offset,
    shift,
    flip,
    arrow,
} from "@floating-ui/dom";

type TooltipParams = {
    placement?: Placement,
    showDelay?: number,
    hideDelay?: number,
    interactive?: boolean,
    singleton?: boolean,
    className: string,
};
const defaultParams: TooltipParams = {
    placement: "top",
    showDelay: 0,
    hideDelay: 0,
    interactive: false,
    singleton: false,
    className: "nmte-tooltip",
};

type ContentType = "text" | "html" | "element";
type Content<C extends ContentType> = (C extends "element" ? HTMLElement : string) | null;
type ContentProvider<C extends ContentType> = Content<C> | (() => Content<C> | Promise<Content<C>>);

const ARROW = `<svg viewBox="0 0 6 2">
<path d="M3 2c.3 0 .6-.1.8-.3L4.9.6C5.2.3 5.6 0 6 0H0c.4 0 .8.3 1.1.6l1.1 1c.2.3.5.4.7.4H3z">
</path>
</svg>`;

let container: HTMLElement;
function attachTip (tip: HTMLElement) {
    if (!container) {
        container = document.createElement("div");
        container.id = "nmte-tips";
        document.body.append(container);
    }
    container.append(tip);
}

function delay (ms: number) {
    return new Promise((res) => { setTimeout(res, ms); });
}

function tooltip<C extends ContentType> (type: C, params: TooltipParams) {
    const fullParams = { ...defaultParams, ...params };

    const arrowElem = document.createElement("div");
    arrowElem.className = "arrow";
    arrowElem.innerHTML = ARROW;

    let tip: HTMLElement | null = null;
    // let instance: Instance | null = null;
    let closing: NodeJS.Timeout | null = null;
    let stopListeners: (() => void) | null = null;

    function hide () {
        tip?.remove();
        tip = null;
        stopListeners?.();
        stopListeners = null;
        closing = null;
    }

    function startHiding () {
        if (fullParams.hideDelay) {
            closing = setTimeout(hide, 200);
        } else {
            hide();
        }
    }

    function cancelHiding () {
        if (!closing) return;
        clearTimeout(closing);
        closing = null;
    }

    async function startShowing (elem: HTMLElement, contentProvider: ContentProvider<C>) {
        if (fullParams.singleton) {
            cancelHiding();
        } else {
            // hide and clean up previous tip
            hide();
        }
        let canceled = false;
        // do delay if needed
        if (fullParams.showDelay && !(fullParams.singleton && tip)) {
            elem.addEventListener("mouseleave", () => { canceled = true; }, { once: true });
            await delay(fullParams.showDelay);
            if (canceled) return;
        }
        const content = typeof contentProvider === "function"
            ? (await contentProvider())
            : contentProvider;
        if (canceled) return;
        // ensure the tooltip still need to be shown
        if (content && document.contains(elem)) {
            show(elem, content);
        } else if (tip) {
            // if singleton is shown
            hide();
        }
    }

    function show (elem: HTMLElement, content: HTMLElement | string) {
        // create the tooltip and add the content
        if (tip) {
            stopListeners?.();
        } else {
            tip = document.createElement("div");
            tip.className = fullParams.className;
        }
        if (type === "html" && typeof content === "string") {
            tip.innerHTML = content;
        } else {
            tip.innerHTML = "";
            tip.append(content);
        }
        tip.prepend(arrowElem);
        if (fullParams.interactive) {
            tip.addEventListener("mouseleave", startHiding);
            tip.addEventListener("mouseenter", cancelHiding);
            tip.addEventListener("click", hide);
        }
        attachTip(tip);

        // display to tooltip
        const stopTip = autoUpdate(elem, tip, () => {
            if (!tip || !document.contains(elem)) {
                hide();
                return;
            }
            computePosition(elem, tip, {
                placement: fullParams.placement,
                middleware: [
                    offset(8),
                    shift(),
                    flip(),
                    arrow({ element: arrowElem }),
                ],
            }).then(({
                x, y, placement, middlewareData,
            }) => {
                if (tip) {
                    tip.style.left = `${x}px`;
                    tip.style.top = `${y}px`;
                    tip.dataset.placement = placement;
                }
                if (middlewareData.arrow) {
                    arrowElem.style.left = `${middlewareData.arrow.x}px`;
                    arrowElem.style.top = `${middlewareData.arrow.y}px`;
                }
            });
        });
        // Listeners to hide the tooltip
        elem.addEventListener("mouseleave", startHiding);
        elem.addEventListener("mouseenter", cancelHiding);
        elem.addEventListener("click", hide);
        stopListeners = () => {
            elem.removeEventListener("mouseleave", startHiding);
            elem.removeEventListener("mouseenter", cancelHiding);
            elem.removeEventListener("click", hide);
            stopTip();
        };
    }

    return [startShowing, hide] as const;
}

type ContentGenerator<T, C extends ContentType> =
    Content<C> | ((arg: T) => Content<C> | Promise<Content<C>>);

export default <Params, C extends ContentType>(
    type: C,
    params: TooltipParams,
    provider: ContentGenerator<Params, C>,
): Action<HTMLElement, Params> => {
    const [showTooltip, hideTooltip] = tooltip(type, params);
    return (elem: HTMLElement, param?: Params) => {
        elem.addEventListener("mouseenter", () => {
            if (!param) return;
            showTooltip(elem, typeof provider === "function" ? () => provider(param!) : provider);
        });
        elem.addEventListener("touchstart", (ev) => {
            if (!param) return;
            ev.preventDefault();
            showTooltip(elem, typeof provider === "function" ? () => provider(param!) : provider);

            const backdrop = document.createElement("div");
            backdrop.classList.add("backdrop");
            backdrop.addEventListener("touchstart", () => {
                hideTooltip();
                backdrop.remove();
            }, { once: true });
            attachTip(backdrop);
        });
        return {
            update (p) {
                param = p;
            },
            destroy: hideTooltip,
        };
    };
};
