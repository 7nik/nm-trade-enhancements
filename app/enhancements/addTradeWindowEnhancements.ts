import type Services from "../utils/NMServices";
import type NM from "../utils/NMTypes";

import tippy from "tippy.js";
import addPatches from "../utils/patchAngular";
import NMApi from "../utils/NMApi";
import { loadValue, saveValue } from "../utils/storage";
import { debug, toPascalCase, waitForElement } from "../utils/utils";

type FilterSet = {
    filters: {
        user_id: number,
        partner_id: number,
        search: null | string,
        sett: null | number,
        duplicates_only: boolean,
        common: boolean,
        uncommon: boolean,
        rare: boolean,
        veryRare: boolean,
        extraRare: boolean,
        variant: boolean,
        chase: boolean,
        legendary: boolean,
    },
    seriesFilter: number | "allSeries" | "infinite" | "finite" | "freePackAvailable" | "anyPackAvailable" | "outOfPrint" | undefined,
    hiddenSeries: {
        id: number,
        name: string,
        tip: string,
    }[],
}
type FilterSetRecord = {
    filters: FilterSet["filters"],
    hiddenSeries: FilterSet["hiddenSeries"],
    settName?: boolean,
    state: FilterSet["seriesFilter"],
}

const PaginetedPrintsFn = async (fn:Services.ArtResource["retrievePaginated"]) => await fn<NM.PrintInTrade[]>("");
type PaginatedPrints = Awaited<ReturnType<typeof PaginetedPrintsFn>>;

type NmCollectionProgressScope = angular.IScope & {
    user: NM.User,
    settId: number,

    ready: boolean,
    username: string,
    hasCollection: boolean,
    link: string,
    progress: string,
}
type NmPrintChooserScope = angular.IScope & {
    card: NM.Print,
    active: () => boolean,
    state: string,

    loadPrints: () => Promise<void>,
    setPrint: () => void,
    prints: NM.Unmerged.Prints["prints"],
    print: NM.Unmerged.Prints["prints"][0],
}
type NmTradesAdd2Scope = angular.IScope & {
    partner: NM.User,
    direction: "give" | "receive",
    settId: number | null,

    you: NM.User,
    addItemsActive: boolean,
    loading: boolean,
    typing: boolean,
    loadingMore: boolean,
    showBio: boolean,
    itemData: NM.PrintInTrade[],
    fullItemData: PaginatedPrints,
    hiddenSeries: FilterSet["hiddenSeries"],
    baseUrl: string,
    filterSets: ReturnType<Services.TradeFilterSets["getFilterSets"]>,
    filterSetId: string | null,
    seriesFilter: ReturnType<Services.TradeFilterSets["getFilterSet"]>["seriesFilter"],
    initSettId: number | null,
    notOwnedBy: {
        val: boolean,
        filter: number,
    }, 
    wishListBy: {
        val: boolean,
        filter: number,
    },
    incompleteBy: {
        val: boolean,
        filter: number,
    },
    filters: {
        user_id: number,
        partner_id: number,
        search: null,
        sett: number | null,
        duplicates_only: boolean,
        common: boolean,
        uncommon: boolean,
        rare: boolean,
        veryRare: boolean,
        extraRare: boolean,
        variant: boolean,
        chase: boolean,
        legendary: boolean,
        wish_list_by?: number,
        incomplete_by?: number,
        not_owned_by?: number,
    },
    collectedSetts: { id:string|number|null, name:string }[],
    items: [],
    updateWishListByFilter: () => void,
    updateIncompleteByFilter: () => void,
    updateNotOwnedByFilter: () => void,
    updateSearchFilter: () => void,
    openAddItems: () => void,
    closeAddItems: () => void,
    addPrint: (print: NM.PrintInTrade) => void,
    canAddItems: () => boolean,
    hideSeries: (settId: number) => void,
    showSeries: (settId: number) => void,
    selectSeries: (settId: number) => void,
    isEmpty: () => boolean,
    showCards: () => boolean,
    getPrintCount: Services.ArtPieceService["getPrintCount"],
    giving: () => boolean,
    getUrl: () => string,
    showLoading: () => boolean,
    getTooltip: (filter: string) => string,
    deleteFilterSet: () => void,
    applyFilterSet: () => void,
    load: () => void,
    getNextPage: () => void,
}

