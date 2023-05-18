import addPatches from "../utils/patchAngular";
import { loadValue, saveValue } from "../utils/storage";
import { debug } from "../utils/utils";

type Scope = angular.IScope & {
    disableAutoOpeningPromo: boolean,
    updatePromo: () => void,
    muteVideo: boolean,
    updateVideoMuting: () => void,
}

// the nm.account.settings module is available only at the account settings page
if (window.location.pathname.startsWith("/account/")) {
    /**
     * Adds a controller for NM Trade Enhancements settings block on the account settings page
     */
    addPatches((angular) => {
        angular.module("nm.account.settings").controller("nmTradeEnhancementsSettingsController", [
            "$scope",
            ($scope: Scope) => {
                $scope.disableAutoOpeningPromo = !loadValue("openPromo", true);
                $scope.updatePromo = () => {
                    saveValue("openPromo", !$scope.disableAutoOpeningPromo);
                };
                $scope.muteVideo = loadValue("muteVideo", true);
                $scope.updateVideoMuting = () => {
                    saveValue("muteVideo", $scope.muteVideo);
                };
                debug("nmTradeEnhancementsSettingsController initiated");
            },
        ]);
    }, {
        // add settings to enable/disable auto-opening of promo packs,
        // setting to keep animated cards (video) muted
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
                    <div class="field checkbox-slider--field">
                        <span class=input>
                            <span class=checkbox-slider>
                                <input
                                    type=checkbox
                                    class=checkbox-slider--checkbox
                                    id=nmte-mute
                                    ng-model=muteVideo
                                    ng-change=updateVideoMuting()
                                >
                                <span class=checkbox-slider--knob></span>
                            </span>
                            <label class=checkbox-slider--label for=nmte-mute>
                                Keep animated cards muted.
                                <small class="text-subdued">
                                    If you own an animated card, on the detailed view
                                    NMTE will show you the original animation for
                                    better quality. But the original animation,
                                    unlike previews, may contain an audio.
                                </small>
                            </label>
                        </span>
                    </div>
                </fieldset>`,
        }],
    });
}
