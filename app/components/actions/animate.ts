import type { LottiePlayer } from "lottie-web";
import { error } from "../../utils/utils";

declare global {
    var bodymovin: LottiePlayer | undefined;
}

let lottie: LottiePlayer;
async function getLottie() {
    if (!lottie) {
        if (typeof bodymovin !== "undefined") {
            lottie = bodymovin;
        } else {
            lottie = (await import("https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.9.6/lottie_light.min.js")).default;
        }
    }
    return lottie;
}

function animate (lottie: LottiePlayer, container: HTMLElement, animationData: any, callback?: () => void) {
    const animation = lottie.loadAnimation({
        container,
        renderer: 'svg',
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
export default function (elem: HTMLElement, { src, onCompleted }: Params) {
    try {
        Promise.all([
            fetch(src).then((resp) => resp.json()),
            getLottie(),
        ]).then(([data, lottie]) => {
            animate(lottie, elem, data, onCompleted);
        });
    } catch (ex) {
        error("Failed to load the animation", src, ex);
        onCompleted?.();
    }
}
