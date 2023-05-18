import type Services from "../utils/NMServices";

import addPatches from "../utils/patchAngular";
import { debug } from "../utils/utils";

/**
 * Patches AngularJS to show button to rollback an edited trade.
 */
addPatches((angular) => {
    angular.module("nm.trades").controller("rollbackTradeButton", [
        "$scope",
        "nmTrades",
        ($scope: angular.IScope & { cancelChanges: () => void }, nmTrades: Services.NMTrade) => {
            // save copies of the original offers
            const bidderOffer = nmTrades.getOfferData("bidder_offer").prints.slice();
            const respOffer = nmTrades.getOfferData("responder_offer").prints.slice();

            $scope.cancelChanges = () => {
                // restore offers
                nmTrades.setOfferData("bidder_offer", bidderOffer);
                nmTrades.setOfferData("responder_offer", respOffer);

                // at countering the bidder and the responder are swapped
                // so we need to swap them back
                if (nmTrades.getWindowState() === "counter") {
                    nmTrades.startCounter();
                }

                nmTrades.setWindowState("view");
            };
            debug("rollbackTradeButton initiated");
        },
    ]);
}, {
    // insert button to rollback the trade
    names: ["/static/common/trades/partial/footer.html"],
    patches: [{
        target: "<span>Offer Trade</span></button>",
        append:
            `<button class="btn subdued"
                ng-if="getWindowState()==='counter' || getWindowState()==='modify'"
                ng-controller="rollbackTradeButton"
                ng-click="cancelChanges()"
            >
                <span>Back</span>
            </button>`,
    }],
});
