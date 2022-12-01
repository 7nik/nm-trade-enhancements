<!-- @component
    A labeled text/password input
 -->
<script lang="ts">
    /**
     * The input's value
     */
    export let value: string;
    /**
     * Type of the input, default - text
     */
    export let type: "text" | "password" = "text";
    /**
     * The name field
     */
    export let name = "";
    /**
     * The autocomplete field
     */
    export let autocomplete = "";
    /**
     * Mark the label as error
     */
    export let error = false;

</script>

<label>
    {#if type === "password"}
        <input type="password" required bind:value {name} {autocomplete}>
    {:else}
        <input required bind:value {name} {autocomplete}>
    {/if}
    <span class:error>
        <slot/>
    </span>
</label>

<style>
    label {
        display: block;
        position: relative;
        background-color: white;
        cursor: pointer;
    }
    label:not(:first-child) {
        border-top: 1px solid #0002;
    }
    input {
        border: none;
        display: inline-block;
        color: black;
        font-size: 16px;
        padding: 31px 22px 8px;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        outline: none;
    }
    span {
        position: absolute;
        left: 0;
        top: 0;
        margin: 20px;
        font-size: 16px;
        color: #AAA;
        transition: .1s all ease-in-out;
        transition-property: margin-top, font-size;
    }
    span.error {
        color: #E72864;
    }
    input:valid + span,
    input:-webkit-autofill + span,
    input:focus + span {
        font-size: 12px;
        margin-top: 12px;
    }
</style>
