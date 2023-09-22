import addPatches from "../utils/patchAngular";
import { loadValue, saveValue } from "../utils/storage";
import { debug } from "../utils/utils";

type Scope = angular.IScope & {
    disableAutoOpeningPromo: boolean,
    updatePromo: () => void,
    muteVideo: boolean,
    updateVideoMuting: () => void,
    replaceCheckmarkWithNumber: boolean,
    updateCheckmarkReplacing: () => void,
    serializedSettings: string,
    loadSettings: (elem: HTMLInputElement) => void,
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

                $scope.replaceCheckmarkWithNumber = loadValue("replaceCheckmark", false);
                $scope.updateCheckmarkReplacing = () => {
                    saveValue("replaceCheckmark", $scope.replaceCheckmarkWithNumber);
                };

                $scope.serializedSettings = "data:application/json,".concat(JSON.stringify({
                    openPromo: !$scope.disableAutoOpeningPromo,
                    muteVideo: $scope.muteVideo,
                    replaceCheckmark: $scope.replaceCheckmarkWithNumber,
                    filterSets: loadValue("filterSets", []),
                }));
                $scope.loadSettings = async (elem) => {
                    const [file] = elem.files ?? [];
                    if (!file) return;
                    const json = JSON.parse(await file.text());
                    console.log(json);
                    for (const [key, value] of Object.entries(json)) {
                        saveValue(key, value);
                    }
                    $scope.disableAutoOpeningPromo = !json.openPromo;
                    $scope.muteVideo = json.muteVideo;
                    $scope.replaceCheckmarkWithNumber = json.replaceCheckmark;
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
                    <h2 class=strike-through-header>NeonMob Trade Enhancements</h2>
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
                    <div class="field checkbox-slider--field">
                        <span class=input>
                            <span class=checkbox-slider>
                                <input
                                    type=checkbox
                                    class=checkbox-slider--checkbox
                                    id=nmte-mute
                                    ng-model=replaceCheckmarkWithNumber
                                    ng-change=updateCheckmarkReplacing()
                                >
                                <span class=checkbox-slider--knob></span>
                            </span>
                            <label class=checkbox-slider--label for=nmte-mute>
                                Replace the checkmark with a number.
                                <small class="text-subdued">
                                    On the series page, display the number of owned copies,
                                    if it's 2 or more, instead of the checkmark.
                                </small>
                            </label>
                        </span>
                    </div>
                    <h3 style="text-align:center;padding:10px">
                        Import/export NMTE settings
                    </h3>
                    <div style="display:flex;gap:10px;">
                        <a href={{serializedSettings}}
                            download="NMTE-settings.json"
                            style="flex:1"
                        >
                            <button class="btn subdued" style="width:100%">Export settings</button>
                        </a>
                        <label style="flex:1" tabindex=-1>
                            <input type="file" accept="application/json"
                                onchange=angular.element(this).scope().loadSettings(this)
                                style="display:none"
                            />
                            <span class="btn subdued" style="width:100%">Import settings</span>
                        </label>
                    <div>
                </fieldset>`,
        }],
    });
}
