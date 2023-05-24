/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-namespace */

// eslint-disable-next-line no-unused-vars
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type fullURL = `https://${string}`
export type absoluteURL = `/${string}`
export type queryURL = `?${string}`
export type timestamp = string

export type CurrentUser = Omit<NM.User, "name"|"first_name"|"last_name"> & {
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
    level: NM.UserLevel,
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

export type rarity = "Common" | "Uncommon" | "Rare" | "Very rare" | "Extra Rare" | "Chase" | "Variant" | "Legendary"
export type rarityLow = Lowercase<rarity>
export type rarityCss = "common" | "uncommon" | "rare" | "veryRare" | "extraRare" | "chase" | "variant" | "legendary"
export type rarityNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type difficulty = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

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
            changes: Record<string, unknown>,
            errors: object,
            uid: string,
        }
    };
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

    type BadgeEarned = {
        id: string | null,
        user_badge_id: number,
        badge: number,
        name: string,
        description: string,
        image_url: fullURL,
        noun: string,
        public_url: fullURL,
        sett: {
            id: number,
            name: string,
            public_url: absoluteURL,
            status: number
        },
        verb_phrase: string,
        type: string,
        achieved: boolean,
        rank_details: {
            completion_order: number,
            rank: number,
            duration: string,
            completion_time: string
        },
        metrics: null,
        carats: number,
        rarity: string,
        carats_multiplier: number
    }

    type BadgeNotification = Notification<{
        type: "badge-obtained",
    }, "badge", "hit">

    type Card = {
        id: number,
        name: string,
        is_replica: boolean,
        /**
         * Sett type:
         * 1 - old limited;
         * 2 - unlimited;
         * 3 - new limited.
         */
        version: 1|2|3,
        asset_type: "image" | "video",
        rarity: {
            name: rarityLow,
            class: rarityCss,
            value: rarityNumber,
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

    type ComingSoonNotification = Notification<{
        noun: "Series-remainder",
        type: "Series-remainder",
        name_slug: string,
    }, "coming-soon", "coming-soon">

    type ConversationInfo = MessageNotification["object"];

    type FriendNotification = Notification<{
        noun: "friend",
        type: "friend",
    }, "friend", "added"/* more verbs? */>

    type Error = {
        detail: string,
    }

    type Image = {
        width: number,
        height: number,
        url: fullURL
    }

    /**
     * A message in a conversation
     */
    type Message = {
        id: number, // msg id
        user_id: number,
        comment: string,
        created: timestamp,
        modified: timestamp,
        attachment?: Pick<Trade, "id"|"bidder_offer"|"responder_offer"|"state"> & {
            type: "trade",
            active: boolean,
            bidder_id: number,
            responder_id: number,
            url: queryURL,
        },
    }

    /**
     * A conversation preview (the last message)
     */
    type MessageNotification = Notification<{
        // the message is in `actor.actor_action`
        notification_type: "messages",
        noun: "Conversation",
        type: "conversation",
        users: UserCollocutor[],
    }, "comment", "commented on">

    type Milestone = {
        name: string,
        sett: Pick<Sett, "id"|"name"|"creator"|"difficulty"|"public_url"|"sett_assets">,
        reward: number,
        css_class: rarityCss,
        image: fullURL,
        owned: number,
        total: number,
        discontinue_date?: timestamp,
        completed_date?: timestamp,
    };

    type Notification<Data extends object, Verb extends string, Phrase extends string> = {
        id: string, // event id
        read: boolean,
        verb: Verb,
        verb_phrase: Phrase,
        actor: {
            action_data?: string|null,
            avatar: { small: fullURL, large: fullURL },
            first_name: string,
            id: number,
            name: string,
            time: timestamp,
            username: string,
        },
        object: Omit<{
            id: number,
            notification_type: string|null,
            noun: string,
            type: string,
            images: fullURL[],
            images_class?: string | null,
            url?: absoluteURL,
            users: UserMinimal[],
        }, keyof Data> & Data,
    }

    // for /api/pieces/ - Cards section on the profile page
    type OwnedCard = Omit<Card, "rarity"> & {
        description: string,
        is_limited_sett: boolean,
        num_prints_total: number | "unlimited",
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
        rarity: {
            name: rarity,
            class: rarityCss,
            rarity: rarityNumber,
            carats: number // discard value
        },
        sett_id: number,
        sett_name: string,
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
        name: string,
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

    type Print = Omit<OwnedCard, "own_count"|"favorite"> & {
        sett_name_slug: string,
        /**
         * Global print id
         */
        print_id: number,
        /**
         * In-series print number
         */
        print_num: number,
        prints_part_of_trade: {
            print_id: number,
            bidder_trades: number,
            responder_trades: number
        }[]
    }

    type PrintCount = [number /* card id */, number /* amount */]

    type PrintInTrade = Omit<Print,
        "sett_name_slug"|"public_url"|"is_replica"|"version"|"prints_part_of_trade"
    > & {
        /**
         * Available only when part of Trade type
         */
        own_counts?: {
            bidder: number,
            responder: number
        }
    }

    // series completion reward
    type Reward = {
        sett: Pick<Sett, "id" | "name" | "creator" | "difficulty" | "public_url" | "sett_assets">,
        rank: number,
        completion_order: number,
        duration: string,
        completion_time: string,
        carats: number,
        difficulty_bonus: number,
        pro_bonus: number,
        total: number
    }

    type Trade = {
        id: number,
        bidder: User,
        responder: User,
        bidder_offer: {
            prints: PrintInTrade[],
            packs: never[],
        },
        responder_offer: {
            prints: PrintInTrade[],
            packs: never[],
        },
        parent_id: number | null,
        completed: timestamp | null,
        created: timestamp,
        state: "proposed" | "modified" | "countered" | "accepted" | "auto-withdrew" | "auto-declined" | "declined" | "expired",
        expire_date: timestamp,
        badges: BadgeEarned[],
        completed_on: timestamp | null,
        timestamp: timestamp, // time of creation?
        rewards?: Reward[],
        total_carats?: number,
        level_ups?: UserLevelUp[],
    }

    // return at trade creating
    type TradeResult = {
        id: number,
        bidder: User,
        responder: User,
        bidder_items: {
            id: number, // ID of proposed item???
            created: timestamp,
            modified: null,
            owner: number,
            pack: null,
            prnt: number,
            trade: number,
        }[],
        responder_items: {
            id: number, // ID of proposed item???
            created: timestamp,
            modified: null,
            owner: number,
            pack: null,
            prnt: number,
            trade: number,
        }[],
        completed: null | timestamp,
        completed_action: null | string, // ??
        completed_by: null | number, // ??
        created: timestamp,
        is_bot_trade: boolean,
        level_ups: UserLevelUp[],
        modified: null,
        parent: null,
    }

    type TradeNotification = Notification<{
        type: "trade-event",
        noun: "trade",
        expires_on: timestamp,
        completed: timestamp | null,
        url: queryURL,
    }, "traded", Trade["state"]>

    type Sett = {
        id: number,
        name: string,
        name_slug: string,
        creator: Omit<UserFriend, "url">,
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
        }[],
        /**
         * Sett type:
         * 1 - old limited;
         * 2 - unlimited;
         * 3 - new limited.
         */
        version: 1|2|3,
        favorite: boolean,
        base_completed: boolean,
        difficulty: {
            id: Exclude<difficulty, 0> | 9,
            name: "Beginner"|"Piece of Cake"|"Very Easy"|"Easy"|"Moderate"|"Hard"|"Very Hard"|"Near Impossible"|"Quest!",
            class_name: `difficulty-${difficulty}`,
            level: difficulty
        },
        replica_parent: null|number,
        notify: boolean
    }

    type SettMetrics = Pick<Sett,
        "id"|"name"|"name_slug"|"version"|"preview_0"|"preview_1"|"replica_parent"
    >& {
        name_slug_regexed: string,
        status: "published",
        core_piece_count: number,
        chase_piece_count: number,
        variant_piece_count: number,
        legendary_piece_count: number,
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

    type UserCollocutor = Omit<NM.User, "last_name"> & {
        pro_badge: string|null,
        pro_status: 0|1,
    }

    type UserFriend = Pick<User, "id"|"username"|"name"|"first_name"|"avatar" > & {
        link: absoluteURL,
        twitter_username: null | string,
        pro_status: 0|1,
        pro_badge: null | string,
        /**
         * api endpoint
         */
        url: absoluteURL,
    }

    type UserMinimal = Pick<User, "id"|"name"|"first_name"|"username">

    type UserLevel = {
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
        current_progress: number, // 0-99
        previous_level_name: string
    }

    type UserLevelUp = UserLevel & {
        carats: number,
        pro_bonus: number,
        total_carats: number,
        new_features: {
            title: string,
            description: string,
            "icon-class": string,
            "bg-class": string,
        }[],
        levelup_tip: XOR<{}, {
            tip: string,
            iconClasses: Record<string, string>,
        }>,
    }

    namespace Unmerged {
        type Container<Data extends object> = {
            deferreds: {},
            payload: Data,
            // some of payload's fields are kept in the refs
            refs: Record<string, object>,
        }

        type FavoriteCards = {
            results: (Omit<Card, "asset_type"|"own_count"|"rarity"> & {
                rarity: OwnedCard["rarity"],
                sett: Pick<NM.Sett, "id"|"name"|"difficulty"|"links"|"sett_assets"> & {
                    creator: UserMinimal,
                },
            })[],
            target: UserLong,
            viewer: UserLong,
        }

        type FavoriteSetts = {
            results: Pick<NM.Sett, "id"|"name"|"difficulty"|"favorite"|"links"|"sett_assets" > & {
                creator: UserShort,
            }[],
            target: UserLong,
            viewer: UserLong,
        }

        type Prints = {
            id: number,
            name: string,
            description: string,
            rarity: Rarity,
            asset_type: "image" | "video",
            piece_assets: Print["piece_assets"],
            absolute_url: absoluteURL,
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

        // eslint-disable-next-line no-shadow
        type Sett = {
            creator: UserShort,
            discontinued: timestamp | null,
            id: number,
            links: NM.Sett["links"],
            name: string,
            price: number | null,
            released: timestamp,
            sett_type: number
        }

        type UserLong = User & {
            timezone_offset: number,
            link: absoluteURL,
            vacation_mode: boolean,
            is_ambassador: boolean,
            is_creator: boolean,
            is_newbie: boolean,
            is_active: boolean,
            pro_status: 0 | 1,
            is_staff: boolean,
            twitter_username: null | string,
            connected_accounts: Record<string, unknown>,
            is_verified: boolean,
            num_prints: number,
            num_favorites: number,
            tranche: string,
        }

        type UserShort = {
            id: number,
            link: string,
            name: string,
            twitter_username: string | null,
        }
    }
}

export default NM;
