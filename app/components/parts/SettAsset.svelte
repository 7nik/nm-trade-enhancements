<!-- @component
    Renders a small sett cover image
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import Icon from "../elements/Icon.svelte";

    /**
     * The sett for displaying the cover image
     */
    export let sett: Pick<NM.Sett, "name"|"sett_assets"|"public_url"|"difficulty"> & Partial<Pick<NM.Sett,"links">>;
    /**
     * The cover image size, the display size is set by the container
     */
    export let size: keyof NM.Sett["sett_assets"] = "small";
</script>

<a target="_self" href={sett.links?.permalink ?? sett.public_url}>
    <figure>
        <img src="{sett.sett_assets[size].url}" alt="{sett.name}'s cover">
        <span>
            <Icon icon={sett.difficulty.class_name} size="16px" />
        </span>
    </figure>
</a>

<style>
    a {
      outline: none;
    }
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