const seriesCache: Record<number, NM.Sett | Promise<NM.Sett>> = {};
/**
 * Gets and caches info about a series by its id
 * @param  {(number|string)} settId - Series id
 * @return {Promise<Object>} series info
 */
 function getSeriesInfo (settId: number): NM.Sett | Promise<NM.Sett> {
    if (!seriesCache[settId]) {
        (seriesCache[settId] = NMApi.sett.get(settId)).then((data) => {
            seriesCache[settId] = data;
        });
    }
    return seriesCache[settId];
};

/**
 * Apply enhancement to the trade window
 */
addPatches(async () => {
    // a service to get user collection and their progress
    angular.module("nm.trades").factory("userCollections", [() => {
        debug("userCollections initiated");
        const collections: Record<number, Promise<Record<number, NM.SettMetrics>>> = {};
        return {
            getCollections (user: NM.User) {
                if (user.id in collections) return collections[user.id];
                collections[user.id] = fetch(user.links.collected_setts_names_only)
                    .then((resp) => resp.json())
                    .then((setts) => {
                        const settMap: Record<number, NM.SettMetrics> = {};
                        // eslint-disable-next-line no-restricted-syntax
                        for (const sett of setts) {
                            settMap[sett.id] = sett;
                        }
                        // collections[user.id] = settMap;
                        return settMap;
                    });
                return collections[user.id];
            },
            dropCollection (user: NM.User) {
                if (user.id in collections) delete collections[user.id];
            },
            async getProgress (user: NM.User, settId: number): ReturnType<Services.UserCollections["getProgress"]> {
                if (!(user.id in collections)) {
                    await this.getCollections(user);
                    return this.getProgress(user, settId);
                }
                const collection = await collections[user.id];
                // if (collections[user.id] instanceof Promise) {
                //     return await collections[user.id].then(() => this.getProgress(user, settId));
                // }
                if (!collection[settId]) return null;
                const {
                    name,
                    links: { permalink },
                    core_piece_count: coreCount,
                    chase_piece_count: chaseCount,
                    variant_piece_count: variantCount,
                    legendary_piece_count: legendaryCount,
                    owned_metrics: {
                        owned_core_piece_count: coreOwned,
                        owned_chase_piece_count: chaseOwned,
                        owned_variant_piece_count: variantOwned,
                        owned_legendary_piece_count: legendaryOwned,
                    },
                } = collection[settId];
                return {
                    name,
                    permalink,
                    coreCount,
                    chaseCount,
                    variantCount,
                    legendaryCount,
                    totalCount: coreCount + chaseCount + variantCount + legendaryCount,
                    coreOwned,
                    chaseOwned,
                    variantOwned,
                    legendaryOwned,
                    totalOwned: coreOwned + chaseOwned + variantOwned + legendaryOwned,
                };
            },
        };
    }]);

    // a service to get, edit, and sync filter sets
    angular.module("nm.trades").factory("tradeFilterSets", [(): Services.TradeFilterSets => {

        const setsObj: Record<string, FilterSetRecord> = loadValue("filter_sets", {});
        const setsArr: {id:string|null, name:string}[] = [];
        // eslint-disable-next-line guard-for-in, no-restricted-syntax
        for (const key in setsObj) {
            if (!Array.isArray(setsObj[key].hiddenSeries)) setsObj[key].hiddenSeries = [];
            setsArr.push({ id: key, name: key });
        }
        setsArr.sort((a, b) => (a.name > b.name ? 1 : -1));
        setsArr.unshift({ id: null, name: "Choose a filter set" });
        setsArr.push({ id: "new_filter_set", name: "Save filters..." });

        debug("tradeFilterSets initiated");
        return {
            getFilterSets () { return setsArr; },
            getFilterSet (id: string) {
                const {
                    filters,
                    settName,
                    state,
                    hiddenSeries,
                } = setsObj[id];
                const seriesFilter = settName !== false ? filters.sett ?? state : undefined;
                return {
                    filters: {
                        // these props are optional so add "non-selected status"
                        wish_list_by: false,
                        incomplete_by: false,
                        not_owned_by: false,
                        ...filters,
                    },
                    seriesFilter,
                    hiddenSeries,
                };
            },
            saveFilterSet (filters: FilterSet["filters"], seriesFilter: FilterSet["seriesFilter"], hiddenSeries: FilterSet["hiddenSeries"]) {
                let name = prompt("Enter name of filter set"); // eslint-disable-line no-alert
                if (!name) {
                    return null;
                }
                name = toPascalCase(name);

                const filterSet = {
                    filters: { ...filters },
                    // eslint-disable-next-line no-alert
                    state: window.confirm("Include the selected series?")
                        ? seriesFilter
                        : undefined,
                    hiddenSeries: [...hiddenSeries],
                };
                if (!(name in setsObj)) {
                    setsArr.splice(-1, 0, { id: name, name });
                }
                setsObj[name] = filterSet;
                saveValue("filter_sets", setsObj);
                return name;
            },
            deleteFilterSet (id: string|null) {
                // eslint-disable-next-line no-alert
                if (id && id in setsObj && window.confirm("Delete this filter set?")) {
                    delete setsObj[id];
                    setsArr.splice(setsArr.findIndex((set) => set.id === id), 1);
                    saveValue("filter_sets", setsObj);
                    return true;
                }
                return false;
            },
            hasDefaultFilterSet () {
                return "Default" in setsObj;
            },
        };
    }]);

    // a directive to display collection progress
    angular.module("nm.trades").directive(
        "nmCollectionProgress",
        ["userCollections", (userCollections: Services.UserCollections) => ({
            scope: {
                user: "=nmCollectionProgress",
                settId: "=nmCollectionProgressSettId",
            },
            template: `
                <span ng-class="{'text-warning': ready && !hasCollection}">
                    {{username}}:&nbsp;
                    <span ng-if="!ready">?</span>
                    <a ng-if="ready && hasCollection"
                        href="{{link}}"
                        target="_blank"
                        class="href-link"
                    >
                        {{progress}}
                    </a>
                    <span ng-if="ready && !hasCollection">—</span>
                </span>
            `.trim().replace(/\n\s+/g, ""),
            replace: true,
            async link (scope: NmCollectionProgressScope, $elem) {
                scope.ready = false;
                scope.username = scope.user.id === NM.you.attributes.id
                    ? "You"
                    : scope.user.first_name;

                const data = userCollections.getProgress(scope.user, scope.settId);
                const sett = data instanceof Promise ? await data : data;

                scope.hasCollection = !!sett;
                scope.ready = true;
                if (!sett) return;

                scope.link = sett.permalink.concat(`/user${scope.user.links.profile}/cards/`);
                scope.progress = `${sett.totalOwned}/${sett.totalCount}`;

                const a = await waitForElement($elem[0], "a");
                const content = [
                    `${sett.coreOwned}/${sett.coreCount}&nbsp;<i class='i core'></i>`,
                    sett.chaseCount
                        ? `<i class=pipe></i>
                            ${sett.chaseOwned}/${sett.chaseCount}&nbsp;
                            <i class='i chase'></i>`
                        : "",
                    // if here are all 4 type then locate them in 2 rows
                    sett.variantCount
                        ? (sett.chaseCount * sett.variantCount * sett.legendaryCount
                            ? "<br>"
                            : "<i class=pipe></i>")
                        : "",
                    sett.variantCount
                        ? `${sett.variantOwned}/${sett.variantCount}&nbsp;<i class='i variant'></i>`
                        : "",
                    sett.legendaryCount
                        ? `<i class=pipe></i>
                            ${sett.legendaryOwned}/${sett.legendaryCount}
                            <i class='i legendary'></i>`
                        : "",
                ];

                tippy(a, {
                    allowHTML: true,
                    content: content.join(""),
                    theme: "tooltip",
                });
            },
        })],
    );

    // a directive to allow users to choose print
    angular.module("nm.trades").directive("nmPrintChooser", ["nmTrades", (nmTrades: Services.NMTrade) => ({
        template: `
            <span ng-if="!active() || state === 'loading'">
                #{{card.print_num}}
            </span>
            <span ng-if="active() && state === 'view'"
                class="tip"
                style="cursor: pointer"
                title="Change print number"
                ng-click="loadPrints()"
            >
                #{{card.print_num}}
            </span>
            <select class="print-chooser"
                ng-if="active() && state === 'choose'"
                ng-model="$parent.print"
                ng-options="print as '#'+print.print_num for print in prints"
                ng-change="setPrint()"
                ng-class="{'disabled': prints.length == 1}"
                ng-disabled="prints.length == 1"
            ></select>
        `.trim().replace(/\n\s+/g, ""),
        scope: {
            card: "=nmPrintChooser",
        },
        link (scope: NmPrintChooserScope, $elem) {
            const giving = !!$elem[0]?.closest(".trade--side")?.matches(".trade--you");
            const offerType = giving ? "bidder_offer" : "responder_offer";
            const offer = nmTrades.getOfferData(offerType).prints.slice();
            const print = offer.find(({ id }) => id === scope.card.id)!;
            // allow to change print during editing the trade and only on users side
            scope.active = () => giving
                && ["create", "modify", "counter"].includes(nmTrades.getWindowState());
            scope.state = "view";
            scope.loadPrints = async () => {
                scope.state = "loading";
                // @ts-ignore
                angular.element(".tip").tooltip("hide");
                const user = giving ? NM.you.attributes : nmTrades.getTradingPartner()!;
                // const url = `/users/${user.id}/piece/${scope.card.id}/detail/`;
                const details = await NMApi.user.ownedPrints(user.id, scope.card.id);
                scope.$apply(() => {
                    scope.prints = details.prints;
                    scope.print = scope.prints.find((p) => p.id === print.print_id)
                        ?? scope.prints[scope.prints.length - 1];
                    scope.state = "choose";
                });
            };
            scope.setPrint = () => {
                print.print_id = scope.print.id;
                print.print_num = scope.print.print_num;
                // no direct access the variable _selectedIds so we modify in such way
                nmTrades.setOfferData(offerType, nmTrades.getOfferData(offerType).prints);
            };
        },
    })]);

    // based on https://d1ld1je540hac5.cloudfront.net/client/common/trades/module/add.js
    angular.module("nm.trades").directive("nmTradesAdd2", [
        "$timeout",
        // "artNodeHttpService",
        "artPieceService",
        "artResource",
        "artSubscriptionService",
        "artUser",
        "artUrl",
        "nmTrades",
        "userCollections",
        "tradeFilterSets",
        (
            $timeout: angular.ITimeoutService,
            // artNodeHttpService,
            artPieceService: Services.ArtPieceService,
            artResource: Services.ArtResource,
            artSubscriptionService: Services.ArtSubscriptionService,
            artUser: Services.ArtUser,
            artUrl: Services.ArtUrl,
            nmTrades: Services.NMTrade,
            userCollections: Services.UserCollections,
            tradeFilterSets: Services.TradeFilterSets,
        ) => ({
            scope: {
                partner: "=nmTradesAdd2",
                direction: "@nmTradesAdd2Direction",
                settId: "=?nmTradesAdd2Sett",
            },
            // $scope.direction is either 'give' or 'receive'
            // if 'give' this is the items the logged in user will give
            // if 'receive' this is the items the logged in user will receive
            templateUrl: "/static/common/trades/partial/add.html",
            link (scope: NmTradesAdd2Scope, $elem) {
                scope.you = artUser.toObject();
                scope.addItemsActive = false;
                scope.loading = false;
                scope.typing = false;
                scope.loadingMore = false;
                scope.showBio = false;
                scope.itemData = [];
                // @ts-ignore
                scope.fullItemData = [];
                scope.hiddenSeries = [];
                scope.baseUrl = "/api/search/prints/";
                scope.filterSets = tradeFilterSets.getFilterSets();
                scope.filterSetId = null;

                const offerType = scope.direction === "give" ? "bidder_offer" : "responder_offer";
                const receivingUser = scope.direction === "give" ? scope.partner : scope.you;
                const givingUser = scope.direction === "give" ? scope.you : scope.partner;

                // if all cards are from the same series, set it as initial
                scope.initSettId = Number(scope.settId) || null;
                if (!scope.initSettId && nmTrades.getOfferData(offerType).prints.length > 0) {
                    const [print, ...prints] = nmTrades.getOfferData(offerType).prints;
                    scope.initSettId = prints.every((pr) => pr.sett_id === print.sett_id)
                        ? print.sett_id
                        : null;
                }

                scope.notOwnedBy = {
                    val: false,
                    filter: receivingUser.id,
                };

                scope.wishListBy = {
                    val: false,
                    filter: receivingUser.id,
                };

                scope.incompleteBy = {
                    val: false,
                    filter: receivingUser.id,
                };

                scope.filters = {
                    user_id: givingUser.id,
                    partner_id: receivingUser.id,
                    search: null,
                    sett: scope.initSettId,
                    duplicates_only: false,
                    common: false,
                    uncommon: false,
                    rare: false,
                    veryRare: false,
                    extraRare: false,
                    variant: false,
                    chase: false,
                    legendary: false,
                };

                scope.updateWishListByFilter = () => {
                    if (scope.wishListBy.val) {
                        scope.filters.wish_list_by = scope.wishListBy.filter;
                    } else {
                        delete scope.filters.wish_list_by;
                    }
                    scope.load();
                };

                scope.updateIncompleteByFilter = () => {
                    if (scope.incompleteBy.val) {
                        scope.filters.incomplete_by = scope.incompleteBy.filter;
                    } else {
                        delete scope.filters.incomplete_by;
                    }
                    scope.load();
                };

                scope.updateNotOwnedByFilter = () => {
                    if (scope.notOwnedBy.val) {
                        scope.filters.not_owned_by = scope.notOwnedBy.filter;
                    } else {
                        delete scope.filters.not_owned_by;
                    }
                    scope.load();
                };

                let typingTimeout: angular.IPromise<void> | null = null;
                scope.updateSearchFilter = () => {
                    if (!scope.typing) scope.typing = true;
                    $timeout.cancel(typingTimeout!);
                    typingTimeout = $timeout(() => {
                        scope.load();
                        scope.typing = false;
                    }, 500);
                };

                scope.openAddItems = () => {
                    scope.addItemsActive = true;
                    artSubscriptionService.broadcast(`open-add-trade-items-${givingUser.id}`);
                };

                scope.closeAddItems = () => {
                    scope.addItemsActive = false;
                };

                scope.addPrint = (print) => {
                    nmTrades.addItem(offerType, "prints", print);
                    scope.closeAddItems();
                };

                scope.canAddItems = () => {
                    const offerData = nmTrades.getOfferData(offerType);
                    return offerData.prints.length < 5;
                };

                scope.hideSeries = async (settId) => {
                    const yourSett = await userCollections.getProgress(scope.you, settId);
                    const partnerSett = await userCollections.getProgress(scope.partner, settId);
                    scope.hiddenSeries.push({
                        id: settId,
                        name: (yourSett ?? partnerSett)!.name,
                        tip: `You: ${yourSett
                                ? `${yourSett.totalOwned}/${yourSett.totalCount}`
                                : "—"},
                            ${scope.partner.first_name}: ${partnerSett
                                ? `${partnerSett.totalOwned}/${partnerSett.totalCount}`
                                : "—"}`,
                    });
                    scope.load();
                    scope.loading = false;
                };

                scope.showSeries = (settId) => {
                    const pos = scope.hiddenSeries.findIndex(({ id }) => id === settId);
                    if (pos >= 0) {
                        scope.hiddenSeries.splice(pos, 1);
                        scope.load();
                        scope.loading = false;
                    }
                };

                scope.selectSeries = (settId) => {
                    scope.seriesFilter = settId;
                    scope.load();
                };

                scope.isEmpty = () => scope.items.length === 0;

                // now users can trade only cards, but it cannot be removed because otherwise,
                // tips will be processed before calling getTooltip
                scope.showCards = () => true;

                scope.getPrintCount = artPieceService.getPrintCount.bind(artPieceService);

                scope.giving = () => scope.direction === "give";

                scope.getUrl = () => artUrl.updateParams(scope.baseUrl, scope.filters);

                scope.showLoading = () => scope.typing
                    || scope.loading && !scope.loadingMore;

                scope.getTooltip = (filter) => {
                    switch (filter) {
                        case "unowned":
                            return scope.giving()
                                ? "Cards your partner doesn't own"
                                : "Cards you don't own";
                        case "multiples":
                            return scope.giving()
                                ? "Cards you own multiples of"
                                : "Cards your partner owns multiples of";
                        case "wish_list":
                            return scope.giving()
                                ? "Cards your partner wishlisted"
                                : "Cards you wishlisted";
                        case "incomplete_by":
                            return scope.giving()
                                ? "Cards from same series you and your partner are collecting"
                                : "Cards from same series your partner and you are collecting";
                        default:
                            throw new Error(`Unknown filter: ${filter}`);
                    }
                };

                scope.deleteFilterSet = () => {
                    if (tradeFilterSets.deleteFilterSet(scope.filterSetId)) {
                        scope.filterSetId = null;
                    }
                };

                scope.applyFilterSet = () => {
                    if (!scope.filterSetId) return;
                    if (scope.filterSetId === "new_filter_set") {
                        scope.filterSetId = tradeFilterSets.saveFilterSet(
                            scope.filters,
                            scope.seriesFilter,
                            scope.hiddenSeries,
                        );
                        return;
                    }
                    const {
                        filters,
                        seriesFilter,
                        hiddenSeries,
                    } = tradeFilterSets.getFilterSet(scope.filterSetId);

                    if (seriesFilter !== undefined) scope.seriesFilter = seriesFilter;
                    scope.hiddenSeries = [...hiddenSeries];
                    Object.entries(filters).forEach(([filterName, filterValue]) => {
                        switch (filterName) {
                            case "sett":
                                // will be set at card loading
                                break;
                            case "search":
                            case "duplicates_only":
                            case "common":
                            case "uncommon":
                            case "rare":
                            case "veryRare":
                            case "extraRare":
                            case "variant":
                            case "chase":
                            case "legendary":
                                if (scope.filters[filterName] !== filterValue) {
                                    // @ts-ignore
                                    scope.filters[filterName] = filterValue;
                                }
                                break;
                            case "wish_list_by":
                            case "incomplete_by":
                            case "not_owned_by":
                                // if state of the filter need to be changed
                                // eslint-disable-next-line no-bitwise
                                if (!!scope.filters[filterName] !== !!filterValue) {
                                    let container: "wishListBy"|"incompleteBy"|"notOwnedBy";
                                    switch (filterName) {
                                        case "wish_list_by": container = "wishListBy"; break;
                                        case "incomplete_by": container = "incompleteBy"; break;
                                        case "not_owned_by": container = "notOwnedBy"; break;
                                        // no default
                                    }
                                    if (filterValue) {
                                        scope[container].val = true;
                                        scope.filters[filterName] = scope[container].filter;
                                    } else {
                                        scope[container].val = false;
                                        delete scope.filters[filterName];
                                    }
                                }
                                break;
                            case "user_id":
                            case "partner_id":
                                break;
                            default:
                                console.error(`Unknown filter ${filterName}`);
                                break;
                        }
                    });
                    const { filterSetId } = scope;
                    // apply filters and (re)load cards
                    scope.load();
                    scope.filterSetId = filterSetId;
                };

                let currLock = 0;
                async function displayPrint (print: NM.PrintInTrade, lock: number) {
                    let showSeries: boolean;
                    let data: Promise<NM.Sett> | NM.Sett;
                    switch (scope.seriesFilter) {
                        case "allSeries":
                            showSeries = true;
                            break;
                        case "finite": {
                            showSeries = print.num_prints_total !== "unlimited";
                            break;
                        }
                        case "infinite": {
                            showSeries = print.num_prints_total === "unlimited";
                            break;
                        }
                        case "freePackAvailable": {
                            data = getSeriesInfo(print.sett_id);
                            if (data instanceof Promise) data = await data;
                            showSeries = new Date(data.discontinue_date).getTime() > Date.now()
                                && (!data.freebies_discontinued
                                    || new Date(data.freebies_discontinued).getTime() > Date.now());
                            break;
                        }
                        case "anyPackAvailable": {
                            data = getSeriesInfo(print.sett_id);
                            if (data instanceof Promise) data = await data;
                            showSeries = new Date(data.discontinue_date).getTime() > Date.now();
                            break;
                        }
                        case "outOfPrint": {
                            data = getSeriesInfo(print.sett_id);
                            if (data instanceof Promise) data = await data;
                            showSeries = new Date(data.discontinue_date).getTime() < Date.now();
                            break;
                        }
                        default:
                            showSeries = !!scope.filters.sett;
                    }
                    showSeries &&= !scope.hiddenSeries.find(({ id }) => id === print.sett_id);
                    if (currLock === lock // filtering is still actual
                            && showSeries
                            && !nmTrades.hasCard(offerType, print)
                            && !scope.itemData.includes(print)
                    ) {
                        scope.itemData.push(print);
                    }
                }

                async function displayPrints (prints: NM.PrintInTrade[], lock: number) {
                    await Promise.all(prints.map((print) => displayPrint(print, lock)));
                    if (currLock !== lock) return;
                    scope.loading = false;
                    scope.loadingMore = false;
                    // if nothing to display - load next data
                    if (scope.itemData.length < 10) {
                        scope.getNextPage();
                        return;
                    }
                    // avoid infinite card loading when not adding cards
                    if (!scope.addItemsActive) return;
                    // when cards will be displayed - trigger loading next data
                    // if user is close to end of list
                    await waitForElement($elem[0], "#print-list");
                    // @ts-ignore ????
                    if ($elem.find("#print-list").scroll().length === 0) {
                        scope.getNextPage();
                    }
                }

                let prevUrl: string;
                scope.load = () => {
                    scope.filterSetId = null;
                    scope.loading = true;
                    scope.loadingMore = false;
                    scope.itemData = [];

                    if (!scope.seriesFilter) scope.seriesFilter = "allSeries";
                    scope.filters.sett = typeof scope.seriesFilter === "number"
                        ? scope.seriesFilter
                        : null;
                    currLock += 1;

                    const url = scope.getUrl();
                    // if were changed only user-side filters
                    if (url === prevUrl) {
                        displayPrints(scope.fullItemData, currLock);
                        return;
                    }

                    prevUrl = url;
                    const lock = currLock;
                    artResource.retrievePaginated<NM.PrintInTrade[]>(url).then((data) => {
                        if (currLock !== lock) return;
                        scope.fullItemData = data;
                        displayPrints(data, currLock);
                    });
                };

                let lock2 = false;
                scope.getNextPage = () => {
                    if (lock2 || scope.loading || !scope.fullItemData.next) return;
                    scope.loading = true;
                    scope.loadingMore = true;
                    lock2 = true;
                    scope.fullItemData.retrieveNext()!.then((data) => {
                        lock2 = false;
                        displayPrints(data, currLock);
                    });
                };

                function tradeChanged (ev: { offerType:string, action: string, print:NM.PrintInTrade }) {
                    if (ev.offerType !== offerType) return;
                    if (ev.action === "added") {
                        scope.itemData.splice(scope.itemData.indexOf(ev.print), 1);
                    } else {
                        // print of the same card
                        const print = scope.fullItemData.find(({ id }) => id === ev.print.id);
                        if (print) displayPrint(print, currLock);
                    }
                }

                artSubscriptionService.subscribe("trade-change", tradeChanged);
                scope.$on("$destroy", () => {
                    artSubscriptionService.unsubscribe("trade-change", tradeChanged);
                });

                // initiate all data
                const stopWord = /^(the)? /i;
                function prepareSettsForDisplay (settData: Record<number, NM.SettMetrics>) {
                    if (!settData) return;

                    scope.collectedSetts.push(...Object.values(settData)
                        .map(({ id, name }) => ({ id, name, $name: name.replace(stopWord, "") }))
                        .sort((a, b) => a.$name.localeCompare(b.$name)));

                    if (!scope.initSettId) return
                    if (settData[scope.initSettId]) {
                        scope.seriesFilter = scope.initSettId;
                        scope.filters.sett = scope.initSettId;
                    } else {
                        scope.seriesFilter = "allSeries";
                        scope.filters.sett = null;
                        scope.load();
                    }
                }

                scope.collectedSetts = [
                    { id: "allSeries", name: "Choose a Series" },
                    { id: "infinite", name: "Unlimited series" },
                    { id: "finite", name: "Limited series" },
                    { id: "freePackAvailable", name: "Free packs available" },
                    { id: "anyPackAvailable", name: "Any packs available" },
                    { id: "outOfPrint", name: "Out of print series" },
                    { id: null, name: "" },
                ];
                scope.seriesFilter = scope.initSettId ?? "allSeries";
                if (tradeFilterSets.hasDefaultFilterSet()) {
                    scope.filterSetId = "Default";
                    scope.applyFilterSet(); // triggers scope.load()
                } else {
                    scope.load();
                    scope.seriesFilter = "allSeries";
                }
                const data = userCollections.getCollections(givingUser);
                if (data instanceof Promise) {
                    data.then((d) => prepareSettsForDisplay(d));
                } else {
                    prepareSettsForDisplay(data);
                }
                debug("nmTradesAdd2 initiated");
            },
        }),
    ]);
}, {
    // insert collection progress
    names: [
        "/static/common/trades/partial/add.html",
        "/static/common/trades/partial/item-list.html",
    ],
    patches: [{
        target: "<dt class=small-caps>Rarity</dt>",
        prepend:
            `<dt class=small-caps>Collected</dt>
            <dd>
                <span
                    nm-collection-progress=you
                    nm-collection-progress-sett-id=print.sett_id
                ></span>,
                <span
                    nm-collection-progress=partner
                    nm-collection-progress-sett-id=print.sett_id
                ></span>
            </dd>`,
    }],
}, {
    // insert the print chooser
    names: ["/static/common/trades/partial/item-list.html"],
    patches: [{
        target: "#{{print.print_num}}",
        replace: "<span nm-print-chooser=print></span>",
    }],
}, {
    // we cannot override a directive so we replace it in the template to our own directive
    names: ["/static/common/trades/partial/create.html"],
    patches: [{
        target: "nm-trades-add",
        replace: "nm-trades-add2",
    }],
}, {
    names: ["/static/common/trades/partial/add.html"],
    patches: [{
        // insert buttons to select or hide card's series
        target: "{{print.sett_name}}</a>",
        append:
            `<span ng-if="!filters.sett">
                <span class="icon-button search-series-button"
                    ng-click="selectSeries(print.sett_id)"></span>
                <span class="icon-button" ng-click="hideSeries(print.sett_id)">🗙</span>
            </span>`,
    }, {
        // display list of hidden series
        target: "<ul",
        prepend:
            `<div class="hiddenSeries" ng-if="hiddenSeries.length && !filters.sett">
                <span class="small-caps">Hidden series: </span>
                <span ng-repeat="sett in hiddenSeries">
                    <span class="tip" title="{{sett.tip}}">{{sett.name}}</span>
                    <a ng-click="showSeries(sett.id)">✕</a>{{$last ? "" : ","}}
                </span>
            </div>`,
    }, {
        // insert list of filter sets and button to reset selected series
        target: `<select class="btn small subdued series"`,
        prepend:
            `<select class="btn small subdued filter-sets"
                ng-model=$parent.filterSetId
                ng-options="fset.id as fset.name for fset in filterSets"
                ng-change=applyFilterSet()
            ></select>
            <span class="icon-button tip"
                title="Delete filter set"
                ng-click="deleteFilterSet()">🗑</span>
            <span class="reset tip" title="Reset series" ng-click="selectSeries(null)">
                <i class='reset-sett'></i>
            </span>`,
    }, {
        // display series filters in the list of collecting series
        target: `<select class="btn small subdued series" ng-model=filters.sett`,
        replace: `<select class="btn small subdued series" ng-model=$parent.seriesFilter`,
    }, {
        // more advanced filtering is used instead of
        target: `ng-if="showCards() && displayPrintInList(print)"`,
        replace: "",
    }, {
        // fix loading indicator
        target: "!itemData.length && !showLoading()",
        replace: "!itemData.length && !loadingMore",
    }],
});
