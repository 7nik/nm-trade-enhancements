import type { Instance } from '@popperjs/core/lib/popper-lite';
import type { Placement } from '@popperjs/core';
import type { Action } from "svelte/action";

import { createPopper } from '@popperjs/core/lib/popper-lite';
import { flip, offset, arrow, preventOverflow } from '@popperjs/core/lib/modifiers';

type Params = {
    placement?: Placement,
    showDelay?: number,
    hideDelay?: number,
    interactive?: boolean,
    singleton?: boolean,
    className: string,
};
const defaultParams: Params = {
    placement: "top",
    showDelay: 0,
    hideDelay: 0,
    interactive: false,
    singleton: false,
    className: "nmte-tooltip",
}

type ContentType = "text" | "html" | "element";
type Content<C extends ContentType> = (C extends "element" ? HTMLElement : string) | null;
type ContentProvider<C extends ContentType> = Content<C> | (() => Content<C> | Promise<Content<C>>);

function delay (ms: number) { return new Promise(res => setTimeout(res, ms)); }

function tooltip<C extends ContentType> (type: C, params: Params) {
    let fullParams = {...defaultParams, ...params};

    let tooltip: HTMLElement | null = null;
    let instance: Instance | null = null;
    let closing: NodeJS.Timeout | number | null = null;

    function hide () {
        tooltip?.remove();
        tooltip = null;
        if (instance) {
            const elem = instance.state.elements.reference as Element;
            elem.removeEventListener("mouseleave", startHiding);
            elem.removeEventListener("mouseenter", cancelHiding);
            elem.removeEventListener("click", hide);
            instance?.destroy();
            instance = null;
        }
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

    let key = 0;
    async function show (elem: HTMLElement, content: ContentProvider<C>) {
        key += 1;
        const localKey = key;
        if (fullParams.singleton) {
            cancelHiding();
        } else {
            // hide and clean up previous tip
            hide();
        }

        if (fullParams.showDelay && !(fullParams.singleton && instance)) {
            let canceled = false;
            elem.addEventListener("mouseleave", () => canceled = true, { once: true });
            await delay(fullParams.showDelay);
            if (canceled) return;
        }

        if (typeof content === "function") {
            let cont = content();
            if (cont instanceof Promise) cont = await cont;
            content = cont;
        }
        if (content === null) {
            // is singleton is shown
            if (instance) hide();
            return;
        }

        if (localKey !== key) return;

        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.className = fullParams.className;
        }
        let arrowElem = tooltip.firstElementChild;
        if (!arrowElem) {
            arrowElem = document.createElement("div");
            arrowElem.className = "arrow";
            arrowElem.innerHTML = `<svg viewBox="0 0 6 2"><path d="M3 2c.3 0 .6-.1.8-.3L4.9.6C5.2.3 5.6 0 6 0H0c.4 0 .8.3 1.1.6l1.1 1c.2.3.5.4.7.4H3z"></path></svg>`;
        }
        tooltip.innerHTML = "";
        switch (type) {
            case "text": tooltip.textContent = content as string; break;
            case "html": tooltip.innerHTML = content as string; break;
            case "element": tooltip.append(content); break;
        }
        tooltip.prepend(arrowElem);
        if (fullParams.interactive) {
            tooltip.addEventListener("mouseleave", startHiding);
            tooltip.addEventListener("mouseenter", cancelHiding);
            tooltip.addEventListener("click", hide);
        }
        document.body.append(tooltip);

        if (instance) {
            const prevElem = instance.state.elements.reference as Element;
            prevElem.removeEventListener("mouseleave", startHiding);
            prevElem.removeEventListener("mouseenter", cancelHiding);
            instance.state.elements.reference = elem;
            instance.update();
        } else {
            instance = createPopper(elem, tooltip, {
                placement: fullParams.placement,
                modifiers: [
                    flip,
                    preventOverflow,
                    offset,
                    { name: 'offset', options: { offset: [0, 8] } },
                    arrow,
                    { name: "arrow", options: { element: arrowElem } },
                ],
            });
        }
        elem.addEventListener("mouseleave", startHiding);
        elem.addEventListener("mouseenter", cancelHiding);
        elem.addEventListener("click", hide);
    }

    return [show, hide] as const;
}

type ContentGenerator<T, C extends ContentType> = Content<C> | ((arg:T) => Content<C> | Promise<Content<C>>);

export default <P, C extends ContentType>(
    type: C, params: Params, provider: ContentGenerator<P, C>
): Action<HTMLElement, P> =>
{
    const [showTooltip, hideTooltip] = tooltip(type, params);
    return (elem: HTMLElement, param?: P) => {
        elem.addEventListener("mouseenter", () => {
            if (!param) return;
            showTooltip(elem, typeof provider === "function" ? () => provider(param!) : provider);
        });
        return {
            update(p) {
                param = p;
            },
            destroy: hideTooltip,
        }
    }
}
