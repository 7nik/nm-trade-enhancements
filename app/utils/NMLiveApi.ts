import type NM from "./NMTypes";
import type { Socket } from "socket.io-client";
import type { Readable, Writable } from "svelte/store";

import { get, writable } from "svelte/store";
import config from "../services/config";
import currentUser from "../services/currentUser";
import { getInitValue } from "../services/init";
import NMApi from "./NMApi";
import { error } from "./utils";

const io = await getInitValue("io");

const socketCache: Record<string, Socket> = {};

// know namespaces for io
type Namespace =
    "completed" |
    "conversation" |
    "messages" |
    "notifications" |
    "recent" |
    "suggestion" |
    "trade_offers" |
    "trades" |
    "user" |
    `/${string}`;

/**
 * Get a web-socket
 * @param namespace the endpoint to connect the socket
 * @returns a new or cached socket
 */
function getSocket (namespace: Namespace) {
    if (!namespace.startsWith("/")) namespace = `/${namespace}`;
    if (!(namespace in socketCache)) {
        socketCache[namespace] = io(
            config["node-api-endpoint"] + namespace,
            { transports: ["websocket"] },
        );
        socketCache[namespace].on("disconnect", () => {
            delete socketCache[namespace];
        });
    }
    return socketCache[namespace];
}

type LiveListListenerType<T, EV extends string> =
    EV extends "init" ? (items: T[], total: number) => void
    : EV extends "load" ? (items: T[]) => void
    : EV extends "add" | "remove" ? (item: T) => void
    : (data: any) => void;

// cache for LiveList
// eslint-disable-next-line no-use-before-define, @typescript-eslint/no-explicit-any
const llCache = new Map<string, LiveList<any>>();

/**
 * A class to load a list of data and listen for its changes
 */
