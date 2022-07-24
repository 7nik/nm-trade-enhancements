declare module "*.css" {
    const content: [number|null, string, string][] & { toString():string };
    export default content;
}
declare module "*.svelte" {
    const content: any;
    export default content;
}
