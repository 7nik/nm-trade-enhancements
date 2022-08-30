import type NM from "../utils/NMTypes";
import type { CreateSingletonInstance, CreateSingletonProps, Instance, Props } from "tippy.js";

import tippy, { createSingleton } from "tippy.js";
import { getTrades, type GetTrades } from "../utils/cardsInTrades";
import addPatches from "../utils/patchAngular";
import NMApi from "../utils/NMApi";
import TradePreviews from "../components/TradePreviews.svelte";

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
async function attachTip (elem: HTMLElement, tradeIds: number[], cardId?: number) {
    if (tradeIds.length === 0) return;

    const trades = await Promise.all(tradeIds.map((id) => NMApi.trade.get(id)));

    const tip = document.createElement("div");
    new TradePreviews({
        target: tip,
        props: {
            trades,
            highlightCardId: cardId,
        },
    }).$on("click", () => elem._tippy?.hide());

    // destroy previous tip if presented
    // eslint-disable-next-line no-underscore-dangle
    elem._tippy?.destroy();
    tippy(elem, {
        appendTo: document.body,
        delay: [350, 200],
        interactive: true,
        content: tip,
        theme: "trade",
    });
}

type CardScope = angular.IScope & {
    piece: NM.PrintInTrade,
    trades: number[],
}

type NotificationScope = angular.IScope & {
    notification?: NM.Event<object, string, string>,
    trade?: NM.Event<object, string, string>,
}

let currentTradeId = -1;
let tips: Record<number, Instance<Props>> = {};
let singleton: CreateSingletonInstance<CreateSingletonProps<Props>>;

/**
 * Shows in which trades the card is used if it is
 */
addPatches(() => {
    angular.module("Art").controller("nmUsageInTrades", [
        "$scope",
        "$element",
        ($scope: CardScope, $elem) => {
            $scope.trades = [];

            let initialized = false;
            function loadTrades (trades: GetTrades) {
                let tradeIds = trades.find($scope.piece, "both", "card");
                attachTip($elem[0], tradeIds, $scope.piece.id);
                if (initialized) {
                    // to notify angular about changes
                    $scope.$apply(() => { $scope.trades = tradeIds; });
                } else {
                    // cannot and need to use $apply during controller initialization
                    $scope.trades = tradeIds;
                }
            }
            const unsubscribe = getTrades.subscribe(loadTrades);
            $scope.$on("$destroy", unsubscribe);
            initialized = true;
        },
    ]);
    angular.module("Art").controller("tradePreview", [
        "$scope",
        "$element",
        (scope: NotificationScope, $elem: JQLite) => {
            if ((scope.notification ?? scope.trade)?.object.type !== "trade-event") return;
            const tradeId = ((scope.notification ?? scope.trade) as NM.TradeEvent).object.id;
            // the tip is bound to the element,
            // so create new tip for new element (notification)
            const tip = tippy($elem[0], {
                onTrigger: async (instance) => {
                    if (instance.props.content) return;
                    currentTradeId = tradeId;
                    const preview = document.createElement("div");
                    new TradePreviews({
                        target: preview,
                        props: {
                            trades: [await NMApi.trade.get(tradeId)],
                            showButton: false
                        },
                    });
                    // set only if it is still actual
                    if (currentTradeId === tradeId) {
                        instance.setContent(preview);
                    }
                },
                onShow: () => { document.body.contains($elem[0]); },
            });
            // and override the previous tips if there are any
            tips[tradeId] = tip;
            // if it's the first hovered notification ever
            if (!singleton) {
                singleton = createSingleton([tip], {
                    delay: [600, 200],
                    placement: "left",
                    theme: "trade sidebar",
                    overrides: ["onTrigger", "onShow"],
                });
            } else {
                singleton.setInstances(Object.values(tips));
            }
        }
    ]);
}, {
    // insert card usage on collection page
    names: ["partials/collection/collection-prints.partial.html"],
    patches: [{
        target: `title="Limited Edition"></span>`,
        append: `<span
            data-ng-controller="nmUsageInTrades"
            data-length="{{trades.length}}"
            class="card-trading-icon"></span>`,
    }],
}, {
    // insert card usage on series page
    names: ["partials/art/sett-checklist-rarity-group.partial.html"],
    patches: [{
        target: `</li>`,
        prepend: `<span
            data-ng-controller="nmUsageInTrades"
            data-length="{{trades.length}}"
            class="card-trading-icon"></span>`,
    }],
}, {
    names: ["partials/art/notifications/notification-center.partial.html"],
    patches: [{
        // add trade preview for notifications
        target: "art-notification=",
        prepend: `data-ng-controller="tradePreview" `
    }, {
        // add trade preview for active trades
        target: `ng-repeat="trade in state.trades track by trade.id"`,
        append: ` data-ng-controller="tradePreview"`
    }],
});

/**
 * Svelte action that adds a trade preview on hovering to an element
 * @param elem - the element to attach the trade preview
 * @param param.tradeIds - the trade ids to preview
 * @param param.cardId - a card to highlight in the trades
 */
export default function (elem: HTMLElement, { tradeIds, cardId }: { tradeIds: number[], cardId?: number }) {
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
