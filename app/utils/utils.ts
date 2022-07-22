import type angular from "angular";

import { MutationSummary } from "mutation-summary";

export const debug = (...args: any[]) => console.debug("[NM trade enhancement]", ...args);

/**
 * Converts string to The Camel Case
 * @param  {string} str - String for converting
 * @return {string} String in the camel case
 */
export function toPascalCase (str: string):string {
    return str
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((s) => s[0].toUpperCase().concat(s.slice(1).toLowerCase()))
        .join(" ");
}

/**
 * Returns a scope bound to the element
 * @param  {HTMLElement} element - Element
 * @return {Object} Bound scope
 */
export function getScope<T> (element: HTMLElement): T {
    // @ts-ignore
    return angular.element(element).scope<T & angular.IScope>();
}


/**
 * Will call the callback for existing and added elements which match the selector
 * @param  {HTMLElement} rootNode - In whose subtree wait for the elements
 * @param  {string} selector - Selector of the target elements
 * @param  {function(HTMLElement): undefined} callback - Callback applied to the elements
 */
export function forAllElements (rootNode: HTMLElement|Document, selector: string, callback: (elem: HTMLElement) => void) {
    rootNode.querySelectorAll(selector).forEach((elem) => callback(elem as HTMLElement));
    new MutationSummary({
        rootNode,
        queries: [{ element: selector }],
        callback: (summaries) => summaries[0].added.forEach((elem) => callback(elem as HTMLElement)),
    });
}

/**
 * Returns a promise which will be resolved when the element appears
 * @param  {HTMLElement} rootNode - In whose subtree wait for the element
 * @param  {string} selector - Selector of the target element
 * @return {Promise<HTMLElement>} The added element
 */
export function waitForElement (rootNode: HTMLElement, selector: string): Promise<HTMLElement> {
    const element = rootNode.querySelector(selector) as HTMLElement;
    if (element) return Promise.resolve(element);

    return new Promise((resolve) => {
        const observer = new MutationSummary({
            rootNode,
            queries: [{ element: selector }],
            callback: (summaries) => {
                observer.disconnect();
                resolve(summaries[0].added[0] as HTMLElement);
            },
        });
    });
}

/**
 * Get the named cookie
 * @param name - the cookie name
 * @returns cookie value or nothing
 */
export function getCookie (name: string) {
    const [, valueAndTrash] = `; ${document.cookie}`.split(`; ${name}=`);
    if (valueAndTrash) return valueAndTrash.split(";", 2)[0];
}
