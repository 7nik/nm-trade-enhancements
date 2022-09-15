/**
 * Logs a signed debug message
 * @param args - data to log
 */
export const debug = (...args: any[]) => { 
    console.debug("[NMTE]", ...args); 
};

/**
 * Logs a signed error message
 * @param args - data to log
 */
export const error = (msg: string, ...args: any[]) => { 
    console.error("[NMTE]", new Error(msg), ...args); 
};

/**
 * Converts string to The Pascal Case
 * @param  {string} str - String for converting
 * @return {string} String in the camel case
 */
export function toPascalCase (str: string):string {
    return str
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((s) => s && s[0].toUpperCase().concat(s.slice(1).toLowerCase()))
        .join(" ");
}

/**
 * Get the named cookie
 * @param name - the cookie name
 * @returns cookie value or nothing
 */
export function getCookie (name: string) {
    const [, valueAndTrash] = `; ${document.cookie}`.split(`; ${name}=`);
    if (valueAndTrash) return valueAndTrash.split(";", 2)[0];
}


/**
 * Converts numbers to text using SI prefixes
 * @param val - a number to convert
 * @param precision - number of digits after the point, default - 1
 * @returns a short text representation of the number
 */
export function num2text(val: number, precision = 1) {
    // when val == 0, we get -Infinity * 0 = NaN
    const power = Math.floor(Math.log10(Math.abs(val)) / 3) * Math.sign(val);
    const v = Math.floor(val / 1000**power * 10**precision) / 10**precision;
    switch (isNaN(power) || power) {
        case -Infinity: return "-∞";
        case -8: return `${v}y`;
        case -7: return `${v}z`;
        case -6: return `${v}a`;
        case -5: return `${v}f`;
        case -4: return `${v}p`;
        case -3: return `${v}n`;
        case -2: return `${v}μ`;
        case -1: return `${v}m`;
        case true: return "0";
        case 0: return val.toString();
        case 1: return `${v}k`;
        case 2: return `${v}M`;
        case 3: return `${v}G`;
        case 4: return `${v}T`;
        case 5: return `${v}P`;
        case 6: return `${v}E`;
        case 7: return `${v}Z`;
        case 8: return `${v}Y`;
        case Infinity: return "∞";
        default: return (v * 1000**power).toExponential();
    }
}

/**
 * Splits a string into text and links
 * @param text - the text with links
 * @returns array [text, link, text, link, text,...]
 */
export function linky(text: string) {
    const regexp = /(ftp|https?):\/\/\S*[^\s.;,(){}<>"]/g;
    const parts: string[] = [];
    let match: RegExpExecArray | null
    let start = 0;
    while (match = regexp.exec(text)) {
        parts.push(text.slice(start, match.index), match[0]);
        start = regexp.lastIndex;
    }
    parts.push(text.slice(start));
    return parts;
}

/**
 * Subclass of Map which deletes the values with a delay,
 * and cancels deletion if the value is requested again via `get` method.
 */
export class LazyMap<K = any, V = any> extends Map<K, V> {
    #timeout = 1000;
    #removing = new Map<K, NodeJS.Timer>();

    constructor(timeout?: number);
    constructor(values?: readonly (readonly [K, V])[], timeout?: number);
    /**
     * Creates a LazyMap
     * @param values - optional initial values of the map
     * @param timeout - delay of deletion in ms, default - 1 second
     */
    constructor(values?: readonly (readonly [K, V])[] | number, timeout?: number) {
        if (timeout === undefined && typeof values === "number") {
            timeout = values;
            values = undefined;
        }
        // @ts-ignore - ts is don't see constructor params :(
        super(values ?? null);
        if (timeout) this.#timeout = timeout;
    }

    /**
     * Schedules deletion of the value 
     * @param key - the value's key
     * @param force - optional, if true, will be deleted without delay
     * @returns whether the values is/will be deleted
     */
    delete(key: K, force = false): boolean {
        if (!this.has(key)) return false;
        if (force) {
            this.delete(key);
            if (this.#removing.has(key)) {
                clearTimeout(this.#removing.get(key));
                this.#removing.delete(key);
            }
            return true;
        }
        if (this.#removing.has(key)) return true;
        this.#removing.set(key, setTimeout(() => {
            super.delete(key);
            this.#removing.delete(key);
        }, this.#timeout));
        return true;
    }

    /**
     * Schedule deletion of all the values
     * @param force - optional, if true, will be cleared without delay
     */
    clear(force = false): void {
        if (force === true) {
            super.clear();
        } else {
            for (const key of this.keys()) {
                this.delete(key, force);
            }
        }
    }

    /**
     * Retrieves a value by the key and cancels its deletion
     * @param key - the value's key
     */
    get(key: K) {
        if (this.#removing.has(key)) {
            clearTimeout(this.#removing.get(key));
            this.#removing.delete(key);
        }
        return super.get(key);
    }
}
