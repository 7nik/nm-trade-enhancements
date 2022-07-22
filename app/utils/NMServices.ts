import type { CurrentUser } from "./NMTypes";
import type NM from "./NMTypes";

type fullURL = string
type absoluteURL = string

type OfferType = "bidder_offer" | "responder_offer";

type $httpConfig = Partial<{
    method: string,
    url: string,
    params: object,
    data: object|string,
    headers: Record<string,string|(()=>string)>,
    eventHandlers: Record<string, Function>,
    uploadEventHandlers: Record<string, Function>,
    xsrfHeaderName: string,
    xsrfCookieName: string,
    transformRequest: Function|Function[],
    transformResponse: Function|Function[],
    paramSerializer: string|((data:object)=>string),
    cache: boolean|object,
    timeout: number|Promise<unknown>,
    withCredentials: boolean,
    responseType: string,
}>

type Paginated<Data> = Data & {
    count: number,
    next: fullURL | null,
    retrieveNext: () => Promise<Paginated<Data>> | null;
}

declare namespace Services {

    type ArtConfig = {
        userTips: string[],
        tipsDismissUrl: absoluteURL,
        targetId: number, // current user id
        "profile-milestones": absoluteURL,
        num_sett_concepts: number,
        max_caption_length: number,
        defaultImageUrl: fullURL,
        defaultAvatarUrl: fullURL,
        canBrag: true,
        links: {
            "profile-collection": absoluteURL,
            terms: absoluteURL,
            signup: absoluteURL,
            "home-signin": absoluteURL,
            signout: absoluteURL,
        },    
        profileLinks: {
            "profile-creator": absoluteURL,
            "profile-collection": absoluteURL,
            "profile-milestones": absoluteURL,
            "profile-favorites": absoluteURL
        },
        api:Record<string, absoluteURL>,
        "node-api-endpoint": fullURL,
        "po-animation-assets": fullURL,
        yahoo: fullURL
}

    type ArtConstants = {
        SEGMENT_ANONYMOUS_TRACKING: boolean;
        NOTIFICATIONS_KEY: "notifications";
        TRADE_OFFERS_KEY: "trade_offers";
        MESSAGES_KEY: "messages";
        TRADES_KEY: "trades";
        MILESTONE_SUGGESTION_KEY: "suggestion";
        MILESTONE_RECENT_KEY: "recent";
        MILESTONE_COMPLETED_KEY: "completed";
        MILESTONE_KEY: "milestone";
        SETT_STATUS_OPTIONS: {
            editing: 0;
            submitted: 1;
            published: 2;
        };
        PRO_USER_CHOICES: {
            normal: 0;
            pro: 1;
            cancelled: 2;
        };
        SUBSCRIPTION_STATUS: {
            UPCOMING: 0;
            ACTIVE: 1;
            CANCELLED: 2;
            ON_DUE: 3;
            EXPIRED: 4;
            ABORTED: 5;
            DISABLED: 6;
            RENEWING: 7;
            ON_HOLD: 11;
        };
        SUBSCRIPTION_BUNDLE_WEB: "Web";
        MAX_PREVIEW_PIECES: 4;
        SETT_TYPE_VALUES: {
            normal: 0;
            "promo-only": 1;
            reward: 2;
            amateur: 3;
        };
        VERSION_TYPES: {
            unlimited: 2;
            limited: 3;
        };
        PAYMENT_PROCESSORS: {
            gratis: "gratis";
            stripe: "stripe";
            paypal: "paypal";
        };
        WELCOME_SETT_ID: 99;
        GRAB_BAG_SETT_ID: 308;
        STANDARD_POLICIES: {
            max_piece_count: number | null;
            free_pack_size: number;
            paid_pack_size: number;
            max_daily_freebies: number;
            tiers: {
                beginner: number;
                intermediate: number;
                advanced: number;
            };
        }[];
        SETT_SIZES: {
            smallest: 9;
            smaller: 12;
            small: 20;
            medium_small: 40;
            medium_large: 80;
            large: 100;
            larger: 200;
            largest: 201;
        };
        SETT_FILTERS: {
            created: 0;
            "in-progress": 1;
            submitted: 2;
            published: 3;
        };
        SETT_LEDGER_TYPES: {
            piece_added: "piece_added";
            sett_created: "sett_created";
            modified: "modified";
        };
        TRADE_EXPIRE_HOURS: 48.0;
        SETT_VERSION_UNLIMITED: 2;
        SETT_VERSION_LIMITED: 3;
        BONUS_PACK_FREQUENCY: 0.14;
        DIFFICULTIES: {
            name: string;
            id: number;
            class_name: string;
            level: number;
            locked: boolean;
        }[];
    }

