import type NM from "../utils/NMTypes";
import type { CurrentUser } from "../utils/NMTypes";

import { debug } from "../utils/utils";
import { getInitValue } from "./init";

const user = await getInitValue<CurrentUser>("user");

const currentUser = {
    id: user?.id ?? 0,
    you: {
        id: user?.id ?? 0,
        first_name: "You",
        name: "You",
        username: "you",
        avatar: user?.avatar,
        link: user?.links.profile,
        pro_badge: user?.pro_badge,
        pro_status: user?.pro_status,
        twitter_username: null,
        url: "/",
        bio: user?.bio ?? "",
        last_name: "",
        links: user?.links ?? {},
        trader_score: user?.trader_score ?? 7
    } as NM.UserFriend & NM.User,
    /**
     * Is the user limited in the available features
     */
    areFeaturesGated: user?.accessible_features.length > 0,
    /**
     * The user is logged in
     */
    isAuthenticated: user !== null,
    /**
     * The user has verified his email
     */
    isVerified: user?.is_verified === true,
    /**
     * Whether the user able to use the named feature
     * @param feature - name of the feature
     */
    canDo(feature: string) {
        if (!user) return false;
        // if no limitations
        if (user.accessible_features.length === 0) return true;
        return user.accessible_features.includes(feature);
    },
}

export default currentUser;

debug("user info loaded")
