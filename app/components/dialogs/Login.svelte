<!-- @component
    A dialog window to log in
 -->
<script lang="ts">
    type LoginError = {
        code: string,
        detail: string,
        field_errors?: Record<string, string>,
    }

    import { debug, getCookie } from "../../utils/utils";
    import Button from "../elements/Button.svelte";
    import LabeledInput from "../elements/LabeledInput.svelte";
    import DialogWindow from "./DialogWindow.svelte";
    import { alert } from "./modals";

    let close: (reason: null) => void;

    let username = "";
    let password = "";
    const errors = {
        username: false,
        password: false,
    };
    let shaking = false;

    async function submit (firstTry = true) {
        const resp = await fetch("/api/signin/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": (getCookie("csrftoken") || ""),
            },
            body: JSON.stringify({ username, password }),
        });
        if (resp.ok) {
            close(null);
            return;
        }
        if (firstTry && resp.status === 403) {
            // get the CSRF token
            await fetch("/login");
            submit(false);
        }
        const data = await resp.json() as LoginError;
        debug("login error", data);
        if (data.field_errors) {
            errors.username = true;
            errors.password = true;
            shaking = true;
            setTimeout(() => { shaking = false; }, 1200);
        } else {
            alert(data.detail);
        }
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    interface $$Events {
        closed: CustomEvent<null>
    }
</script>

<DialogWindow bind:close blurry={"#FFFA"} closeable={false} on:closed>
    <div class:shaking>
        <header>
            Oops, your session has expired. Please, log in back.
        </header>
        <form on:submit|preventDefault={() => submit()}>
            <LabeledInput
                bind:value={username}
                name="username"
                autocomplete="username"
                error={errors.username}
            >
                {#if errors.username}
                    Incorrect
                {:else}
                    Email or username
                {/if}
            </LabeledInput>
            <LabeledInput
                bind:value={password}
                type="password"
                name="password"
                autocomplete="current-password"
                error={errors.password}
            >
                {#if errors.password}
                    Incorrect
                {:else}
                    Password
                {/if}
            </LabeledInput>
            <Button size="max">Log in</Button>
        </form>
        <a href="/login/reset-password/" target="_blank">Forgot password?</a>
    </div>
</DialogWindow>

<style>
    div {
        border-radius: 4px;
        padding: 20px;
        box-shadow: 0 0 0 5px #fff3, 0 0 2px 2px #0002;
        background-color: #1a1417;
        width: 340px;
        box-sizing: border-box;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    header {
        color: white;
        font-size: 18px;
        line-height: 1.2;
    }
    form {
        color: #0006;
        font-size: 18px;
        border-radius: 3px;
        overflow: hidden;
        display: grid;
        grid-template-rows: repeat(3, 60px);
    }
    a {
        font-size: 12px;
        color: #0d9ce6;
    }

    .shaking {
        animation: shaking .6s ease-in-out both;
    }
    @keyframes shaking {
        0%, 100% {
            transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
            transform: translateX(-10px);
        }
        20%, 40%, 60%, 80% {
            transform: translateX(10px);
        }
    }
</style>
