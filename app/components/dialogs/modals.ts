import type { ComponentProps, ComponentType, SvelteComponent, SvelteComponentTyped } from "svelte";

import Login from "./Login.svelte";
import Message from "./Message.svelte";

let dialog: SvelteComponent | null = null;

/**
 * Creates a modal dialog, destroys the previous one 
 * @param Comp - component constructor of the dialog
 * @param params - dialog params
 * @returns the name of the pressed button or `null`
 */
function createDialog<T extends SvelteComponentTyped<{ onclose?:(b:string|null) => any }>> 
    (Comp: ComponentType<T>, params: ComponentProps<T>) 
{
    return new Promise<string|null>((resolve) => {
        dialog?.$destroy();
        dialog = new Comp({
            target: document.body,
            props: {
                ...params,
                onclose: (button: string|null) => {
                    dialog!.$destroy();
                    dialog = null;
                    resolve(button);
                },
            }
        });
    });
}

/**
 * Show an alert message
 * @param message - the main message
 * @param subtext - an extra description
 * @returns a promise of message get closed
 */
// artMessage.showAlert
export async function alert (message: string, subtext = "") {
    await createDialog(Message, { 
        message, subtext,
        iconClass: "icon-warning", 
    });
}

/**
 * Show a confirm dialog
 * @param message - the main message
 * @param subtext - an extra description
 * @returns a promise whether the OK button was pressed
 */
// artMessage.showAlertWithCancel + showConfirm
export async function confirm (message: string, subtext = "") {
    const button = await createDialog(Message, { 
        message, subtext,
        buttons: ["OK", "Cancel"],
        iconClass: "icon-warning", 
    });
    return button === "OK";
}

/**
 * Show a form to log in
 * @returns a promise that the user successfully logged in
 */
export async function login () {
    await createDialog(Login, {});
}
