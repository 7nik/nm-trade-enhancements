import type IO from "socket.io-client";

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
// type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type fullURL = string
export type absoluteURL = string
export type queryURL = string // starting with "?"
export type timestamp = string

export type CurrentUser = NM.User & {
    timezone_offset: number,
    original_timezone_offset: number,
    email: string,
    /* series id - number of used freebies */
    todays_freebies_count: Record<number, number>,
    referral_code: string,
    num_pieces_to_redeem: number,
    has_rewards: boolean,
    balance: number, // credits?
    carats: number,
    num_daily_freebies: number,
    pack_freebies_today: number, // used freebies today
    num_freebies_left: number,
    get_freebie_limit: number,
    connected_accounts: {},
    is_creator: boolean,
    pro_status: 0 | 1,
    pro_badge: "svg-pro-icon" | null,
    pro_subscription_enabled: boolean,
    is_staff: boolean, // staff != ambassador
    points: number,
    level: {
        name: string,
        title: number,
        level: number,
        copy: string,
        next_level_points: number,
        points_required: number,
        icon_type: number,
        icon_color: string, // #color
        web_icon_selector: string,
        app_icon_selector: string,
        gradient_color: string, // #color
        current_progress: number,
        previous_level_name: string
    },
    is_verified: boolean,
    vacation_mode: boolean,
    permissions: {
        "art.change_sett": boolean,
        "art.add_amateur_sett": boolean
    },
    accessible_features: string[],
    new_user_nav_variant: boolean,
    carats_per_free_pack: number
}

type rarity = "Common" | "Uncommon" | "Rare" | "Very rare" | "Extra Rare" | "Chase" | "Variant" | "Legendary"
type rarityLow = Lowercase<rarity>
type rarityCss = "common" | "uncommon" | "rare" | "veryRare" | "extraRare" | "chase" | "variant" | "legendary"

declare global {
    var NM: {
        ajaxError: Function,
        ajaxGlobalError: Function,
        cache: Function,
        error: Function,
        extractPartials: Function,
        forms: Record<string, Function>,
        logged_in: boolean,
        modules: Record<string, Function>,
        render: Function,
        settings: {
            cdn_base_url: string,
        },
        you: {
            attributes: CurrentUser,
            callbacks: {
                save: Function[],
            },
            changes: {},
            errors: object,
            uid: string,
        }
    }
    // NM uses io@1.3.5 but the minimal typed one is v3
    var io: IO.Manager;
}

declare namespace NM {

    type Activity<Data extends object> = Data & {
        type: string,
        detail_url: fullURL,
        created: string,
    }

    type Badge = {
        name: string,
        badge: number,
        achieved: boolean,
        rarity: rarityCss | "all_core_pieces",
        metrics: {
            total: number,
            owned: number,
            name: rarityLow | "Total",
            css_class: rarityCss | "all_core_pieces"
        },
        is_special: boolean,
        rewards: number,
    }

    type Card = {
        id: number,
        name: string,
        is_replica: boolean,
        version: 1|2|3,
        asset_type: "image" | "video",
        rarity: {
            name: rarityLow,
            class: rarityCss,
            value: number,
            carats: number
        },
        piece_assets: {
            image: {
                small: Image,
                "small-gray": Image,
                medium: Image,
                "medium-gray": Image
            },
            video?: {
                medium: Video
            }
        },
        own_count: number,
        favorite: boolean,
    }

    type Event<Data extends object, Verb extends string, Phrase extends string> = {
        id: string, // event id
        read: boolean,
        verb: Verb,
        verb_phrase: Phrase,
        actor: {
            action_data?: string|null,
            avatar: { small: Image, large: Image },
            first_name: string,
            id: number,
            name: string,
            time: timestamp,
            username: string,
        },
        object: Data & {
            notification_type: string|null,
            noun: string,
            type: string,
            images: fullURL[],
            url?: absoluteURL,
        }
    }

    type Image = {
        width: number,
        height: number,
        url: fullURL
    }

    type Pack = {
        id: number,
        default_pack_size: number,
        bonus_type: string,
        bonus_pieces: number,
        prints: Print & {
            is_new: boolean,
            creator_twitter_username: null | string,
            discarded: boolean,
            favorite: boolean,
        }[],
        profile_collection_url: string,
        badges: [],
        rewards: {
            total_carats: number,
            level_ups?: [],
        },
    }

