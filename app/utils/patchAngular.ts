import type NM from "./NMTypes";
import type Services from "./NMServices";

import { debug } from "./utils";

type TemplatePatch = {
    names: string[],
    pages?: string[],
    patches: {
        target: string | RegExp,
        append?: string,
        replace?: string | ((str: string, ...args: any[]) => string),
        prepend?: string,
    }[],
}

const patchers: (() => void)[] = [];
const templatePatchList: TemplatePatch[] = [];

/**
 * Patch the given object with templates;
 * @param  {$cacheFactory.Cache} $templateCache - map of templates
 */
function patchTemplates ($templateCache: angular.ITemplateCacheService) {
    templatePatchList.forEach(({ names, patches, pages }) => names.forEach((name) => {
        // if set to apply the patch only on certain pages
        if (pages && pages.every((page) => !window.location.pathname.startsWith(page))) {
            return;
        }
        let template = $templateCache.get<string>(name)!;
        let fromCache = true;
        if (!template) {
            template = document.getElementById(name)?.textContent!;
            fromCache = false;
        }
        if (!template) {
            console.error(`Couldn't get template ${name}`);
            return;
        }
        // eslint-disable-next-line object-curly-newline
        patches.forEach(({ target, prepend, replace, append }) => {
            // TODO: notify about unapplied patches
            if (replace != null) {
                // @ts-ignore
                template = template.replaceAll(target, replace);
            } else if (prepend != null) {
                template = template.replaceAll(target, prepend.concat(target.toString()));
            } else if (append != null) {
                template = template.replaceAll(target, target.toString().concat(append));
            }
        });
        if (fromCache) {
            $templateCache.put(name, template);
        } else {
            document.getElementById(name)!.textContent = template;
        }
    }));
    debug("templates patched");
}

/**
 * Patch the nmTrades service
 * @param  {Service} nmTrades - service to patch
 * @param  {Service} userCollections - service to get user's collections
 * @param  {Service} artSubscriptionService - service to broadcast messages
 */
function patchNMTrades (nmTrades: Services.NMTrade, userCollections: Services.UserCollections, artSubscriptionService: Services.ArtSubscriptionService) {
    const replaceArray = <T>(target:T[], source:T[]) => {
        target.splice(0, target.length, ...source);
    };
    // make setting the trading cards easier
    nmTrades.setOfferData = (offerType, prints) => {
        replaceArray(nmTrades.getOfferData(offerType).prints, prints);
        replaceArray(nmTrades.getPrintIds(offerType), prints.map((print) => print.print_id));
    };
    // replace method `nmTrades.startCounter` with one that doesn't resets variable `_tradeId`
    nmTrades.startCounter = () => {
        nmTrades.startModify(); // to set `_parentId`

        // swap offers without overwriting arrays
        const bidOffer = nmTrades.getOfferData("bidder_offer").prints.slice();
        const respOffer = nmTrades.getOfferData("responder_offer").prints.slice();

        nmTrades.setOfferData("bidder_offer", respOffer);
        nmTrades.setOfferData("responder_offer", bidOffer);

        // swap bidder and responder without overwriting objects themselves
        const bidder = nmTrades.getBidder();
        const responder = nmTrades.getResponder();

        Object.getOwnPropertyNames(bidder).forEach((prop) => {
            // @ts-ignore
            [bidder[prop], responder[prop]] = [responder[prop], bidder[prop]];
        });

        nmTrades.setWindowState("counter");
    };
    // load user collections when trade is loading and notify about added/removed cards
    const origSetWindowState = nmTrades.setWindowState;
    nmTrades.setWindowState = (state) => {
        if (state === "create" || state === "view") {
            // preload collections
            userCollections.getCollections(nmTrades.getResponder());
            userCollections.getCollections(nmTrades.getBidder());
            // sort cards by rarity
            const comp = (a:NM.PrintInTrade, b:NM.PrintInTrade) => b.rarity.rarity - a.rarity.rarity;
            nmTrades.setOfferData(
                "bidder_offer",
                nmTrades.getOfferData("bidder_offer").prints.sort(comp),
            );
            nmTrades.setOfferData(
                "responder_offer",
                nmTrades.getOfferData("responder_offer").prints.sort(comp),
            );
        }
        origSetWindowState(state);
    };
    const origClearTradeQuery = nmTrades.clearTradeQuery;
    nmTrades.clearTradeQuery = () => {
        userCollections.dropCollection(nmTrades.getTradingPartner()!);
        origClearTradeQuery();
    };
    // broadcast a message when the trade get changed
    const origAddItem = nmTrades.addItem;
    nmTrades.addItem = (offerType, itemType, print) => {
        origAddItem(offerType, itemType, print);
        artSubscriptionService.broadcast(
            "trade-change",
            { offerType, action: "added", print },
        );
    };
    const origRemoveItem = nmTrades.removeItem;
    nmTrades.removeItem = (offerType, itemType, index) => {
        const print = nmTrades.getOfferData(offerType).prints[index];
        origRemoveItem(offerType, itemType, index);
        artSubscriptionService.broadcast(
            "trade-change",
            { offerType, action: "removed", print },
        );
    };

    // check if a card is added to trade
    nmTrades.hasCard = (offerType, card) => !!nmTrades
        .getOfferData(offerType).prints.find(({ id }) => id === card.id);

    debug("nmTrades patched");
}

/**
 * Patch artResource to cache list of partners for 15 minutes.
 */
function patchArtResource (artResource: Services.ArtResource) {
    const origFunc = artResource.retrievePaginatedAllowCancel;
    const cache: Record<string, any> = {};
    artResource.retrievePaginatedAllowCancel = (config) => {
        // this function is used only in the partner search list
        // so it safe to use only the url as a key
        const url = config.url!;
        if (!(url in cache)) {
            cache[url] = origFunc(config);
            const timer = setTimeout(() => { delete cache[url]; }, 15 * 60 * 1000);
            // do not cache bad responses
            cache[url].catch(() => {
                delete cache[url];
                clearTimeout(timer);
            });
        }
        return cache[url];
    };
    debug("artResource patched");
}

/**
 * Apply patches with two ways
 */
function applyPatches () {
    let applied = false;
    const patcher = [
        "$templateCache",
        "nmTrades",
        "userCollections",
        "artSubscriptionService",
        "artResource",
        (
            $templateCache: angular.ITemplateCacheService,
            nmTrades: Services.NMTrade,
            userCollections: Services.UserCollections,
            artSubscriptionService: Services.ArtSubscriptionService,
            artResource: Services.ArtResource,
        ) => {
            patchTemplates($templateCache);
            patchNMTrades(nmTrades, userCollections, artSubscriptionService);
            patchArtResource(artResource);
            applied = true;
        },
    ];

    patchers.forEach(patch => patch());

    angular.module("nmApp").run(patcher);
    window.addEventListener("load", () => {
        if (applied) return;
        debug("late patching");
        const getService = angular.element(document.body).injector().get;
        const func = patcher.pop() as Function;
        func(...(patcher as string[]).map(name => getService(name)));
    });
}

export default function addPatches(patcher: (()=>void) | null, ...templatePatches: TemplatePatch[]) {
    if (patcher) patchers.push(patcher);
    templatePatchList.push(...templatePatches);
}

document.addEventListener("DOMContentLoaded", applyPatches);
