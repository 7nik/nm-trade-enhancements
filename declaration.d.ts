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
