<script context="module" lang="ts">
    import currentUser from "../../services/currentUser";
    import OwnedCards from "../../services/ownedCards";
    import { loadValue } from "../../utils/storage";

    type SIZES = "small" | "medium" | "large" | "large-promo" | "xlarge" | "original";
    type VIDEO_SIZES = "medium" | "large" | "original";

    /**
     * Get the info about the asset of the requested size
     */
    function getPrintData (print: NM.Print | NM.PrintInTrade, size: SIZES) {
        let data: NM.Image & Partial<NM.Video> & { type: "image" | "video" } = {
            type: "image",
            ...print.piece_assets.image[size],
        };
        if (print.piece_assets.video && size in print.piece_assets.video) {
            data = {
                type: "video",
                url: data.url, // preview
                ...print.piece_assets.video[size as VIDEO_SIZES],
            };
        }
        return data;
    }

    /**
     * Fit the size in the given limits but without up-scaling
     * @param data
     * @param maxWidth
     * @param maxHeight
     */
    function getDimensionSize (
        data: { width: number, height: number },
        maxWidth = 0,
        maxHeight = 0,
    ) {
        const ratio = data.width / data.height;
        let height;
        let width;

        if (maxWidth && maxHeight) {
            if (ratio < maxWidth / maxHeight) {
                height = maxHeight;
                width = Math.ceil(maxHeight * ratio);
            } else {
                width = maxWidth;
                height = Math.ceil(maxWidth / ratio);
            }
        } else if (maxHeight) {
            height = maxHeight;
            width = Math.ceil(maxHeight * ratio);
        } else if (maxWidth) {
            width = maxWidth;
            height = Math.ceil(maxWidth / ratio);
        } else {
            width = data.width;
            height = data.height;
        }
        // do not upscale
        width = Math.min(width, data.width);
        height = Math.min(height, data.height);

        return {
            width: `${width}px`,
            height: `${height}px`,
            ratio: width / height,
        };
    }

    /**
     * Stops the video when it isn't visible in an <ul> or document
     * @param video - the element to control
     */
    function stopHiddenVideo (video: HTMLVideoElement) {
        let isPaused = false;
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.intersectionRatio < 0.1 && !video.paused) {
                    video.pause();
                    isPaused = true;
                } else if (isPaused) {
                    video.play();
                    isPaused = false;
                }
            }
        }, {
            root: video.closest("ul"),
            threshold: 0.1,
        });
        observer.observe(video);
    }

    const ownedCards = new OwnedCards(currentUser.id);

    const muteVideo = loadValue("muteVideo", true);
</script>
<!-- @component
    Renders a print image or video with RE/LE icon
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import config from "../../services/config";
    import tip from "../actions/tip";
    import Icon from "../elements/Icon.svelte";

    /**
     * A print whose image/video will be displayed
     */
    export let print: NM.Print | NM.PrintInTrade;
    /**
     * The size type of the image/video
     */
    export let size: SIZES = "large";
    /**
     * Max width of the asset
     */
    export let maxWidth = 0;
    /**
     * Max height of the asset
     */
    export let maxHeight = 0;
    /**
     * Whether RE/LE icon can be displayed
     */
    export let hideIcons = true;
    /**
     * Whether to show the colored image
     */
    export let isPublic = false;
    /**
     * Whether to set the size of the asset
    */
    export let setSize = true;
    // export let showLoading = false;

    const ownsPrint = ownedCards.hasPrint(print.id, true);
    $: grayOut = !isPublic && !$ownsPrint;

    // show max quality of the video if user owns the print
    // if the original is gif, it, of course, isn't played as video, but
    // image["original"] is still a gif (seems just a copy of the original)
    // so the original gets played as a video poster
    if (print.asset_type === "video" && size === "xlarge") {
        size = !isPublic && $ownsPrint ? "original" : "large";
    }
    // sound can be only in the original video
    const muted = muteVideo || size !== "original";

    const data = getPrintData(print, size);
    // eslint-disable-next-line prefer-const
    let { width, height, ratio } = getDimensionSize(data, maxWidth, maxHeight);
    if (!setSize) {
        width = "";
        height = "";
    }
    // Firefox is unable to play gif as video
    if (data.sources?.filter((s) => s.mime_type !== "image/gif").length === 0)  {
        data.type = "image";
    }
    // add fallback sources for cases when browser cannot play the original
    if (data.type === "video" && size === "original") {
        data.sources?.push(...getPrintData(print, "large").sources!);
    }
    const showReplica = !hideIcons && "is_replica" in print && print.is_replica;
    const showLimited = !hideIcons && "version" in print && print.version === /* lim sett */ 3;

    /**
     * Allows to see the colored (and animated) asset during pressing on it
     */
    function makePeekable (elem: HTMLElement) {
        // if no need to peek
        if (!grayOut) return {};
        elem.addEventListener("mousedown", () => {
            grayOut = false;
        });
        elem.addEventListener("mouseup", () => {
            grayOut = true;
        });
        const cardType = print.piece_assets.video ? "animated" : "colored";
        return tip(elem, `Press and hold to see the ${cardType} version`);
    }
</script>

<svelte:options immutable/>

<div style:width style:height style:aspect-ratio={ratio} use:makePeekable >
    {#if data.type === "video" && data.sources && !grayOut}
        <video
            poster={data.url} {width} {height} autoplay loop {muted} playsinline
            on:click={(ev) => ev.currentTarget.play()}
            on:contextmenu|preventDefault
            use:stopHiddenVideo
        >
            {#each data.sources as source}
                <source src={source.url} type={source.mime_type}>
            {/each}
        </video>
    {:else}
        <img class:grayOut
            style:width style:height
            alt={print.name}
            src={data.url ?? config.defaultImageUrl}
        >
    {/if}
    {#if showReplica}
        <span><Icon icon="RE" size="26px" hint="Replica"/></span>
    {/if}
    {#if showLimited }
        <span><Icon icon="LE" size="26px" hint="Limited Edition"/></span>
    {/if}
    <!-- {#if showLoading}
        <i class="load-indicator on-white-bg"></i>
    {/if} -->
</div>

<style>
    div {
        position: relative;
    }
    img, video {
        width: 100%;
        height: 100%;
        display: block;
    }
    .grayOut:not(:active) {
        filter: grayscale(1);
    }
    span {
        position: absolute;
        top: 3%;
        right: 3%;
    }
</style>
