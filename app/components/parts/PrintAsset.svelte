<script context="module" lang="ts">
    import { writable } from "svelte/store";
    import { loadValue } from "../../utils/storage";
    import ownedCards from "../../services/ownedCards";
    import currentUser from "../../services/currentUser";

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
        if (print.piece_assets.video) {
            if (size in print.piece_assets.video) {
                data = { 
                    type: "video", 
                    url: data.url, // preview
                    ...print.piece_assets.video[size as VIDEO_SIZES],
                };
            }
        }
        return data;
    }

    /**
     * Fit the size in the given limits but without up-scaling
     * @param data
     * @param maxWidth
     * @param maxHeight
     */
    function getDimensionSize (data: { width: number, height: number }, maxWidth = 0, maxHeight = 0) {
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
            width: width+"px",
            height: height+"px",
            ratio: width/height,
        };
    }

    /**
     * Stops the video when it isn't visible in an <ul> or document
     * @param video - the element to control
     */
    function stopHiddenVideo (video: HTMLVideoElement) {
        let isPaused = false;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio < 0.1 && !video.paused) {
                    video.pause();
                    isPaused = true;
                } else if (isPaused) {
                    video.play();
                    isPaused = false
                }
            });
        }, {
            root: video.closest("ul"),
            threshold: 0.1,
        });
        observer.observe(video);
    }

    /**
     * A store of a function that check whether the current user owns any copy of the card
     */
    let hasPrint = writable((cardId: number) => cardId === -1);
    currentUser.ready.then(async () => {
        const { userCards } = await ownedCards(currentUser.id);
        hasPrint.set(userCards.hasPrint.bind(userCards));
    });

    const muted = loadValue("muteVideo", true);
</script>
<!-- @component
    Renders a print image or video with RE/LE icon
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    
    import tippy from "tippy.js";
    import config from "../../services/config";

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

    let ownsPrint = $hasPrint(print.id);
    let grayOut = !isPublic && !ownsPrint;
    $: grayOut = !isPublic && !(ownsPrint = $hasPrint(print.id));

    // show max quality of the video if user owns the print
    // if the original is gif, it, of course, isn't played as video, but
    // image["original"] is still a gif (seems just a copy of the original)
    // so the original gets played as a video poster
    if (print.asset_type === "video" && size === "xlarge") {
        if (!isPublic && ownsPrint) {
            size = "original";
        } else {
            size = "large";
        }
    }

    const data = getPrintData(print, size);
    const { width, height, ratio } = setSize
        ? getDimensionSize(data, maxWidth, maxHeight)
        : { width:"", height:"", ratio:0 };
    const showReplica = !hideIcons && "is_replica" in print && print.is_replica;
    const showLimited = !hideIcons && "version" in print && print.version === 3 /* lim sett */;

    /**
     * Allows to see the colored (and animated) asset during pressing on it
     */
    function makePeekable (elem: HTMLElement) {
        // if no need to peek
        if (!grayOut) return;
        const cardType = print.piece_assets.video ? "animated" : "colored";
        tippy(elem, {
            content: `Press and hold to see the ${cardType} version`,
            theme: "tooltip",
        });
        elem.addEventListener("mousedown", () => {
            grayOut = false;
        });
        elem.addEventListener("mouseup", () => {
            grayOut = true;
        });
        return {
            destroy() {
                elem._tippy?.destroy();
            }
        };
    }
</script>

<svelte:options immutable/>

<div class="img" style:width style:height style:aspect-ratio={ratio}>
    <div class="piece-{data.type} {size}" use:makePeekable>
        {#if data.type === "video" && data.sources && !grayOut}
            <video class="asset" use:stopHiddenVideo
                poster={data.url} {width} {height} autoplay loop {muted} 
                on:click={(ev) => ev.currentTarget.play()}
                on:contextmenu|preventDefault
            >
                {#each data.sources as source}
                    <source src={source.url} type={source.mime_type}>
                {/each}
            </video>
        {:else}
            <img class="asset" class:grayOut 
                style:width style:height
                src={data.url ?? config.defaultImageUrl} alt={print.name}
            >
        {/if}
    </div>
    {#if showReplica}
        <span class="RE-icon tip" title="Replica"></span>
    {/if}
    {#if showLimited }
        <span class="LE-icon tip" title="Limited Edition"></span>
    {/if}
    <!-- {#if showLoading}
        <i class="load-indicator on-white-bg"></i>
    {/if} -->
</div>

<style>
    .grayOut:not(:active) {
        filter: grayscale(1);
    }
</style>