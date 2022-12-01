<!-- @component
    Displays a user avatar of the given size
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import config from "../../services/config";

    export let user: Pick<NM.User, "avatar"|"username">;
    /**
     * Big size of avatar to display, by default - no
     */
    export let big = false;

    let src: string = user.avatar[big ? "large" : "small"] || config.defaultAvatarUrl;
</script>

<svelte:options immutable/>

<img {src} on:error={() => { src = config.defaultAvatarUrl; }}
    alt={user.username} class:big
>

<style>
    img {
        display: block; /* to avoid space below */
        border-radius: 100%;
        width: 40px;
        height: 40px;
    }
    img.big {
        width: 100px;
        height: 100px;
    }
</style>
