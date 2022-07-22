import addPatches from "../utils/patchAngular";
import { loadValue, saveValue } from "../utils/storage";
import { debug } from "../utils/utils";

type Scope = angular.IScope & {
    disableAutoOpeningPromo: boolean,
    updatePromo: () => void,
}

// the nm.account.settings module is available only at the account settings page
if (window.location.pathname.startsWith("/account/")) {
    /**
     * Adds a controller for NM Trade Enhancements settings block on the account settings page
     */
    addPatches(() => {
        angular.module("nm.account.settings").controller("nmTradeEnhancementsSettingsController", [
            "$scope",
            ($scope: Scope) => {
                $scope.disableAutoOpeningPromo = !loadValue("openPromo", true);
                $scope.updatePromo = () => {
                    saveValue("openPromo", !$scope.disableAutoOpeningPromo);
                    console.log($scope.disableAutoOpeningPromo);
                };
                debug("nmTradeEnhancementsSettingsController initiated");
            },
        ]);
    }, {
        // add settings to enable/disable auto-opening of promo packs
        names: ["/static/page/account/partial/account-settings.partial.html"],
        pages: ["/account/"],
        patches: [{
            target: `account-settings-email-subscriptions.partial.html'"></div>`,
            append:
                `<fieldset class="nmte-settings--fieldset"
                    data-ng-controller=nmTradeEnhancementsSettingsController
                >
                    <h2 class=strike-through-header>Trade Enhancements</h2>
                    <div class="field checkbox-slider--field">
                        <span class=input>
                            <span class=checkbox-slider>
                                <input
                                    type=checkbox
                                    class=checkbox-slider--checkbox
                                    id=nmte-promo
                                    ng-model=disableAutoOpeningPromo
                                    ng-change=updatePromo()
                                >
                                <span class=checkbox-slider--knob></span>
                            </span>
                            <label class=checkbox-slider--label for=nmte-promo>
                                Disable auto-opening of promo packs
                            </label>
                        </span>
                    </div>
                </fieldset>`,
        }],
    });
}