    type ArtMessage = {
        ALERT_ICON_CLASS: "icon-warning",
        CONFIRM_ICON_CLASS: "icon-checkmark",

        getMessage: () => string | null,
        getSubtext: () => string | null,
        getIconClass: () => string | null,
        getStyleClass: () => string | null,
        getBlurClass: () => string | null,
        getOkText: () => string,
        isVisible: () => boolean,
        hasCancelButton: () => boolean,
        hasOkButton: () => boolean,
        closeMs: () => number,
        showAlert: (messages: string | { message:string, subtext:string }, callback?: (canceled: boolean) => void) => void,
        showAlertWithCancel: (messages: string | { message:string, subtext:string }, callback: ((canceled: boolean) => void) | null, okText: string, blurClass?: string) => void,
        showInfo: (messages: string | { message:string, subtext:string }, callback: ((canceled: boolean) => void) | null, okText: string, infoIconClass?: string, styleClass?: string) => void,
        showConfirm: (messages: string | { message:string, subtext:string }, callback?: (canceled: boolean) => void) => void,
        showInfoAutoClose: (params: { message:string, closeMs:number, callback?: (canceled:boolean)=>void }) => void,
        showMessages: (messages: string | { message:string, subtext:string }, callback?: (canceled: boolean) => void) => void,
        close: (canceled: boolean) => void,
    }

    type ArtOverlay = {
        closeOnBackdropClick: () => boolean,
        init: (scope: angular.IScope) => void,
        bindNameToTemplateUrl: (name: string, templateUrl: string, type: string) => void,
        updateTemplateContext: (name: string, context: unknown) => void,
        getType: () => string | null,
        getThemeClass: () => string | null,
        show: (name: string, promise?: Promise<unknown>, clickBackdropToClose?: boolean, themeClass?: string, escapeToClose?: boolean) => Promise<{ name:string, status: unknown }>,
        hide: (status?: unknown) => void,
        showLoading: (promise: Promise<unknown>) => void,
        hideLoading: () => void,
        getTemplateUrl: () => string,
        getName: () => string,
        isLoading: () => boolean,
    }

    type ArtPieceService = {
        NO_USER_ERROR: "NO_USER_ERROR",
        SERVER_ERROR: "SERVER_ERROR",
        syncOwnership: (user?: NM.User | ArtUser) => Promise<NM.PrintCount[]>,
        addPrintOwnerships: (user: NM.User | ArtUser, pieces: NM.Print[] | number[]) => void,
        filterPieces: (user: NM.User | ArtUser, collection: unknown[]) => unknown[],
        removePrintOwnerships: (user: NM.User | ArtUser, pieces: NM.Print[] | number[]) => void,
        addPrintOwnership: (user: NM.User | ArtUser, pieceOfId: NM.Print | number) => void,
        removePrintOwnership: (user: NM.User | ArtUser, pieceOfId: NM.Print | number) => void,
        removePrintOwnershipsDiscard: (user: NM.User | ArtUser, pieces: NM.Print[] | number[]) => void,
        removePrintOwnershipDiscard: (user: NM.User | ArtUser, piece: NM.Print) => void,
        getPieceCount: (user: NM.User | ArtUser, pieces: NM.Print[] | number[]) => number,
        hasPiece: (user: NM.User | ArtUser, pieceOfId: NM.Print | number) => boolean,
        getPrintCount: (user: NM.User | ArtUser, pieceOfId: NM.Print | number) => number,
        isNewForYou: (pieceOfId: NM.Print | number) => boolean,
        getImageRatio: (user: NM.User | ArtUser, piece: NM.Print, size: keyof NM.Print["piece_assets"]["image"]) => string,
        getPromoImageUrl: (piece: NM.Print) => string,
        getImageData: (user: NM.User | ArtUser, piece: NM.Print, size: keyof NM.Print["piece_assets"]["image"], isPublic: boolean) => string,
        preloadImagesSeries: (user: NM.User | ArtUser, pieces: NM.Print[], size: keyof NM.Print["piece_assets"]["image"], isPublic: boolean) => void,
        preloadImages: (user: NM.User | ArtUser, pieces: NM.Print[], size: keyof NM.Print["piece_assets"]["image"], isPublic: boolean) => void,
        getImageUrls: (user: NM.User | ArtUser, pieces: NM.Print[], size: keyof NM.Print["piece_assets"]["image"], isPublic: boolean) => string[],
        toggleFavorite: (piece: NM.User | ArtUser) => void,
    }

