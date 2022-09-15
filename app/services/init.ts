type Data = { set: (value: any) => void } | { value: any };
type Names = "io" | "user" | "config" | "auth";
// for simplicity won't define/export value types

const map: Record<string, Data> = {};

/**
 * Initialize a value
 * @param name - the value's name
 * @param value - the value's data
 */
export function initValue (name: Names, value: any) {
    const data = map[name]
    if (data && "set" in data) {
        data.set(value);
    }
    map[name] = { value };
}

/**
 * Get an initialized value
 * @param name - the value's name
 * @returns value's data or promise of this data
 */
export function getInitValue<T>(name: Names): T | Promise<T> {
    const data = map[name];
    if (data && "value" in data) return data.value;
    return new Promise((set) => {
        map[name] = { set };
    });
}
