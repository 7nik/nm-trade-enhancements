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
    let currentTarget: HTMLElement | null = null;
    let closing: NodeJS.Timeout | null = null;
    let stopListeners: (() => void) | null = null;

    function hide () {
        tip?.remove();
        tip = null;
        stopListeners?.();
        stopListeners = null;
        closing = null;
        currentTarget = null;
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

    async function startShowing (
        elem: HTMLElement,
        contentProvider: ContentProvider<C>,
        touch = false,
    ) {
        if (fullParams.singleton) {
            cancelHiding();
        } else {
            // hide and clean up previous tip
            hide();
        }
        let canceled = false;
        // do delay if needed
        if (fullParams.showDelay && !touch && !(fullParams.singleton && tip)) {
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
            show(elem, content, touch);
        } else if (tip) {
            // if singleton is shown
            hide();
        }
    }

    function show (elem: HTMLElement, content: HTMLElement | string, touch: boolean) {
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
            if (!touch) {
                tip.addEventListener("mouseleave", startHiding);
                tip.addEventListener("mouseenter", cancelHiding);
            }
            tip.addEventListener("click", hide);
        }
        attachTip(tip);

        // display the tooltip
        const stopTracking = autoUpdate(elem, tip, trackTip.bind(null, elem));
        currentTarget = elem;
        // Listeners to hide the tooltip
        if (touch) {
            elem.addEventListener("touchstart", hide);
        } else {
            elem.addEventListener("mouseleave", startHiding);
            elem.addEventListener("mouseenter", cancelHiding);
            elem.addEventListener("click", hide);
        }
        stopListeners = () => {
            if (touch) {
                elem.removeEventListener("touchstart", hide);
            } else {
                elem.removeEventListener("mouseleave", startHiding);
                elem.removeEventListener("mouseenter", cancelHiding);
                elem.removeEventListener("click", hide);
            }
            stopTracking();
        };
    }

    function trackTip (elem: HTMLElement) {
        if (!tip || !document.contains(elem)) {
            hide();
            return;
        }
        computePosition(elem, tip, {
            placement: fullParams.placement === "left" && window.innerWidth <= 640
                ? "top"
                : fullParams.placement,
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
    }

    return [startShowing, hide, () => currentTarget] as const;
}

type ContentGenerator<T, C extends ContentType> =
    Content<C> | ((arg: T) => Content<C> | Promise<Content<C>>);

export default <Params, C extends ContentType>(
    type: C,
    params: TooltipParams,
    provider: ContentGenerator<Params, C>,
): Action<HTMLElement, Params> => {
    const [showTooltip, hideTooltip, getCurrentTarget] = tooltip(type, params);

    function hideTip (target: any) {
        if (getCurrentTarget() === target) {
            hideTooltip();
        }
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    return (target: HTMLElement, param?: Params) => {
        target.addEventListener("mouseenter", () => {
            // if nothing to show or is already displayed
            if (!param || getCurrentTarget() === target) return;
            showTooltip(
                target,
                typeof provider === "function" ? () => provider(param!) : provider,
            );
        });
        target.addEventListener("touchstart", (ev) => {
            if (!param) return;
            if (target.tagName === "A" || target.firstElementChild?.tagName === "A") {
                if (getCurrentTarget() === target) {
                    hideTip(target);
                    return;
                }
                ev.preventDefault();
            }
            showTooltip(
                target,
                typeof provider === "function" ? () => provider(param!) : provider,
                true,
            );

            if (type === "element") {
                let skip = true;
                window.addEventListener("touchend", function fn (event) {
                    if (container.contains(event.target as HTMLElement)) return;
                    if (skip) {
                        skip = false;
                    } else {
                        hideTip(target);
                        window.removeEventListener("touchend", fn, { capture: true });
                    }
                }, { capture: true });
            } else {
                setTimeout(() => hideTip(target), type === "text" ? 1500 : 3000);
            }
        });
        return {
            update (p) {
                param = p;
            },
            destroy () {
                hideTip(target);
            },
        };
    };
};
