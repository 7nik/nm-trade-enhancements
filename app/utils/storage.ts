/**
 * Reads a saved value from `localStorage` if presented, otherwise - default value
 * @param  {string} name - Name of the value
 * @param  {?any} defValue - Default value of the value
 * @return {any} Saved or default value
 */
 export function loadValue<T> (name: string, defValue: T): T {
    const fullName = "NM_trade_enhancements_".concat(name);
    if (fullName in localStorage) {
        return JSON.parse(localStorage[fullName]);
    }
    return defValue;
}

/**
 * Saves a value to `localStorage`
 * @param  {string} name - Name of the value
 * @param  {any} value - Value to save
 */
export function saveValue (name: string, value: any) {
    const fullName = "NM_trade_enhancements_".concat(name);
    localStorage[fullName] = JSON.stringify(value);
}
