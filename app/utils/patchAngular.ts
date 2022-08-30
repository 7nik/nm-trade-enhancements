import type Angular from "angular";
import type Services from "./NMServices";

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

const patchers: ((angular: Angular.IAngularStatic) => void)[] = [];
const templatePatchList: TemplatePatch[] = [];

/**
 * Patch the given object with templates;
 * @param  {$cacheFactory.Cache} $templateCache - map of templates
 */
function patchTemplates ($templateCache: angular.ITemplateCacheService) {
    templatePatchList.forEach(({ names, patches, pages }) => names.forEach((name) => {
        // if set to apply the patch only on certain pages
        if (pages && pages.every((page) => !window.location.pathname.startsWith(page))) {
            return;
        }
        let template = $templateCache.get<string>(name)!;
        let fromCache = true;
        if (!template) {
            template = document.getElementById(name)?.textContent!;
            fromCache = false;
        }
        if (!template) {
            error(`Couldn't get template ${name}`);
            return;
        }
        // eslint-disable-next-line object-curly-newline
        patches.forEach(({ target, prepend, replace, append }) => {
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
                error("Useless template patch found!", { name, target, prepend, replace, append })
            }
            template = newTemplate;
        });
        if (fromCache) {
            $templateCache.put(name, template);
        } else {
            document.getElementById(name)!.textContent = template;
        }
    }));
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
    
    patchers.forEach(patch => patch(angular));
    angular.module("nmApp").run(patcher);

    // sometimes, when userscript is loaded via a proxy script,
    // it gets executed too late, so reload the page once
    window.addEventListener("load", () => {
        if (applied) return;
        if (location.hash === "#reloaded") return;
        location.hash = "#reloaded";
        location.reload();
    });
}

export default function addPatches(patcher: ((angular: Angular.IAngularStatic)=>void) | null, ...templatePatches: TemplatePatch[]) {
    if (patcher) patchers.push(patcher);
    templatePatchList.push(...templatePatches);
}

if (document.readyState === "complete") {
    if (location.hash !== "#reloaded") {
        location.hash = "#reloaded";
        location.reload();
    }
} else {
    document.addEventListener("readystatechange", applyPatches, { once: true });
}
