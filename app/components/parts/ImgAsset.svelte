<!-- @component
    Renders an image with icon in the bottom left corner
 -->
 <script lang="ts">
    import type { IconName } from "../elements/Icon.svelte";

    import Icon from "../elements/Icon.svelte";

    /**
     * The image to display
     */
    export let image: string;
    /**
     * The icon on the image
     */
    export let icon: IconName;
    /**
     * The image description
     */
    export let alt: string;
</script>

<figure>
    <img src="{image}" alt="{alt}">
    <span>
        <Icon icon={icon} size="16px" />
    </span>
    </figure>

<style>
    figure {
        position: relative;
        border-radius: 4px;
        overflow: hidden;
        margin: 0;
    }
    img {
        width: 100%;
        height: 100%;
        vertical-align: bottom;
        mask-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"%3e%3cpath fill="white" d="M0 474c0 2 2 4 4 4h13c3 0 5 2 5 5v13c0 2 2 4 4 4h474V0H0z"/%3e%3c/svg%3e');
        -webkit-mask-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"%3e%3cpath fill="white" d="M0 474c0 2 2 4 4 4h13c3 0 5 2 5 5v13c0 2 2 4 4 4h474V0H0z"/%3e%3c/svg%3e');
        mask-size: 500px 500px;
        -webkit-mask-size: 500px 500px;
        mask-position: bottom left;
        -webkit-mask-position: bottom left;
    }
    figure span {
        position: absolute;
        bottom: 1px;
        left: 3px;
    }
</style>
