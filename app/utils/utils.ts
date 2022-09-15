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
 * @returns a short text representation of the number
 */
export function num2text(val: number) {
    // when val == 0, we get -Infinity * 0 = NaN
    const power = Math.floor(Math.log10(Math.abs(val)) / 3) * Math.sign(val);
    const v = Math.floor(val / 1000**power * 10) / 10;
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
