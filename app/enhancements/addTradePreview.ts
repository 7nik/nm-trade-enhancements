import type NM from "../utils/NMTypes";
import type Services from "../utils/NMServices";
import type { CreateSingletonInstance, CreateSingletonProps, Instance, Props } from "tippy.js";

import tippy, { createSingleton } from "tippy.js";
import cardsInTrades, { getTrades } from "../utils/cardsInTrades";
import addPatches from "../utils/patchAngular";
import { forAllElements, getScope } from "../utils/utils";
import NMApi from "../utils/NMApi";
import TradePreviews from "../components/TradePreviews.svelte";

/**
 * Adds a trade preview on hovering to an element
 * @param elem - the element to attach the trade preview
 * @param tradeIds - the trade ids to preview
 * @param cardId - a card to highlight in the trades
 */
async function attachTip (elem: HTMLElement, tradeIds: number[], cardId?: number) {
    // destroy previous tip if presented
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle
    elem._tippy?.destroy();
    if (tradeIds.length === 0) return;

    const trades = await Promise.all(tradeIds.map((id) => NMApi.trade.get(id)));

    const tip = document.createElement("div");
    new TradePreviews({
        target: tip,
        props: {
            trades,
            highlightCardId: cardId,
        },
    // @ts-ignore
    }).$on("click", () => elem._tippy?.hide());

    tippy(elem, {
        appendTo: document.body,
        delay: [500, 200],
        interactive: true,
        content: tip,
        theme: "trade",
    });
}

type Scope = angular.IScope & {
    print?: NM.PrintInTrade,
    piece?: NM.PrintInTrade,
    trades: number[],
}

/**
 * Shows in which trades the card is used if it is
 */
addPatches(() => {
    angular.module("nm.trades").controller("nmUsageInTrades", [
        "$scope",
        "$element",
        "nmTrades",
        ($scope: Scope, $elem, nmTrades: Services.NMTrade) => {
            const dir = $scope.print // if it's a trade window
                ? ($elem.closest(".trade--side.trade--you").length > 0 ? "give" : "receive")
                : "both";
            const lvl = dir === "give" ? "print" : "card";
            const currentTrade = $scope.print ? nmTrades.getId() : null;
            $scope.trades = [];

            async function loadTrades () {
                let trades = await getTrades($scope.print ?? $scope.piece!, dir, lvl);
                // exclude the current trade
                if (trades.length > 0 && currentTrade) {
                    trades = trades.filter((trade) => trade !== currentTrade);
                }
                attachTip($elem[0], trades, $scope.piece?.id);
                $scope.$apply(() => { $scope.trades = trades; });
            }

            if ($scope.print) {
                // when in a trade
                $scope.$watch(() => $scope.print!.print_id, loadTrades);
            } else {
                // when viewing the card
                $scope.$watch(() => cardsInTrades.lastUpdate, loadTrades);
            }
        },
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
    // insert card usage in trades
    names: [
        "/static/common/trades/partial/add.html",
        "/static/common/trades/partial/item-list.html",
    ],
    patches: [{
        target: "</li>",
        prepend: `
            <span data-ng-controller="nmUsageInTrades" class="card-trading">
                <span ng-if="trades.length === 1" class="text-warning">
                    Used in another trade
                </span>
                <span ng-if="trades.length > 1" class="text-warning">
                    Used in {{trades.length}} more trades
                </span>
            </span>`,
    }],
});

let currentTradeId = -1;
let tips: Record<number, Instance<Props>> = {};
let singleton: CreateSingletonInstance<CreateSingletonProps<Props>>;

/**
 * Allows to add previews to pending trades and trade notifications in the sidebar
 * @param {HTMLElement} notification - <li.nm-notification> or <li.nm-notifications-feed--item>
 */
async function addTradePreview (notification: HTMLElement) {
    const scope = getScope<{ notification: NM.TradeEvent, trade: NM.TradeEvent }>(notification);
    if (scope.notification && scope.notification.object.type !== "trade-event") return;
    const tradeId = (scope.notification ?? scope.trade).object.id;
    // the tip is bound to the element,
    // so create new tip for new element (notification)
    const tip = tippy(notification, {
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
        onShow: () => document.body.contains(notification) && void 0,
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

document.addEventListener("DOMContentLoaded", () => {
    forAllElements(document, "li.nm-notification, li.nm-notifications-feed--item", addTradePreview);
});
