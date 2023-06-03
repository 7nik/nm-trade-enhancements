/* eslint-disable import/order */
/* eslint-disable import/first */

/**
 * Doing the various data initializing in a separate module because
 * stupid webpack moves all imports to the module's top and
 * this leads to the deadlock
 */

import { initValue } from "../services/init";
import { debug, error } from "../utils/utils";

/**
 * Waits for a specific child node appearance
 * @param container - the parent node
 * @param check - function that check if it is that node
 */
function waitForChild (container: Element, check: (elem: Node) => boolean) {
    return new Promise<Element>((resolve) => {
        const elem = [...container.children].find(check);
        if (elem) {
            resolve(elem);
            return;
        }

        new MutationObserver((mutations, observer) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (check(node)) {
                        observer.disconnect();
                        resolve(node as Element);
                        return;
                    }
                }
            }
        }).observe(container, { childList: true });
    });
}

/**
 * Initialize authorizer
 */
import { createDialog } from "../components/dialogs/modals";
import Login from "../components/dialogs/Login.svelte";

let authorizing: Promise<null> | null = null;
function auth () {
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
    // const w = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    Object.defineProperty(window, "io", {
        configurable: true,
        set (io) {
            initValue("io", io);
            Object.defineProperty(window, "io", {
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

// for some reason multiple <body> appears here
await waitForChild(document.documentElement, (node) => node === document.body);

/**
 * Initialize configs
 */
async function initConfigs () {
    let script: Element;
    do {
        // eslint-disable-next-line no-await-in-loop
        script = await waitForChild(document.body, (node) => {
            if (!(node instanceof HTMLScriptElement)) return false;
            if (node.textContent?.includes("artModule.value")) return true;
            // for some reason, sometimes the script can appear empty
            return node.type === "text/javascript" && !node.src && !node.textContent;
        });
        // so add delay to get its content or try again to retrieve it
        // eslint-disable-next-line no-await-in-loop
        if (!script.textContent) await new Promise((res) => { setTimeout(res); });
        if (!script.textContent) script.remove();
    } while (!script.textContent?.includes("artModule.value"));

    debug("config found");
    try {
        const config = Object.assign(
            {},
            // extract and parse all the configs
            ...[...script.textContent!.matchAll(/artModule.value\("\w+",\s*({[^;]*})\);/g)]
                // .map(([_, json]) => eval(json))
                .map(([, json]) => json
                    // remove comments
                    .replaceAll(/\n\s+\/\/.*\n/g, "")
                    // wrap all identifiers into double quotes
                    .replaceAll(/\n\s+'?([\w-]+)'?(:[\s\w"'([{])/g, (_, $0, $1) => `\n"${$0}"${$1}`)
                    // replace single-quoted strings wind double-quoted ones
                    .replaceAll(/:\s*'(.*)'\s*([,}])/g, (_, $0, $1) => `:"${$0}"${$1}`)
                    // remove trailing commas
                    .replaceAll(/,\s*}/g, "}"))
                .map((json) => JSON.parse(json)),
        );
        initValue("config", config);
    } catch (ex) {
        error("Failed to parse config", ex);
        // fallback init with a bare minimum
        // anyway this shouldn't change ever and most isn't used in US
        initValue("config", {
            defaultAvatarUrl: "https://d1kpgjj5yyvdcv.cloudfront.net/assets/img/default_avatar.png",
            defaultImageUrl: "https://d1kpgjj5yyvdcv.cloudfront.net/assets/img/diamond_avatar.png",
            MESSAGES_KEY: "messages",
            MILESTONE_COMPLETED_KEY: "completed",
            MILESTONE_RECENT_KEY: "recent",
            MILESTONE_SUGGESTION_KEY: "suggestion",
            "node-api-endpoint": window.location.host === "www.neonmob.com"
                ? "https://napi.neonmob.com"
                : "https://napi-staging.neonmob.com",
            "po-animation-assets": "https://d1kpgjj5yyvdcv.cloudfront.net/assets/animations",
            "profile-milestones": "/", // should be like "/7nik/milestones/"
            "social_network.conversation": 189,
            TRADES_KEY: "trades",
        } as any);
    }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
initConfigs();

/**
 * Initialize the current user
 */
async function initCurrentUser () {
    let found = false;
    // fallback
    document.addEventListener("DOMContentLoaded", () => {
        if (found) return;
        if (!document.querySelector(`body>[ng-controller="publicNavigationController"]`)
            || document.querySelector(".error-page")
        ) {
            debug("this page has not user info");
            return;
        }
        error("couldn't load the user info");
        auth().then(() => { window.location.reload(); });
    });

    const script = await waitForChild(
        document.body,
        (node) => node instanceof HTMLInputElement && node.id === "user-json",
    ) as HTMLInputElement;
    found = true;
    initValue("user", JSON.parse(script.value));
}

// eslint-disable-next-line unicorn/prefer-top-level-await
initCurrentUser();
