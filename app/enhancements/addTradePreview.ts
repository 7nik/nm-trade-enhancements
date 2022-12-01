import type NM from "../utils/NMTypes";

import { tradePreview, sharedTradePreview } from "../components/actions/tradePreviews";
import { getTrades } from "../services/tradingCards";
import addPatches from "../utils/patchAngular";

type CardScope = angular.IScope & {
    piece: NM.PrintInTrade,
    trading: boolean,
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
            $scope.trading = false;

            let initialized = false;
            const unsubscribe = getTrades($scope.piece, "both", "card").subscribe((tradeIds) => {
                tradePreview($elem[0], { tradeIds, cardId: $scope.piece.id });
                if (initialized) {
                    // to notify angular about changes
                    $scope.$apply(() => { $scope.trading = !!tradeIds; });
                } else {
                    // cannot and need to use $apply during controller initialization
                    $scope.trading = !!tradeIds;
                }
            });
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
        },
    ]);
}, {
    // insert card usage on collection page
    names: ["partials/collection/collection-prints.partial.html"],
    patches: [{
        target: `title="Limited Edition"></span>`,
        append: `<span
            data-ng-controller="nmUsageInTrades"
            trading="{{trading}}"
            class="card-trading-icon"></span>`,
    }],
}, {
    // insert card usage on series page
    names: ["partials/art/sett-checklist-rarity-group.partial.html"],
    patches: [{
        target: `</li>`,
        prepend: `<span
            data-ng-controller="nmUsageInTrades"
            trading="{{trading}}"
            class="card-trading-icon"></span>`,
    }],
}, {
    names: ["partials/art/notifications/notification-center.partial.html"],
    patches: [{
        // add trade preview for notifications
        target: "art-notification=",
        prepend: `data-ng-controller="tradePreview" `,
    }, {
        // add trade preview for active trades
        target: `ng-repeat="trade in state.trades track by trade.id"`,
        append: ` data-ng-controller="tradePreview"`,
    }],
});