    type PackTier = {
        name: String,
        pack_size: number, // card number
        price: number,
        tint: string, // #color of bg
        is_available: boolean, // packs aren't sold out yet
        is_pro_tier?: boolean,
        visibility_of_pro_tiers?: "all"
        can_user_open: true, // does user have enough currency
        count: number | -1, // total packs according to the distribution
        available: number | -1, // packs left according to the distribution
        sold_out: boolean,
        currency: "freebie" | "credit" | "carat",
        distribution: "replenishing" | "fixed" | "constant",
        partials: {
            name: rarityLow,
            css_class: rarityCss,
            guaranteed: true,
            percent: string,
            total: number, // number of cards of this rarity
        }[],
        any_guaranteed: boolean,
        freebies_remaining?: number,
        freebies_discontinued?: timestamp | null,
        open_pack_url: absoluteURL,
        art_override?: boolean,
        banner?: {
            active: boolean,
        },
        cdn_cover_image?: fullURL | null,
    }

    type Print = {
        id: number, // card id
        name: string,
        description: string,
        rarity: {
            name: rarity,
            class: rarityCss,
            rarity: number,
            carats: number // discard value
        },
        asset_type: "image" | "video",
        piece_assets: {
            image: {
                "large-promo": Image,
                "xlarge-gray": Image,
                xlarge: Image,
                "large-gray": Image,
                large: Image,
                "medium-gray": Image,
                medium: Image,
                "small-gray": Image,
                small: Image,
                original: Image
            },
            video?: {
                medium: Video,
                large: Video,
                original: Video
            }
        },
        public_url: fullURL,
        num_prints_total: number | "unlimited",
        is_limited_sett: boolean,
        sett_id: number,
        sett_name: string,
        sett_name_slug: string,
        is_replica: boolean,
        version: 1|2|3,
        print_id: number, // global print id
        print_num: number, // in-series print number
        prints_part_of_trade: {
            print_id: number,
            bidder_trades: number,
            responder_trades: number
        }[]
    }

    type PrintCount = [number /* card id */, number /* amount */]

    type PrintInTrade = Print & Without<{
        sett_name_slug: string, 
        public_url: string, 
        is_replica: boolean, 
        version: number, 
        prints_part_of_trade: object
    }, Print> & {
        own_counts: {
            bidder: number,
            responder: number
        }
    }

    type Trade = {
        id: number,
        bidder: User,
        responder: User,
        bidder_offer: {
            prints: PrintInTrade[]
            packs: []
        },
        responder_offer: {
            prints: PrintInTrade[]
            packs: []
        },
        parent_id: number | null,
        completed: timestamp | null,
        created: timestamp,
        state: "proposed" | "modified" | "countered" | "accepted" | "auto-withdrew" | "auto-declined" | "declined",
        expire_date: timestamp,
        badges: [], // is received only in notifications?
        completed_on: timestamp | null,
        timestamp: timestamp, // time of creation?
    }

    type TradeEvent = Event<{
        type: "trade-event",
        noun: "trade",
        users: [
            {
                username: string,
                first_name: string,
                id: number,
                name: string
            }
        ],
        id: number, // trade id
        expires_on: timestamp,
        completed: timestamp | null,
        url: queryURL,
    }, "traded", Trade["state"]>

    type Sett = {
        id: number,
        name: string,
        name_slug: string,
        creator: {
            id: number,
            username: string,
            name: string,
            first_name: string,
            avatar: {
                small: fullURL,
                large: fullURL
            },
            link: absoluteURL,
            twitter_username: null | string,
            pro_status: 0|1,
            pro_badge: null | string
        },
        description: string,
        percent_sold_out: number,
        free_packs_claimed_percent: number,
        sett_assets: {
            small: Image,
            medium: Image,
            large: Image,
            "large-blur": Image,
            original: Image
        },
        released: timestamp,
        published: timestamp,
        daily_freebies: number,
        permalink: absoluteURL,
        links: {
            self: absoluteURL,
            pieces: absoluteURL,
            permalink: absoluteURL,
            piece_names: absoluteURL,
            "api-pack": absoluteURL
        },
        price: number|null,
        preview_0: fullURL,
        preview_1: fullURL,
        preview_2: fullURL,
        preview_3: fullURL,
        sett_type: 0|3,
        core_stats: {
            rarity: 0|1|2|3|4,
            name: "common"|"uncommon"|"rare"|"very rare"|"extra rare",
            class_name: "common"|"uncommon"|"rare"|"veryRare"|"extraRare",
            total: number,
            owned: number,
            total_prints: number
        }[]
        special_stats: {
            rarity: 5|6|7,
            name: "chase"|"variant"|"legendary",
            class_name: "chase"|"variant"|"legendary",
            total: number,
            owned: number,
            total_prints: number
        }[]
        free_packs_available: boolean,
        packs_available: boolean,
        total_print_count: number | -1,
        edition_size: "limited" | "unlimited",
        discontinued: null | timestamp,
        discontinue_date: timestamp,
        prints_per_free_pack: number,
        prints_per_paid_pack: number,
        freebies_discontinued: null | timestamp,
        exclusivity: 0|1,
        limited_release: boolean,
        public_url: fullURL,
        categories: {
            id: number,
            name: string,
            name_slug: string,
            legacy_setts_url: absoluteURL,
            setts_url: absoluteURL,
            collect_url: absoluteURL,
            description: string
        }[]
        version: 1|2|3,
        favorite: boolean,
        base_completed: boolean,
        difficulty: {
            id: number,// 1-9
            name: "Beginner"|"Piece of Cake"|"Very Easy"|"Easy"|"Moderate"|"Hard"|"Very Hard"|"Near Impossible"|"Quest!",
            class_name: string,
            level: number // 0-8
        },
        replica_parent: null|number,
        notify: boolean
    }

