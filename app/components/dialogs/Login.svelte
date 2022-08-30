<!-- @component
    A dialog window to log in
 -->
<script lang="ts">
    import type { SvelteComponent } from "svelte";
    
    type LoginError = {
        code: string,
        detail: string,
        field_errors?: Record<string, string>,
    }
    
    import { debug, getCookie } from "../../utils/utils";
    import { alert } from "./modals";
    import DialogWindow from "./DialogWindow.svelte";

    export let onclose: (x:string|null)=>any = ()=>{};

    let dialog: SvelteComponent;
    let username = "", password = "";
    let errors = {
        username: false,
        password: false
    };
    let shake = false;

    async function submit(firstTime = true) {
        const resp = await fetch("/api/signin/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": (getCookie("csrftoken") || ""),
            },
            body: JSON.stringify({ username, password }),
        });
        if (resp.ok) {
            dialog.close();
            return;
        }
        if (firstTime && resp.status === 403) {
            // get the CSRF token
            await fetch("/login");
            submit(false);   
        }
        const data = await resp.json() as LoginError;
        debug("login error", data);
        if (data.field_errors) {
            errors.username = true;
            errors.password = true;
            shake = true;
            setTimeout(() => shake = false, 1200);
        } else {
            alert(data.detail);
        }
    }
</script>
 
<DialogWindow bind:this={dialog} buttons={[]} blurry={true} cancelable={false} {onclose} styleClass={shake ? "shake" : ""}>
    <p class="text-body-large text-prominent">
        Oops, your session has expired. Please, log in back.
    </p>
    <form class="signin-page--form" on:submit|preventDefault={() => submit()}>
        <label class="form--field--label"  class:error={errors.username}>
            <input name="username" class="form--field--input" required bind:value={username} autocomplete="username">
            <span>
                {#if errors.username}Incorrect{/if} 
                Email or username
            </span>
        </label>
        <label class="form--field--label" class:error={errors.password}>
            <input type="password" name="password" class="form--field--input" required bind:value={password} autocomplete="current-password">
            <span>
                {#if errors.password}"Incorrect"{/if} 
                Password
            </span>
            <a class="signin--form--forgot text-small" href="/login/reset-password/" target="_blank">Forgot?</a>
        </label>
        <button class="btn full" type="submit">
            <span>Log in</span>
        </button>
    </form>
</DialogWindow>

<style>
    form {
        margin-top: 0.5em;
        font-size: 18px;
        border-radius: 3px;
        overflow: hidden;
    }
    .form--field--label {
        display: block;
        position: relative;
        background-color: white;
        cursor: pointer;
    }
    .form--field--label:not(:first-child) {
        border-top: 1px solid #0002;
    }
    .form--field--input {
        border: none;
        display: inline-block;
        color: black;
        width: 100%;
        height: 60px;
        font-size: 16px;
        padding: 31px 22px 13px;
    }
    .form--field--label span {
        position: absolute;
        left: 0;
        top: 0;
        margin: 20px;
        font-size: 16px;
        transition: .1s all ease-in-out;
        transition-property: margin-top, font-size;
    }
    .form--field--label input:valid + span,
    .form--field--label input:-webkit-autofill + span,
    .form--field--label input:focus + span {
        font-size: 12px;
        margin-top: 12px;
    }
    .form--field--label a {
        position: absolute;
        top: 12px;
        right: 20px;
        font-size: 12px;
        float: right;
        color: #0d9ce6;
    }
    button {
        border-radius: 0;
        padding: 22px;
    }
    :global(.shake) {
        animation: shake .6s ease-in-out both;
    }
    @keyframes shake {
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
