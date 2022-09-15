import type NM from "../utils/NMTypes";

import { getTrades, type GetTrades } from "../utils/cardsInTrades";
import addPatches from "../utils/patchAngular";
import { tradePreview, sharedTradePreview } from "../components/tradePreviews";

type CardScope = angular.IScope & {
    piece: NM.PrintInTrade,
    trades: number[],
}

type NotificationScope = angular.IScope & {
    notification?: NM.Notification<object, string, string>,
    trade?: NM.Notification<object, string, string>,
}

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
                tradePreview($elem[0], { tradeIds, cardId: $scope.piece.id });
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
            const tradeId = (scope.notification ?? scope.trade)!.object.id;
            sharedTradePreview($elem[0], tradeId);
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