    type SettMetrics = {
        id: number,
        name_slug: string,
        name_slug_regexed: string,
        name: string,
        status: string,
        version: 1|2|3,
        core_piece_count: number,
        chase_piece_count: number,
        variant_piece_count: number,
        legendary_piece_count: number,
        preview_0: fullURL,
        preview_1: fullURL,
        replica_parent: null | number,
        background_image: fullURL,
        cover_image: fullURL,
        pack_last_acquired: number, // timestamp
        links: {
            permalink: fullURL
        },
        creator: {
            user_id: number,
            username: string,
            name: string,
        },
        sett_assets: {
            medium: {
                url: fullURL
            }
        },
        owned_metrics: {
            owned_core_piece_count: number,
            owned_chase_piece_count: number,
            owned_variant_piece_count: number,
            owned_legendary_piece_count: number
        }
    }

    type Video = {
        width: number,
        height: number,
        sources: {
            mime_type: "video/webm" | "video/mp4" | "image/gif",
            url: fullURL
        }[]
    }

    type User = {
        id: number,
        name: string,
        first_name: string,
        last_name: string,
        username: string,
        avatar: {
            small: fullURL,
            large: fullURL
        },
        links: {
            self: absoluteURL,
            print_counts: fullURL,
            display_case: fullURL,
            display_case_save: absoluteURL,
            collected_setts_names_only: fullURL,
            referral_url: absoluteURL,
            profile: absoluteURL,
            signup_sett_url?: absoluteURL,
        },
        bio: string,
        trader_score: number
    }

    namespace Unmerged {
        type Container<Data extends object> = {
            deferreds: {},
            payload: Data,
            // some of payload's filed are kept in the refs
            refs: Record<string, object>,
        }

        type Prints = {
            id: number,
            name: string,
            description: string,
            rarity: Rarity,
            asset_type: "image" | "video",
            piece_assets: {
                image: {
                    "large-promo": NM.Image,
                    "xlarge-gray": NM.Image,
                    xlarge: NM.Image,
                    "large-gray": NM.Image,
                    large: NM.Image,
                    "medium-gray": NM.Image,
                    medium: NM.Image,
                    "small-gray": NM.Image,
                    small: NM.Image,
                    original: NM.Image
                },
                video?: {
                    medium: NM.Video,
                    large: NM.Video,
                    original: NM.Video
                }
            },
            public_url: fullURL,
            num_prints_total: number | "unlimited",
            set: Sett,
            is_replica: boolean,
            version: 1|2|3,
            prints_part_of_trade: {
                print_id: number,
                bidder_trades: number,
                responder_trades: number
            }[]
            prints: {
                id: number,
                print_num: number,
                public_url: fullURL,
            }[],
        }

        type Rarity = {
            carats: number,
            class: rarityCss,
            image: fullURL,
            name: rarity,
        }

        type Sett = {
            creator: User,
            discontinued: timestamp | null,
            id: number,
            links: {
                self: absoluteURL,
                pieces: absoluteURL,
                permalink: absoluteURL,
                piece_names: absoluteURL,
                "api-pack": absoluteURL
            },
            name: string,
            price: number | null,
            released: timestamp,
            sett_type: number
        }

        type User = {
            id: number,
            link: string,
            name: string,
            twitter_username: string | null,
        }
    }
}

export default NM;
