import type Services from "../utils/NMServices";
import { error } from "../utils/utils";

type Configs = Services.ArtConfig & Services.ArtConstants & {ready:Promise<void>};

let data: Configs | null = null;
let ready: Promise<void> = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => {
        const script = [...document.getElementsByTagName("script")]
            .find((elem) => elem.textContent?.includes("artModule.value"));
        if (script) {
            data = {
                ready,
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
        } else {
            error("Couldn't find artConfig");
        }
        resolve();
    });
});

export default new Proxy({}, {
    get(_, prop) {
        if (prop === "ready") return ready;
        if (!data) {
            error("Config isn't ready yet");
            return;
        }
        if (prop in data) return data[prop as keyof typeof data];
        error(`Config doesn't have the ${String(prop)} property`);
    }
}) as Configs;
