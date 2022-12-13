import type Services from "../utils/NMServices";
import type { CurrentUser } from "../utils/NMTypes";
import type { io as IO } from "socket.io-client";

type Config = Services.ArtConfig
    & Services.ArtConstants
    & Services.ArtContentTypes;

type Data = {
    auth: () => Promise<null>,
    config: Config,
    io: typeof IO,
    user: CurrentUser,
}

type Names = keyof Data;

const values: Partial<Data> = {};
const setters: {
    [k: string]:  (value: any) => void;
} = {};

/**
 * Initialize a value
 * @param name - the value's name
 * @param value - the value's data
 */
export function initValue<T extends Names> (name: T, value: Data[T]) {
    setters[name]?.(value);
    values[name] = value;
}

/**
 * Get an initialized value
 * @param name - the value's name
 * @returns value's data or promise of this data
 */
export function getInitValue<T extends Names> (name: T) {
    return values[name] ?? new Promise<Data[T]>((set) => {
        setters[name] = set;
    });
}
