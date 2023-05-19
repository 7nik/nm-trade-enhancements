import type Services from "./NMServices";
import type Angular from "angular";

import { debug, error } from "./utils";

type TemplatePatch = {
    names: string[],
    pages?: string[],
    patches: {
        target: string | RegExp,
        append?: string,
        replace?: string | ((str: string, ...args: any[]) => string),
        prepend?: string,
    }[],
}

/* global angular */

const patchers: ((angular: Angular.IAngularStatic) => void)[] = [];
const templatePatchList: TemplatePatch[] = [];

/**
 * Patch the given object with templates;
 * @param  {$cacheFactory.Cache} $templateCache - map of templates
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
function patchTemplates ($templateCache: angular.ITemplateCacheService) {
    for (const { names, patches, pages } of templatePatchList) {
        for (const name of names) {
            // if set to apply the patch only on certain pages
            if (pages && pages.every((page) => !window.location.pathname.startsWith(page))) {
                continue;
            }
            let template = $templateCache.get<string>(name)!;
            let fromCache = true;
            if (!template) {
                template = document.getElementById(name)!.textContent!;
                fromCache = false;
            }
            if (!template) {
                error(`Couldn't get template ${name}`);
                continue;
            }
            // eslint-disable-next-line object-curly-newline
            for (const { target, prepend, replace, append } of patches) {
                let newTemplate = "";
                if (typeof replace === "string") {
                    newTemplate = template.replaceAll(target, replace);
                } else if (replace) { // is function
                    newTemplate = template.replaceAll(target, replace);
                } else if (prepend) {
                    newTemplate = template.replaceAll(target, prepend.concat(target.toString()));
                } else if (append) {
                    newTemplate = template.replaceAll(target, target.toString().concat(append));
                }
                if (newTemplate === template) {
                    error("Useless template patch found!", {
                        name, target, prepend, replace, append,
                    });
                }
                template = newTemplate;
            }
            if (fromCache) {
                $templateCache.put(name, template);
            } else {
                document.getElementById(name)!.textContent = template;
            }
        }
    }
    debug("templates patched");
}

/**
 * Patch artResource to cache list of partners for 15 minutes.
 */
function patchArtResource (artResource: Services.ArtResource) {
    const origFunc = artResource.retrievePaginatedAllowCancel;
    const cache: Record<string, any> = {};
    artResource.retrievePaginatedAllowCancel = (config) => {
        // this function is used only in the partner search list
        // so it safe to use only the url as a key
        const url = config.url!;
        if (!(url in cache)) {
            cache[url] = origFunc(config);
            const timer = setTimeout(() => { delete cache[url]; }, 15 * 60 * 1000);
            // do not cache bad responses
            cache[url].catch(() => {
                delete cache[url];
                clearTimeout(timer);
            });
        }
        return cache[url];
    };
    debug("artResource patched");
}

/**
 * Apply the patches
 */
function applyPatches () {
    let applied = false;
    const patcher = [
        "$templateCache",
        "artResource",
        (
            $templateCache: angular.ITemplateCacheService,
            artResource: Services.ArtResource,
        ) => {
            patchTemplates($templateCache);
            patchArtResource(artResource);
            applied = true;
        },
    ];

    for (const patch of patchers) patch(window.angular);
    window.angular.module("nmApp").run(patcher);

    // sometimes, when userscript is loaded via a proxy script,
    // it gets executed too late, so reload the page once
    window.addEventListener("load", () => {
        if (applied) return;
        if (window.location.hash === "#reloaded") return;
        window.location.hash = "#reloaded";
        window.location.reload();
    });
}

export default function addPatches (
    patcher: ((angular: Angular.IAngularStatic)=>void) | null,
    ...templatePatches: TemplatePatch[]
) {
    if (patcher) patchers.push(patcher);
    templatePatchList.push(...templatePatches);
}

if (!document.querySelector(`body>[ng-controller="publicNavigationController"]`)) {
    // nothing to patch on such pages
} else if (document.readyState === "complete") {
    if (window.location.hash !== "#reloaded") {
        window.location.hash = "#reloaded";
        window.location.reload();
    }
} else {
    document.addEventListener("readystatechange", applyPatches, { once: true });
}
