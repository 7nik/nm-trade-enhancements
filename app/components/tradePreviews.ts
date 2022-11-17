import type { Instance, Props } from "tippy.js";

import TradePreviews from "./TradePreviews.svelte";
import tippy, { createSingleton } from "tippy.js";
import NMApi from "../utils/NMApi";
import Icon from "./elements/Icon.svelte";

declare global {
    interface HTMLElement {
        _tippy?: Instance
    }
}

/**
 * Adds a trade preview on hovering to an element
 * @param elem - the element to attach the trade preview
 * @param tradeIds - the trade ids to preview
 * @param cardId - a card to highlight in the trades
 */
async function attachTip (elem: HTMLElement, tradeIds: number[] | null, cardId?: number) {
    // destroy previous tip if presented
    // eslint-disable-next-line no-underscore-dangle
    elem._tippy?.destroy();

    if (!tradeIds || tradeIds.length === 0) return;

    const trades = await Promise.all(tradeIds.map((id) => NMApi.trade.get(id)));

    const tip = document.createElement("div");
    new TradePreviews({
        target: tip,
        props: {
            trades,
            highlightCardId: cardId,
        },
    }).$on("click", () => elem._tippy?.hide());

    tippy(elem, {
        appendTo: document.body,
        delay: [350, 200],
        interactive: true,
        content: tip,
        theme: "trade",
    });
}

/**
 * Adds to the element a trade preview
 * @param elem - the element for triggering the preview
 * @param option.tradeIds - the IDs of the trades to preview
 * @param option.cardId - optional, the card ID to highlight
 */
export function tradePreview (elem: HTMLElement, { tradeIds, cardId }: { tradeIds: number[] | null, cardId?: number }) {
    attachTip(elem, tradeIds, cardId);
    return {
        update({ tradeIds, cardId }: { tradeIds: number[], cardId?: number }) {
            elem._tippy?.destroy();
            attachTip(elem, tradeIds, cardId);
        },
        destroy() {
            elem._tippy?.destroy();
        }
    }
}

let currentTradeId = -1;
const tips: Record<number, Instance<Props>> = {};
let singleton = createSingleton([], {
    delay: [600, 200],
    placement: "left",
    theme: "trade sidebar",
    overrides: ["onTrigger", "onShow"],
});

/**
 * Adds to the element a trade preview with the shared tooltip window
 * @param elem - the element for triggering the preview
 * @param tradeId - the ID of the trade to preview
 */
export function sharedTradePreview (elem: HTMLElement, tradeId: number) {
    // the tip is bound to the element,
    // so create new tip for new element (notification)
    const tip = tippy(elem, {
        onTrigger: async (instance) => {
            if (instance.props.content) return;
            currentTradeId = tradeId;
            const preview = document.createElement("div");
            const loader = new Icon({
                target: preview,
                props: {
                    icon: "loader",
                    size: "40px",
                },
            });
            instance.setContent(preview);

            const trade = await NMApi.trade.get(tradeId);
            // set only if it is still actual
            if (currentTradeId === tradeId) {
                loader.$destroy();
                new TradePreviews({
                    target: preview,
                    props: {
                        trades: [trade],
                        showButton: false
                    },
                });
                instance.setContent(preview);
            }
        },
        onShow: () => document.body.contains(elem) ? undefined : false,
    });
    // and override the previous tips if there are any
    tips[tradeId] = tip;
    singleton.setInstances(Object.values(tips));
    // it is supposed that `tradeId` never changes so return nothing
}
