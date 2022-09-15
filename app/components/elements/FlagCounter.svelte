<!-- @component
    Adds a supper flag with the given number 
 -->
<script lang="ts">
    let className = "";
    /**
     * Extra CSS classes
     */
    export {className as class};
    export let value: number;

    let allure = true;
    $: toggleAllure(value);
    function toggleAllure(v: number) {
        if (!v) return;
        allure = true;
        setTimeout(() => allure = false, 500);
    }
</script>

{#if value > 0}
    <span class="flag {className}" class:allure
        art-allure="getOnlineFriendsCount()">
        {value}
    </span>
{/if}