    type ArtResource = {
        INVALID: 0,
        NOT_AUTHORIZED: 1,
        NOT_FOUND: 2,
        TIMED_OUT: 3,
        UNKNOWN: 4,
        PRECONDITION_FAILED: 5,
        create: (url: string, obj: object) => Promise<unknown>,
        retrieve: (url: string, config: $httpConfig) => Promise<unknown>,
        retrievePaginated: <Data>(url: string) => Promise<Paginated<Data>>,
        retrievePaginatedAllowCancel: <Data>(config: $httpConfig) => Promise<Paginated<Data>>,
        update: (obj: object, url: string) => Promise<unknown>,
        destroy: (obj: object) => Promise<unknown>,
    }

    type ArtSubscriptionService = {
        subscribe: (event: string, callback: Function) => void,
        unsubscribe: (event: string, callback: Function) => void,
        unsubscribeAll: (event: string) => void,
        broadcast: (event: string, data?: unknown) => void,
    }

    type ArtUrl = {
        updateParams: (url:string, params:object) => string,
        parseParams: (url:string) => Record<string, string>,
        removeParams: (url:string) => string,
        staticUrl: (url:string) => string,
        removeDomain: (url:string) => string,
        addDomain: (url:string) => string,
        join: (root:string, path:string, trailingSlash:boolean) => string,
        addProtocol: (url:string) => string,
        formatExternalUrl: (url:string) => string,
    }

    type ArtUser = {
        toObject: () => CurrentUser,
        update: (userData: CurrentUser) => void,
        isYou: (userData: CurrentUser) => void,
        getId: () => number,
        getFacebookStatus: () => string | undefined,
        getDailyFreebieCount: () => number,
        getFreebiesRemaining: () => number,
        getFreebiesLimit: () => number,
        getTimezoneOffset: () => number,
        decrementFreebiesRemaining: (count: number) => void,
        setFreebiesRemaining: (amt: number) => void,
        getTodaysSettFreebiesCount: (settId: number) => number,
        getTodaysFreebieCount: () => Record<number, number>,
        isAmbassador: () => boolean,
        incrementSetFreebiesCollected: (settId: number) => number,
        updateUserCarats: (balance: number) => void,
        updateUserLevel: (level: CurrentUser["level"]) => void,
        getUserLevel: () => CurrentUser["level"],
        isNewUser: () => boolean,
        getUserCarats: () => boolean,
        hasPermission: (permission: string) => boolean,
        isAuthenticated: () => boolean,
        isStaff: () => boolean,
        isCreatorAdmin: () => boolean,
        isCreator: () => boolean,
        getReferralCode: () => string,
        isConnectedToFacebook: () => string | undefined,
        getCredits: () => number,
        removeCredits: (amount: number) => void,
        getAvatar: (size?: "small" | "large") => fullURL,
        getProUserStatus: () => string | null,
        checkUserProStatus: (proStatus: number) => boolean,
        areFeaturesGated: () => boolean,
        canIDo: (permission: string) => boolean,
        getUserEmail: () => string,
        getUsername: () => string | null,
        getUrl: (name: string) => string | null,
        sync: () => void,
        isVerified: () => boolean,
        getAvatarSource: (size: "small" | "large") => fullURL,
        tradingActive: () => boolean,
        hasVariantNav: () => boolean,
        hasRewards: () => boolean,
        updateCredits: (balance: number) => void,
    }

    type NMTrade = {
        tradeSortOptions: {
            id: string,
            selected: boolean,
            sortOrder: "desc"|"asc"
        }[],
        createNewTrade: (bidder: NM.User, responder: NM.User, initialPieceData: NM.PrintInTrade) => void,
        loadTrade: (id: number) => void,
        postTrade: (loadingState: string, finishedState: string, verb: string) => void,
        acceptTrade: () => void,
        declineTrade: (loadingState: string, finishedState: string, verb: string) => void,
        startModify: () => void,
        startCounter: () => void,

        addItem: (offerType: OfferType, itemType: "prints", item: NM.PrintInTrade) => void,
        removeItem: (offerType: OfferType, itemType: "prints", index: number) => void,
        hasPrintId: (offerType: OfferType, printId: number) => boolean,
        getOfferData: (offerType: OfferType) => { prints: NM.PrintInTrade[]},
        getPrintIds: (offerType: OfferType) => number[],
        isValidTrade: () => boolean,
        getId: () => number,
        getInitialSettId: () => number,
        getResponder: () => NM.User,
        getBidder: () => NM.User,
        shouldAlertBeforeCancel: () => boolean,
        setWindowState: (state: string) => void,
        getWindowState: () => string,
        getTradeState: () => string,
        getTradingPartner: () => NM.User | null,
        clearTradeQuery: () => void,
        // custom fields
        setOfferData: (offerType: OfferType, prints: NM.PrintInTrade[]) => void,
        hasCard: (offerType: OfferType, card: NM.PrintInTrade) => boolean,
    }

