import type Services from "../utils/NMServices";
import type { CurrentUser } from "../utils/NMTypes";
import type { io as IO } from "socket.io-client";

type Config = Services.ArtConfig
    & Services.ArtConstants
    & Services.ArtContentTypes;

type Field<T> = { set?: (value: T) => void, value?: T };

type Data = {
    auth: () => Promise<null>,
    config: Config,
    io: typeof IO,
    user: CurrentUser,
}

type Names = keyof Data;

const map: Partial<{
    [P in Names]: Field<Data[P]>
}> = {};

/**
 * Initialize a value
 * @param name - the value's name
 * @param value - the value's data
 */
export function initValue<T extends Names> (name: T, value: Data[T]) {
    const data = map[name];
    if (data && "set" in data) {
        data.set!(value);
    }
    // @ts-ignore - ts is baka
    map[name] = { value };
}

/**
 * Get an initialized value
 * @param name - the value's name
 * @returns value's data or promise of this data
 */
export function getInitValue<T extends Names> (name: T): Data[T] | Promise<Data[T]> {
    const data = map[name];
    if (data && "value" in data) return data.value!;
    return new Promise((set) => {
        // @ts-ignore - ts is baka
        map[name] = { set };
    });
}
