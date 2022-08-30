import type { CurrentUser } from "../utils/NMTypes";

let user: CurrentUser | null = null;
let ready: Promise<void> = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => {
        const json = (document.getElementById("user-json") as HTMLInputElement)?.value;
        if (json) {
            user = JSON.parse(json);
        }
        resolve();
    });
});


const User = {
    ready,
    get id() {
        return user?.id ?? -1;
    },
    isAuthenticated() {
        return user !== null;
    },
}

export default User;