class LiveList<T> {
    #socket: Socket;
    #namespace: string;
    #id: number | null;
    #comparator?: (a:T, b:T) => number;
    #list: T[] = [];
    #loading = writable(true);
    #totalCount = 0;
    #store: Writable<T[]> = writable<T[]>([], () => () => {
        // stop listening when everybody unsubs
        this.stopListening();
    });

    #onLoadInitial: LiveListListenerType<T, "init">[] = [];
    #onLoad: LiveListListenerType<T, "load">[] = [];
    #onAdd: LiveListListenerType<T, "add">[] = [];
    #onRemove: LiveListListenerType<T, "remove">[] = [];

    #preAddedItem: T[] = [];

    /**
     * @param namespace - the source endpoint of the list
     * @param id - identification for joining the namespace
     */
    constructor (namespace: Namespace, id: number|null = null, comparator?: (a:T, b:T) => number) {
        this.#namespace = namespace.replace("/", "");
        this.#id = id;
        this.#comparator = comparator;
        this.#socket = getSocket(namespace);

        if (llCache.has(this.#namespace)) {
            // return cached object instead of the created one
            // eslint-disable-next-line no-constructor-return
            return llCache.get(this.#namespace)!;
        }
        llCache.set(this.#namespace, this);

        this.#socket.on("reconnect", () => {
            this.#socket.emit("rejoin", { id: this.#id });
        });

        this.#socket.on("loadInitial", (data: { results: T[], count?: number }) => {
            this.#loading.set(false);
            const items = data.results.concat(this.#preAddedItem);
            const total = (data.count ?? data.results.length) + this.#preAddedItem.length;
            this.#totalCount = total; // will be added back in #addItems()
            this.#addItems(items);
            for (const cb of this.#onLoadInitial) cb(items, total);
        });

        this.#socket.on("load", (items: T[]) => {
            this.#loading.set(false);
            this.#addItems(items);
            for (const cb of this.#onLoad) cb(items);
        });

        this.#socket.on("addItem", (item: T) => {
            this.#addItem(item);
            for (const cb of this.#onAdd) cb(item);
        });

        this.#socket.on("removeItem", (item: T & {id:any}) => {
            this.#removeItem(item.id);
            for (const cb of this.#onRemove) cb(item);
        });

        this.#socket.on("serverError", (data: any) => {
            error("in socket", {
                namespace: this.#namespace,
                joinId: this.#id,
                ...data,
            });
        });

        this.#socket.emit("join", { id: this.#id });
    }

    /**
     * Add an item to the list
     * @param item - the item to add
     */
    #addItem (item: T) {
        this.#totalCount += 1 - this.#filterList((item as T&{id:any}).id);
        this.#setItems([...this.#list, item]);
    }

    /**
     * Add items to the list
     * @param items - items to add
     */
    #addItems (items: T[]) {
        if (items.length > 0) {
            // do not change this.#totalCount because this method
            // is for adding items included in this number
            this.#setItems(items.concat(this.#list));
        }
    }

    /**
     * Remove items with given ID without triggering updates,
     * if the ID is falsy, nothing will be removed
     * @param id - item's ID to remove
     * @returns number of removed items
     */
    #filterList (id: string|number) {
        if (!id) return 0;
        const newList = (this.#list as (T & {id:any})[])
            .filter((item) => item.id !== id);
        const removed = this.#list.length - newList.length;
        this.#list = newList;
        return removed;
    }

    /**
     * Remove from the list items with the given id
     * @param id - item's ID to remove
     */
    #removeItem (id: string|number) {
        this.#totalCount -= this.#filterList(id);
        this.#setItems(this.#list);
    }

    /**
     * Set new value of `list` and triggers update of the `store`
     * @param items
     */
    #setItems (items: T[]) {
        this.#list = items;
        if (this.#comparator) this.#list.sort(this.#comparator);
        this.#store.set(this.#list);
    }

    /**
     * Whether the initial data is still loading
     */
    get loading (): Readable<boolean> {
        return {
            subscribe: this.#loading.subscribe,
        };
    }

    /**
     * Get the used socket, if available
     */
    get socket () {
        return this.#socket;
    }

    /**
     * Get the data as a store,
     * runs `stopListening` when run out of the subscribers
     */
    get store (): Readable<T[]> {
        return {
            subscribe: this.#store.subscribe,
        };
    }

    /**
     * Total count of the items
     */
    get total () {
        return this.#totalCount;
    }

    /**
     * Add an item locally and trigger the listeners
     * @param item - the item to add
     */
    forceAddItem (item: T) {
        for (const cb of this.#socket.listeners("addItem")) cb(item);
    }

    /**
     * Request loading next items
     */
    loadMore () {
        this.#loading.set(true);
        this.send("requestLoad", {
            id: this.#id,
            lastItem: this.#list[0],
        });
    }

    /**
     * Mark a certain item or all the items as read
     * @param id - optional, ID of the item to mark read
     */
    markRead (id?: string) {
        const list = this.#list as (T & {id:string, read:boolean})[];
        if (id) {
            const item = list.find((it) => it.id === id);
            if (!item) return;
            NMApi.user.markNotificationsRead([item.id], this.#namespace);
            this.#addItem({ ...item, read: true });
        } else {
            const ids = list.filter(({ read }) => !read).map((it) => it.id);
            if (ids.length === 0) return;
            NMApi.user.markNotificationsRead(ids, this.#namespace);
            this.#setItems(list.map((item) => (
                item.read ? item : { ...item, read: true }
            )));
        }
    }

    /**
     * Add listener to an event
     * @param eventName - "init", "load", "add", "remove", or any additional event name
     * @param listener - the event handler
     */
    on<E extends string> (eventName: E, listener: LiveListListenerType<T, E>) {
        switch (eventName) {
            case "init": this.#onLoadInitial.push(listener as (x:T[], l:number)=>void); break;
            case "load": this.#onLoad.push(listener as (x:T[])=>void); break;
            case "add": this.#onAdd.push(listener as (x:T)=>void); break;
            case "remove": this.#onRemove.push(listener as (x:T)=>void); break;
            default:
                this.#socket.on(eventName, listener);
                break;
        }
        return this;
    }

    /**
     * Send en event to the server
     * @param eventName - the event name
     * @param data - the event's data
     */
    send (eventName: string, ...data: unknown[]) {
        this.#socket.emit(eventName, ...data);
    }

    /**
     * Send request for adding the item
     * @param item - the item to add
     */
    sendAddItem<S> (item: S extends {id:unknown} ? never : S&Omit<T, "id">) {
        this.send("requestAddItem", {
            id: this.#id,
            item,
        });
        this.#addItem(item as unknown as T);
    }

    /**
     * Send request for removing the item
     * @param item - the item to remove
     */
    sendRemoveItem (item: T & {id:any}) {
        this.send("requestRemoveItem", {
            id: this.#id,
            item,
        });
        this.#removeItem(item.id);
    }

    /**
     * Stop listen for the data changes.
     * You cannot resume the listening
     */
    stopListening () {
        this.#socket.emit("leave", { id: this.#id });
        this.#socket.removeAllListeners();
        llCache.delete(this.#namespace);
    }
}

