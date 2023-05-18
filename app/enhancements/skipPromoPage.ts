import type Services from "../utils/NMServices";
import type NM from "../utils/NMTypes";

import addPatches from "../utils/patchAngular";
import { loadValue, saveValue } from "../utils/storage";
import { getCookie, debug } from "../utils/utils";

if (window.location.pathname.startsWith("/redeem/")
    // if auto opening of promo packs disabled
    && !loadValue("openPromo", true)
) {
    // cancel auto-opening of the promo pack and redirect to series page
    const promoCode = getCookie("promo_code");
    if (promoCode) {
        const settId = getCookie("promo_sett_url")?.match(/\d+/)?.[0];
        saveValue("promoCode", { promoCode, settId });
        // remove cookies to not trigger auto-opening of the promo pack
        document.cookie = "promo_code=;max-age=0;path=/";
        document.cookie = "promo_sett_url=;max-age=0;path=/";
        document.location = `/series/${settId}/`;
    }
}

type RedeemPack = {
    pack: NM.Pack,
    sett_url: string
}
// type UsedRedeemError = {
//     detail: string,
// }
type Scope = angular.IScope & {
    sett: NM.Sett,
}

/**
 * Adds a button to open a promo pack if available
 */
addPatches((angular) => {
    angular.module("neonmobApp").directive("nmPromoPackBtn", [
        "poRoute",
        "artOverlay",
        "artMessage",
        "poPackSelect",
        "poMilestones",
        "artConfig",
        "$http",
        (
            poRoute: Services.PoRoute,
            artOverlay: Services.ArtOverlay,
            artMessage: Services.ArtMessage,
            poPackSelect: Services.PoPackSelect,
            poMilestones: Services.PoMilestones,
            artConfig: Services.ArtConfig,
            $http: angular.IHttpService,
        ) => ({
            scope: {
                sett: "=nmPromoPackBtn",
            },
            link: (scope: Scope, $elem) => {
                const { promoCode, settId } = loadValue<
                    { promoCode?:string, settId?:string }
                >("promoCode", {});
                if (!promoCode || Number(settId) !== scope.sett.id) {
                    $elem.remove();
                    return;
                }
                $elem.on("click", async () => {
                    // merged re-implementation of nmPromoCodes.redeemPromoCode and
                    // poRoute.launchOpenPromoPack to correctly proceed errors
                    artOverlay.show("promocodes-redeeming");

                    poPackSelect.setPackType(poPackSelect.PROMO_PACK);
                    poPackSelect.startPackSelect(scope.sett.links.self);
                    try {
                        await poMilestones.initPoMilestones();
                        await poPackSelect.fetchSett();
                        const resp = await $http.post<RedeemPack>(
                            artConfig.api["api-promo-codes-redeem"],
                            {
                                code: promoCode,
                                store_signup_sett: false,
                            },
                        );
                        await poRoute.openPack(resp.data.pack);
                    // @ ts-ignore
                    } catch (ex: any) {
                        artOverlay.hide();
                        if (ex.status === 400) {
                            artMessage.showAlert(ex.data.detail);
                        } else {
                            artMessage.showAlert(`
                                Sorry, we were not able to redeem your promocode.
                                Please try again by going to the url or
                                contact via the feedback button.`);
                        }
                        console.log(ex);
                    } finally {
                        saveValue("promoCode", {});
                        $elem.remove();
                    }
                });
                debug("nmPromoPackBtn initiated");
            },
        }),
    ]);
}, {
    // add button for promo pack
    names: ["partials/art/set-header.partial.html"],
    patches: [{
        target: `<div class="set-header--collect-it" nm-collect-it-button="sett"></div>`,
        prepend: `
            <div class="set-header--collect-it" nm-promo-pack-btn=sett>
                <span class="btn reward collect-it-button">Open promo pack</span>
            </div>`,
    }],
});
