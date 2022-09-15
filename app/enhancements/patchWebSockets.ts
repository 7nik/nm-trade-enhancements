import type Services from "../utils/NMServices";

import { getSocket, LiveList, liveListProvider } from "../utils/NMLiveApi";
import addPatches from "../utils/patchAngular";
import { debug } from "../utils/utils";

/**
 * Mostly it is done for a more nice code and avoiding collision between sockets
 */

addPatches((angular) => {
    angular.module("Art").factory("artWebSocket", [
        "$rootScope",
    function(
        $rootScope: angular.IScope,
    ){
        /**
         * Wraps a function to execute it in the angular context
         * @param callback - the function to wrap
         * @param this_ - the function's context
         * @returns the wrapped function
         */
        function wrapApply<P extends any[]>(callback: (...args:P)=>void, this_?: object): (...args:P)=>void {
            return function(...args:P) {
                $rootScope.$apply(() => callback.call(this_ || window, ...args));
            };
        }
    
        type SortedListOptions = Parameters<Services.ArtWebSocket["connectSortedList"]>[1];
        type ISortedList = ReturnType<Services.ArtWebSocket["connectSortedList"]>;

        class SortedList implements ISortedList {
            #liveList: LiveList<any>;
            #unsubscribe: () => void;
            loading: boolean;
            list: object[] = [];

            constructor (namespace: string, options: SortedListOptions) {
                namespace = namespace.replace("/","");
                this.#liveList = liveListProvider(namespace as any, options.id);
                this.#liveList.on("init", (items, total) => {
                    if (options.onLoadInitial) {
                        wrapApply(options.onLoadInitial, this)({ results: items, count: total });
                    }
                    // the milestones do not receive update, so do this to
                    // get the actual completed milestone at the next time
                    if (namespace === "completed") {
                        this.#liveList.stopListening();
                    }
                });
                if (options.onLoad) this.#liveList.on("load", wrapApply(options.onLoad, this));
                if (options.onAddItem) this.#liveList.on("add", wrapApply(options.onAddItem, this));
                if (options.onRemoveItem) this.#liveList.on("remove", wrapApply(options.onRemoveItem, this));
                this.#unsubscribe = this.#liveList.store.subscribe((items) => {
                    this.loading = false;
                    // if we replace the array, angular will lose its changes
                    this.list.splice(0, this.list.length, ...items);
                });
                this.loading = true;
            }

            get socket () {
                return this.#liveList.socket;
            }
            get totalCount () {
                return this.#liveList.total;
            }

            addItem(item: object): void {
                this.#liveList.sendAddItem(item);
            }
            fetchMore(): void {
                this.#liveList.loadMore();
            }
            leave(): void {
                this.#liveList.stopListening();
                this.#unsubscribe();
            }
            removeItem(item: {id:any}): void {
                this.#liveList.sendRemoveItem(item);
            }
        }
    
        const artWebSocket: Services.ArtWebSocket = {
            connect(namespace) {
                return getSocket(namespace as any);
            },
            connectSortedList(namespace, options) {
                return new SortedList(namespace, options);
            },
        };
    
        debug("artWebSocket replaced");

        return artWebSocket;
    }]);
});
