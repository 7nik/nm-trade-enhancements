import type { LottiePlayer } from "lottie-web";
import type { Action } from "svelte/action";
import { error } from "../../utils/utils";

/* global bodymovin */
declare global {
    var bodymovin: LottiePlayer | undefined;
}

const LOTTIE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.9.6/lottie_light.min.js";

let player: LottiePlayer;
async function getPlayer () {
    if (!player) {
        player = typeof bodymovin === "undefined"
            // eslint-disable-next-line unicorn/no-await-expression-member
            ? (await import(LOTTIE_SRC)).default
            : bodymovin;
    }
    return player;
}

function animate (
    lottie: LottiePlayer,
    container: HTMLElement,
    animationData: any,
    callback?: () => void,
) {
    const animation = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: 0,
        autoplay: true,
        animationData,
    });
    animation.addEventListener("complete", () => animation.destroy());
    if (callback) {
        animation.addEventListener("destroy", callback);
    }
}

type Params = {
    src: string,
    onCompleted?: () => void,
}

/**
 * Plays once the given Bodymovin animation
 * @param elem - the element for playing the animation
 * @param params.src - link to the Bodymovin animation data
 * @param params.onCompleted - optional callback called after completing the animation
 */
const action: Action<HTMLElement, Params> = (elem, params) => {
    if (!params) {
        error("No params");
        return;
    }
    try {
        Promise.all([
            fetch(params.src).then((resp) => resp.json()),
            getPlayer(),
        ]).then(([data, lottie]) => {
            animate(lottie, elem, data, params.onCompleted);
        });
    } catch (ex) {
        error("Failed to load the animation", params.src, ex);
        params.onCompleted?.();
    }
};

export default action;
