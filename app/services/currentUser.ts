import type { CurrentUser } from "../utils/NMTypes";

import { debug } from "../utils/utils";
import { getInitValue } from "./init";

const user = await getInitValue<CurrentUser>("user");

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
debug("user info loaded")
