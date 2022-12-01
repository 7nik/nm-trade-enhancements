<!-- @component
    A general window for displaying the rewards
 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Button from "../elements/Button.svelte";
    import DialogWindow from "./DialogWindow.svelte";

    export let title: string;
    export let button: string;

    let close: (reason: null) => void;

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    interface $$Events {
        closed: CustomEvent<null>,
        closing: CustomEvent<null>,
    }

    const dispatch = createEventDispatcher();

    function click () {
        if (dispatch("closing", null, { cancelable: true })) {
            close(null);
        }
    }
</script>

<DialogWindow blurry={"rgba(26,20,23,.8)"} bind:close on:closed closeable={false}>
    <article>
        <header>{title}</header>
        <hr>
        <main>
            <slot/>
        </main>
        <div class="button">
            <Button type="reward" size="max" on:click={click}>
                {button}
            </Button>
        </div>
    </article>
</DialogWindow>

<style>
    article {
        border-radius: 4px;
        padding: 0;
        box-shadow: 0 0 0 5px #fff3, 0 0 2px 2px #0002;
        background-color: #1a1417;
        color: white;
        width: 390px;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.3;
        text-align: center;
        display: flex;
        flex-direction: column;
    }
    header {
        padding: 20px;
        font-size: 22px;
    }
    hr {
        height: 1px;
        margin: 0;
        border: none;
        background-position: bottom left;
        background-repeat: repeat-x;
        background: linear-gradient(90deg, #B078B1, #B5CE80, #51B2D5, #B078B1);
    }
    main {
        padding: 20px;
    }
    .button {
        margin: 5px auto 30px;
        width: 134px;
        border-radius: 4px;
        overflow: hidden;
    }
</style>
