<script lang="ts">
    import type NM from "../../utils/NMTypes";

    import { friendList } from "../../services/user";
    import NMApi from "../../utils/NMApi";
    import Icon from "../elements/Icon.svelte";
    import Friend from "./Friend.svelte";
    import Header from "./Header.svelte";
    import List from "./List.svelte";

    const MAX_SEARCH_RESULTS = 10;

    const allFriends = friendList.list;
    let searchTerm = "";
    let friends: NM.UserFriend[];
    $: {
        const regexp = new RegExp(searchTerm.replace("*", ".*"), "i");
        // eslint-disable-next-line prefer-const
        friends = $allFriends
            .filter((user) => regexp.test(user.name) || regexp.test(user.username))
            .sort((a, b) => b.first_name.localeCompare(a.first_name));
    }
    let people: NM.UserFriend[] = [];

    $: isSearching = searchTerm.length > 0;
    let searchLoading = false;
    let searchTitle = "";
    $: {
        searchTitle = people.length === 0
            ? "No Search Result"
            : `Top ${
                Math.min(MAX_SEARCH_RESULTS, people.length)
            } Search Result${people.length > 1 ? "s" : ""}`;
    }

    $: if (isSearching) searchPeople(searchTerm);
    let searchPeopleTimer: NodeJS.Timeout;
    function searchPeople (query: string) {
        clearTimeout(searchPeopleTimer);
        if (query.trim().length < 3) {
            people = [];
            searchLoading = false;
            return;
        }
        searchPeopleTimer = setTimeout(async () => {
            searchLoading = true;
            try {
                const data = await NMApi.user.searchPeople(query.trim());
                if (searchTerm !== query) return;
                people = data;
            } catch (reason) {
                alert(String(reason));
            }
            searchLoading = false;
        }, 500);
    }
</script>

<div>
    <input id="friend-search"
        placeholder="Search for friends" autocomplete="off"
        bind:value={searchTerm}
    >
    <label for="friend-search" on:click={() => { searchTerm = ""; }} >
        <Icon icon={isSearching ? "close" : "search"} size="15px" />
    </label>
</div>

<List icon="owners"
    emptyTitle="Your friends list is empty"
    emptyMessage="Just click the add a friend button on a person's profile"
    show={friends.length === 0 && !isSearching ? "empty" : "content"}
>
    <Header>
        Your Friends
        <span>
            {#if isSearching}
                {friends.length === 1 ? "1 match" : `${friends.length} matches`}
            {:else if friends.length > 0}
                {friends.length === 1 ? "1 friend" : `${friends.length} friends`}
            {/if}
        </span>
    </Header>
    {#if friends.length}
        <section>
            {#each friends as friend (friend.id)}
                <Friend {friend} showStatus={!isSearching} />
            {/each}
        </section>
    {/if}

    {#if isSearching && searchTerm.length > 2}
        <Header>
            {searchTitle}
            {#if searchLoading}
                <Icon icon="loader" />
            {:else}
                {people.length === 1 ? "1 match" : `${people.length} matches`}
            {/if}
        </Header>
        {#each people.slice(0, MAX_SEARCH_RESULTS) as friend (friend.id)}
            <Friend {friend} showStatus={true} />
        {/each}
    {/if}
</List>

<style>
    div {
        padding: 10px;
        position: relative;
        border-bottom: 1px solid #efefef;
    }
    input {
        width: 100%;
        border: none;
        background-color: #efefef;
        color: #2c2830;
        font-size: 14px;
        font-family: inherit;
        height: 34px;
        padding: 1em 1.5em;
        border-radius: 3px;
        box-sizing: border-box;
        outline: none;
    }
    input:focus {
        background-color: #e2e2e2;
    }
    input::placeholder {
        color: #A4A1A6
    }
    label {
        position: absolute;
        right: 20px;
        top: 19px;
        cursor: pointer;
        display: flex;
        opacity: .5;
    }

    section {
        display: flex;
        flex-direction: column;
    }
    /* put online friend to the top of the list */
    section > :global(.online) {
        order: -1;
    }
</style>