    type PoMilestones = {
        getPercentageCompleted: (percentage:number) => 33|66|99,
        calculatePercentage: (rarity: NM.Badge) => void,
        initPoMilestones: () => Promise<NM.Badge[]>,
        fetchMilestones: () => Promise<NM.Badge[]>,
        setProgressImage: () => void,
        fetchSuggestedSetts: (settId: number) => Promise<unknown>,
        isAnimating: (rarity: NM.Badge) => boolean,
        processSuggestionSet: (data: unknown) => void,
        showMilestoneRewardModal: (modalData?: unknown[]) => void,
        updateRarityMilestones: () => void,
        settOpenPackData: (data: NM.Pack) => void,
        getMilestones: () => NM.Badge[],
        getSett: () => NM.Sett,
    }

    type PoPackSelect = {
        PURCHASED_PACK:0,
        FREEBIE_PACK:1,
        PROMO_PACK:4,
        ONBOARDING_PACK:5,
        getTypeDisplay: () => string,
        startPurchasePack: () => void,
        startFreePack: () => void,
        setPackType: (packType: 0|1|4|5) => void,
        setSelectType: (selectType: string) => void,
        isFreebie: () => boolean,
        isPromoPack: () => boolean,
        isOnboardingPack: () => boolean,
        isSpecialPack: () => boolean,
        startPackSelect: (settOrSettUrl: NM.Sett | string) => Promise<NM.Sett>,// ???
        startPackOpen: (packOrUrl: NM.Pack | string) => Promise<NM.Pack>, // ???
        startSettSelect: (settListUrl: string) => Promise<Paginated<unknown>>, // ???
        finish: () => void,
        fetchSett: () => Promise<NM.Sett>,
        setSett: (sett: Promise<NM.Sett>) => void,
        fetchPack: () => void,
        fetchSettList: () => Promise<unknown>, // ???
        selectSett: (sett: NM.Sett) => Promise<NM.Sett>,
        getSelectType: () => string,
    }

    type PoRoute = {
        launchPackTiers: (settOrUrl: NM.Sett | string) => void,
        launchSuggestedSetts: () => void,
        launchOpenPack: (settOrUrl: NM.Sett | string) => void,
        launchOpenPromoPack: (settUrl: string, promoPackPayload: { code:string, store_signup_sett:boolean }) => Promise<void>,
        launchOpenOnboardingPack: (settOrUrl: NM.Sett | string) => void,
        fetchAndOpenPack: (url: string) => Promise<NM.Pack>,
        gotoPackOpenPack: (settId:number) => void,
        openPack: (pack: NM.Pack) => void,
        finish: () => void,
        getView: () => string | undefined,
        getState: () => string | null,
        setState: (state: string) => void,
    }

    // a custom service
    type TradeFilterSets = {
        getFilterSets: () => {id:string|null, name:string}[],
        getFilterSet: (id:string) => {
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
        },
        saveFilterSet: (filters: ReturnType<TradeFilterSets["getFilterSet"]>["filters"], seriesFilter: ReturnType<TradeFilterSets["getFilterSet"]>["seriesFilter"], hiddenSeries: ReturnType<TradeFilterSets["getFilterSet"]>["hiddenSeries"]) => string | null,
        deleteFilterSet: (id: string | null) => boolean,
        hasDefaultFilterSet: () => boolean,
    }

    // a custom service
    type UserCollections = {
        getCollections: (user: NM.User) => Promise<Record<number, NM.SettMetrics>>,
        dropCollection: (user: NM.User) => void,
        getProgress: (user: NM.User, settId: number) => Promise<null | {
            name: string, // sett name
            permalink: absoluteURL,
            coreCount: number,
            chaseCount: number,
            variantCount: number,
            legendaryCount: number,
            totalCount: number,
            coreOwned: number,
            chaseOwned: number,
            variantOwned: number,
            legendaryOwned: number,
            totalOwned: number,
        }>,
    }

    // LumberJack logging system over Raven/console
    type WsLumberjack = {
        log: (...args: any[]) => void,
        info: (...args: any[]) => void,
        warn: (...args: any[]) => void,
        error: (...args: any[]) => void,
        exception: (error: Error, message?: string) => void,
    }
}

export default Services
