type CssLoaderResult = {
    /**
     * Returns CSS as a string
     */
    toString(): string,
    // CSS rules
} & [number|null, string, string][]

declare module "*.css" {
    const css: CssLoaderResult;
    export default css;
}

declare module "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.9.6/lottie_light.min.js" {
    import type { LottiePlayer } from "lottie-web";
    const lottie: LottiePlayer;
    export default lottie;
}