/**
 * A general date comparator for object sorting
 * @param getter - extracts the date string from the passed object
 * @param reverse - use reverse sorting, default - no
 */
function timeComparator<T> (getter: (x:T) => string, reverse = false) {
    return (a:T, b:T) => (
        new Date(getter(b)).getTime() - new Date(getter(a)).getTime()
    ) * (reverse ? -1 : 1);
}

// known comparators for various namespaces
const comparators = {
    completed: undefined, // milestones
    conversation: timeComparator((x: NM.Message) => x.created, true),
    messages: timeComparator((x:NM.MessageNotification) => x.actor.time),
    notifications: timeComparator((x:NM.Notification<any, string, string>) => x.actor.time),
    recent: undefined, // milestones
    suggestion: undefined, // milestones
    trade_offers: timeComparator((x:NM.TradeNotification) => x.object.completed!), // the trades are completed
    trades: timeComparator((x:NM.TradeNotification) => x.actor.time),
    user: undefined, // nothing to sort
} as Record<Namespace, (<T>(a:T, b:T)=>number) | undefined>;

// known LiveList subtypes for various namespaces
type LiveListType<N extends Namespace> =
    N extends "completed" ? LiveList<NM.Milestone>
    : N extends "conversation" ? LiveList<NM.Message>
    : N extends "messages" ? LiveList<NM.MessageNotification>
    : N extends "notifications" ? LiveList<NM.Notification<any, string, string>>
    : N extends "recent" ? LiveList<NM.Milestone>
    : N extends "suggestion" ? LiveList<NM.Milestone>
    : N extends "trade_offers" ? LiveList<NM.TradeNotification>
    : N extends "trades" ? LiveList<NM.TradeNotification>
    : N extends "user" ? never // LiveList cannot be used on this namespace
    : LiveList<unknown>;

/**
 * Get a LiveList for the given namespace
 * @param namespace - the namespace of the live list
 * @param id - optional ID
 */
function liveListProvider<
    N extends Exclude<Namespace, `/${string}`|"user">
> (namespace: N, id: number|null = null) {
    if (!llCache.has(namespace)) {
        if (!id && ["messages", "notifications", "trade_offers", "trades"].includes(namespace)) {
            id = currentUser.id;
        }
        llCache.set(namespace, new LiveList(namespace, id, comparators[namespace]));
    }
    return llCache.get(namespace) as LiveListType<N>;
}

const connectedUsers = new Map<number, Writable<boolean>>();
const offlineTimers = new Map<number, any>();
const socketUser = getSocket("user");
socketUser.on("requestStatus", () => socketUser.emit("sendStatusConnected"));
socketUser.on(
    "updateStatus",
    (status: { id:number, connected:boolean, initialConnection?: boolean }) => {
        // user can re-connect, so set offline status with delay
        if (status.connected) {
            if (offlineTimers.has(status.id)) {
                clearTimeout(offlineTimers.get(status.id));
                offlineTimers.delete(status.id);
            }
            connectedUsers.get(status.id)?.set(true);
        } else if (!offlineTimers.has(status.id) && !get(connectedUsers.get(status.id)!)) {
            offlineTimers.set(status.id, setTimeout(() => {
                offlineTimers.delete(status.id);
                connectedUsers.get(status.id)?.set(false);
            }, 10_000));
        }
    },
);

/**
 * Returns a store which displays whether a user is online or offline
 * @param userId the user to watch
 * @returns a boolean store
 */
function getUserStatus (userId: number): Readable<boolean> {
    if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, writable(false, () => {
            socketUser.emit("join", userId);
            return () => {
                socketUser.emit("leave", userId);
                connectedUsers.delete(userId);
            };
        }));
    }
    return {
        subscribe: connectedUsers.get(userId)!.subscribe,
    };
}

export {
    getSocket,
    getUserStatus,
    LiveList,
    liveListProvider,
};
