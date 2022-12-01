import { loadValue, saveValue } from "./storage";

/**
 * A collection of items with the property id that is automatically saved to localStorage
 */
export default class Collection<T extends {id:any}> {
    #name: string;
    #items: T[];

    /**
     * Constructor.
     * @param name - Name loading and saving the collection
     * @param [itemsOrSize] - The items to store or
     *  it max number of items loaded from `localStorage`
     */
    constructor (name: string, itemsOrSize?: T[] | number) {
        this.#name = name;
        if (Array.isArray(itemsOrSize)) {
            this.#items = itemsOrSize;
            this.save();
        } else {
            this.#items = loadValue(name, []);
            if (typeof itemsOrSize === "number") {
                // sort in descending order of id
                this.#items.sort((a, b) => (a.id > b.id ? -1 : (a.id < b.id ? 1 : 0)));
                this.#items = this.#items.slice(0, itemsOrSize);
            }
        }
    }

    /**
     * Save the collection to `localStorage` if name provided.
     */
    save () { if (this.#name) saveValue(this.#name, this.#items); }

    /**
     * Looks for an item with the given ID
     * @param id - Item's ID
     * @returns the item or `null`
     */
    find (id: any) {
        return this.#items.find((item) => item.id === id) || null;
    }

    /**
     * Adds items to the collection with overwriting existing one and saves the collection.
     * @param {object|object[]|Collection} items - Item(s) to add.
     */
    add (value: T | T[]) {
        // if (items.items) items = items.items;
        const items = Array.isArray(value) ? value : [value];
        this.#items = this.#items.filter((item) => !items.some(({ id }) => id === item.id));
        this.#items.unshift(...items);
        this.save();
    }

    /**
     * Removes given items from the collection or, if provided function, filters them and saves.
     * @param  {object|object[]|Collection|function} items - Items to remove or, if it's function,
     *                                                  uses it find items for removing.
     */
    remove (value: T | T[] | ((v:T) => boolean)) {
        if (typeof value === "function") {
            this.#items = this.#items.filter((item) => !value(item));
        } else {
            // if (items.trades) items = items.trades;
            const items = Array.isArray(value) ? value : [value];
            for (const item of items) {
                const index = this.#items.findIndex(({ id }) => id === item.id);
                if (index >= 0) this.#items.splice(index, 1);
            }
        }
        this.save();
    }

    /**
     * Applies given function to every item.
     * @param {function} fn - Function to apply to a item.
     */
    forEach (fn: (value: T, index: number, array: T[]) => void) {
        // eslint-disable-next-line unicorn/no-array-for-each
        this.#items.forEach(fn);
    }

    /**
     * Applies given function to every item and returns arrays of results.
     * @param {function} fn - Function to apply to a item.
     * @return {any[]} Array of results.
     */
    map<R> (fn: (value: T, index: number, array: T[]) => R): R[] {
        // eslint-disable-next-line unicorn/no-fn-reference-in-iterator
        return this.#items.map(fn);
    }

    /**
     * Get number of items in the collection.
     * @return {number} - Number of items in the collection.
     */
    get count (): number { return this.#items.length; }

    /**
     * Make the collection iterable
     */
    * [Symbol.iterator] () {
        yield* this.#items;
    }
}
