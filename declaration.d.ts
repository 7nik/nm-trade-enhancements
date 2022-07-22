declare module "*.css" {
    const content: [number|null, string, string][] & { toString():string };
    export default content;
}
