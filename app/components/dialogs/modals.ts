import type { SvelteComponent, SvelteComponentTyped } from "svelte";

import Message from "./Message.svelte";

// FIXME: update Svelte to get ComponentEvents
// type EventResult<Component extends SvelteComponent, EventName extends string> = ComponentEvents<Component>[EventName]["detail"];
type AConstructorTypeOf<T, U extends any[] = any[]> = new (...args: U) => T;

let dialog: SvelteComponent | null = null;

/**
 * Creates a modal dialog, destroys the previous one
 * @param Comp - component constructor of the dialog
 * @param props - dialog params
 * @returns the name of the pressed button or `null`
 */
// export function createDialog<T extends SvelteComponentTyped<any, { closed: CustomEvent<any> }>>
export function createDialog<
    T extends SvelteComponentTyped<any, { closed: CustomEvent<any> }>
> (
    Comp: AConstructorTypeOf<T>,
    props: T["$$prop_def"],
): Promise<T["$$events_def"]["closed"]["detail"]> {
    return new Promise((resolve) => {
        dialog?.$destroy();
        dialog = new Comp({
            target: document.body,
            props,
        });
        dialog!.$on("closed", (ev: CustomEvent<any>) => {
            dialog?.$destroy();
            dialog = null;
            resolve(ev.detail);
        });
    });
}

/**
 * Show an alert message
 * @param title - the main message
 * @param text - an extra description
 * @returns a promise of message get closed
 */
// artMessage.showAlert
export async function alert (title: string, text = "") {
    await createDialog(Message, {
        title, text,
    });
}

/**
 * Show a confirm dialog
 * @param title - the main message
 * @param text - an extra description
 * @returns a promise whether the OK button was pressed
 */
// artMessage.showAlertWithCancel + showConfirm
export async function confirm (title: string, text = "") {
    const button = await createDialog(Message, {
        title,
        text,
        buttons: ["OK", "Cancel"],
    });
    return button === "OK";
}
