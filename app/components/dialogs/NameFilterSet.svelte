<!-- @component
    A dialog window for saving a filter set
 -->
<script lang="ts">
    import Button from "../elements/Button.svelte";
    import LabeledInput from "../elements/LabeledInput.svelte";
    import Slider from "../elements/ToggleSwitch.svelte";
    import DialogWindow from "./DialogWindow.svelte";

    type Data = { name:string, includeSett:boolean } | null;

    let includeSett = true;
    let name = "";

    let close: (data: Data) => void;

    function save () {
        if (!name.trim()) return;

        close({
            name,
            includeSett,
        });
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    interface $$Events {
        closed: CustomEvent<Data>
    }
</script>

<DialogWindow bind:close on:closed>
    <form on:submit|preventDefault={save}>
        <header>Saving the filters</header>
        <Slider bind:checked={includeSett}>
            Include the selected series?
        </Slider>
        <LabeledInput bind:value={name}>
            The filter set name
        </LabeledInput>
        <menu>
            <Button type="subdued-dark">
                Ok
            </Button>
            <Button type="subdued-dark" on:click={() => close(null)}>
                Cancel
            </Button>
        </menu>
    </form>
</DialogWindow>

<style>
    form {
        border-radius: 4px;
        padding: 20px;
        box-shadow: 0 0 0 5px #fff3, 0 0 2px 2px #0002;
        background-color: #1a1417;
        color: white;
        width: 250px;
        box-sizing: content-box;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.2em;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 20px;
    }
    form::after {
        content: "";
        height: 4px;
        background-position: bottom left;
        background-repeat: repeat-x;
        background: linear-gradient(90deg, #B078B1, #B5CE80, #51B2D5, #B078B1);
        width: 100%;
        position: absolute;
        bottom: 0;
        left: 0;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
    }
    header {
        font-size: 18px;
    }
    menu {
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1ch;
    }
</style>
