<script lang="ts">
    import type NM from "../../../utils/NMTypes";
    
    import Friend from "./Friend.svelte";
    import NMApi from "../../../utils/NMApi";
    import { friendList } from "../../../services/user";

    export let openConversation: (userId: number) => void;

    const MAX_SEARCH_RESULTS = 10;

    let allFriends = friendList.list;
    let searchTerm = "";
    let friends: NM.UserFriend[];
    $: {
        const regexp = new RegExp(searchTerm.replace("*", ".*"), "i");
        friends = $allFriends
            .filter((user) => regexp.test(user.name) || regexp.test(user.username))
            .sort((a,b) => b.first_name.localeCompare(a.first_name));
    }
    let people: NM.UserFriend[] = [];
    
    $: isSearching = searchTerm.length > 0;
    let searchLoading = false;
    let searchTitle = "";
    $: {
        searchTitle = people.length === 0
            ? "No Search Result"
            : `Top ${Math.min(MAX_SEARCH_RESULTS, people.length)} Search Result${people.length > 1 ? "s" : ""}`;
    }

    $: if (isSearching) searchPeople(searchTerm); 
    let searchPeopleTimer: NodeJS.Timeout;
    function searchPeople(query: string) {
        clearTimeout(searchPeopleTimer);
        setTimeout(async () => {
            searchLoading = true;
            const data = await NMApi.user.searchPeople(query);
            if (searchTerm === query) people = data;
            searchLoading = false;
        }, 500);
    }
</script>

<ul class="friends-list user-status--list">
    <div class="friends-list--search user-status--list--heading">
        <input id="friend-search" class="friends-list--search--input"
            placeholder="Search for friends" autocomplete="off"
            bind:value={searchTerm}
        >
        <label class="friends-list--search--icon" for="friend-search"
            on:click={() => searchTerm = ""}
        >
            <i class={isSearching ? "icon-close" : "icon-search"}></i>
        </label>
    </div>
 
    <li class="user-status--list--heading small-caps">
        Your Friends
        <span class="user-status--list--heading--action">
            {#if isSearching}
                {friends.length === 1 ? "1 match" : `${friends.length} matches`}
            {:else if friends.length > 0}
                {friends.length === 1 ? "1 friend" : `${friends.length} friends`}
            {/if}
        </span>
    </li>

    <div class="my-friends--list">
        {#each friends as friend (friend.id)}
            <Friend {friend} {isSearching} startConversation={openConversation} />   
        {/each}
    </div>
 
    {#if isSearching && searchTerm.length > 2}
        <li class="user-status--list--heading small-caps">
            {searchTitle}
            {#if searchLoading}
                <span class="user-status--list--heading--action">
                    <i class="load-indicator"></i>
                </span>
            {/if}
        </li>
 
        {#each people.slice(0, MAX_SEARCH_RESULTS) as friend (friend.id)}
            <Friend {friend} isSearching={true} startConversation={openConversation} />   
        {/each}
    {/if}
</ul>
 
{#if friends.length === 0 && !isSearching}
    <div class="empty-state">
        <i class="icon-owners dark"></i>
        <h3>Your friends list is empty</h3>
        <p class="text-emphasis text-subdued text-small">Just click the add a friend button on a person's profile.</p>
    </div>
{/if}
 
<style>
    .my-friends--list {
        display: flex;
        flex-direction: column;
    }
    /* put online friend to the top of the list */
    .my-friends--list > :global(.online) {
        order: -1;
    }
</style>
