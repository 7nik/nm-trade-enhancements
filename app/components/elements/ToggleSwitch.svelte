<!-- @component
    A switching toggler
 -->
<script lang="ts">
    /**
     * The switch's value
     */
    export let checked: boolean;
</script>

<label>
    <input type="checkbox" bind:checked >
    <span></span>
    <slot/>
</label>

<style>
    label {
        display: flex;
        align-items: center;
        gap: 1ch;
        font: 300 15px locator-web,Helvetica Neue,Helvetica,Arial,sans-serif;
        padding-top: 7px;
    }
    input {
        display: none;
    }
    span {
        flex-shrink: 0;
        display: inline-block;
        padding: 3px;
        width: 58px;
        height: 24px;
        position: relative;
        top: -7px;
        font-size: 10px;
        user-select: none;
        border-radius: 4px;
        color: #5f5668;
        background-color: #d6d6d6;
        box-sizing: content-box;
    }
    input:checked + span {
        color: white;
        background-color: #c08eef;
    }
    span::before, span::after {
        content: "";
        box-sizing: border-box;
        position: absolute;
        transition: all .1s ease-in-out;
    }
    span::before {
        top: 0;
        width: 40px;
        height: 100%;
        left: 24px;
        content: "NO";
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
    }
    input:checked + span::before {
        content: "YES";
        left: 0;
    }
    span::after {
        display: block;
        background-color: white;
        width: 24px;
        height: 24px;
        top: 3px;
        left: 3px;
        border-radius: 2px;
    }
    input:checked + span::after {
        left: 36px;
    }
</style>
