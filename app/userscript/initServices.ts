/**
 * Doing the various data initializing in a separate module because 
 * stupid webpack moves all imports to the module's top and
 * this leads to the deadlock 
 */

import { initValue } from "../services/init";
import { error } from "../utils/utils";

/**
 * Waits for a specific child node appearance
 * @param container - the parent node
 * @param check - function that check if it is that node
 */
 export function waitForChild(container: Node, check: (node: Node) => boolean) {
    return new Promise<Node>((resolve) => {
        const node = [...container.childNodes].find(check);
        if (node) {
            resolve(node);
            return;
        }
        
        new MutationObserver((mutations, observer) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (check(node)) {
                        observer.disconnect();
                        resolve(node);
                        return;
                    }
                });
            });
        }).observe(container, { childList: true });
    });
}

/**
 * Initialize authorizer
 */
import { createDialog } from "../components/dialogs/modals";
import Login from "../components/dialogs/Login.svelte";
let authorizing: Promise<null> | null = null;
function auth() {
    if (authorizing) return authorizing;
    const promise = createDialog(Login, {});
    authorizing = promise;
    promise.finally(() => { authorizing = null; });
    return promise;
}
initValue("auth", auth);

/**
 * Initialize sockets
 */
import type { io as IO } from "socket.io-client";
declare global {
    // NM uses socket-io@1.3.5 but the minimal typed one is v3
    var io: typeof IO;
}

if (typeof io === "undefined") {
    Object.defineProperty(unsafeWindow, "io", {
        configurable: true,
        set (io) {
            initValue("io", io);
            Object.defineProperty(unsafeWindow, "io", {
                value: io,
                configurable: true,
                enumerable: true,
                writable: true,
            });
        },
    });
} else {
    initValue("io", io);
}

// the followings inits depends on data in <body>

await waitForChild(document.documentElement, (node) => {
    // for some reason multiple <body> appears here 
    return node === document.body;
});

/**
 * Initialize configs
 */
async function initConfigs() {
    const script = await waitForChild(document.body, (node) => {
        return node instanceof HTMLScriptElement && !!node.textContent?.includes("artModule.value");
    });

    const config = {
        ...[...script.textContent!.matchAll(/artModule.value\("\w+",\s*(\{[^;]*\})\);/g)]
            // .map(([_, json]) => eval(json))
            .map(([_, json]) => JSON.parse(json
                // remove comments
                .replaceAll(/\n\s+\/\/.*\n/g,"")
                // wrap all identifiers into double quotes
                .replaceAll(/'?([\w_-]+)'?(:[\s\w({["'])/g,(_,$0,$1) => `"${$0}"${$1}`)
                // replace single-quoted strings wind double-quoted ones
                .replaceAll(/:\s*'(.*)'\s*([,}])/g,(_,$0,$1) => `:"${$0}"${$1}`)
                // remove trailing commas
                .replaceAll(/,\s*}/g,"}")
            // merge objects
            )).reduce((a,b) => ({...a,...b})),
    }
    initValue("config", config);
}
initConfigs();

/**
 * Initialize the current user
 */
async function initCurrentUser() {
    let found = false;
    // fallback
    document.addEventListener("DOMContentLoaded", () => {
        if (found) return;
        error("couldn't load the user info");
        auth().then(() => { location.reload(); });
    });

    const script = await waitForChild(document.body, (node) => {
        return node instanceof HTMLInputElement && node.id === "user-json";
    }) as HTMLInputElement;
    found = true;
    initValue("user", JSON.parse(script.value));
}
initCurrentUser();
