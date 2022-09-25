import type NM from "../utils/NMTypes";
import type { Unsubscriber } from "svelte/store";

import NMApi from "../utils/NMApi";
import { derived, readable, writable } from "svelte/store";
import { getUserStatus } from "../utils/NMLiveApi";
import currentUser from "./currentUser";


/**
 * Returns the user's first name either username
 */
export function firstName (user: NM.UserMinimal) {
    if (user.id === currentUser.id) {
        return "You";
    }
    return user.first_name || user.username || "someone";
}

/**
 * Returns the user's first name either username if possessive form
 */
export function firstNamePossessive (user: NM.UserMinimal) {
    if (user.id === currentUser.id) {
        return "your";
    }
    return firstName(user) + "'s";
}

export const friendList = {
    /**
     * Live list of user's friends
     */
    list: writable<NM.UserFriend[]>([], (set) => {
        NMApi.user.getFriends().loadAll().then(set);
    }),
    /**
     * Whether the user is in the friend list
     */
    isFriend(userId: number) {
        return derived(friendList.list, (list) => !!list.find(({ id }) => id === userId));
    },
    /**
     * Add user to the friend list
     */
    async startFriendship(userId: number) {
        const friend = await NMApi.user.addFriend(userId);
        friendList.list.update((list) => [...list, friend]);
    },
    /**
     * Remove user from the friend list
     */
    async endFriendship(userId: number) {
        await NMApi.user.removeFriend(userId);
        friendList.list.update((list) => list.filter(({ id }) => id !== userId));
    },
    /**
     * Get live number of online friends
     */
    getOnlineNumber() {
        return readable(0, (setNumber) => {
            function countOnline(statuses: boolean[]) {
                return statuses.reduce((num, online) => num + (online ? 1 : 0), 0);
            }
            let unsubscribe1: Unsubscriber;
            const unsubscribe2 = friendList.list.subscribe((list) => {
                // first subscribe to new values and then unsubscribe from the old ones
                // to avoid status stores with temporary 0 subscribers
                const stop = derived(list.map(({ id }) => getUserStatus(id)), countOnline)
                    .subscribe(setNumber);
                unsubscribe1?.();
                unsubscribe1 = stop;
            });
            return () => {
                unsubscribe1();
                unsubscribe2();
            }
        });
    },
};

export const blockedUsers = {
    /**
     * Live list of users blocked by the current user
     */
    list: writable<NM.UserFriend[]>([], (set) => {
        NMApi.user.getBlockedUsers().then(set);
    }),
    /**
     * Whether the user is blocked or the current user is blocked by this user
     * @returns whether blocked and who has blocked
     */
    isBlocked(userId: number) {
        return derived(blockedUsers.list, (list, set) => {
            if (list.find(({ id }) => id === userId)) {
                set({
                    isBlocked: true,
                    isBlockedByUser: true,
                });
            } else {
                NMApi.user.isBlockedUser(userId).then((data) => {
                    set({
                        isBlocked: data.is_blocked,
                        isBlockedByUser: data.user_initiated,
                    })
                });
            }
        }, {
            isBlocked: false,
            isBlockedByUser: false,
        });
    },
    /**
     * Block the user
     */
    async blockUser(userId: number) {
        friendList.endFriendship(userId);
        const user = await NMApi.user.blockUser(userId);
        blockedUsers.list.update((list) => [...list, user]);
    },
    /**
     * Unblock the user
     */
    async unblockUser(userId: number) {
        await NMApi.user.unblockUser(userId);
        blockedUsers.list.update((list) => list.filter(({ id }) => id !== userId));
    },
};
