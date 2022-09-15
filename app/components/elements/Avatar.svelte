<!-- @component 
    Displays a user avatar of the given size 
 -->
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    
    import config from "../../services/config";

    export let user: NM.User;
    /**
     * The size of avatar to display
     */
    export let size: "small" | "large" = "small";

    let className = "";
    /**
     * Extra CSS classes
     */
    export {className as class};

    const dim = size === "small" ? 40 : 100;
</script>

<svelte:options immutable/>

<span class="avatar {size} {className}">
    <img src={user.avatar[size] || config.defaultAvatarUrl}
        alt={user.username}
        style="width: {dim}px; height: {dim}px;"
    >
</span>
