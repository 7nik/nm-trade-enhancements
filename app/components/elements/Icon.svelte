<script lang="ts" context="module">
    const GLYPHTER_ICONS = {
        badge: "\u0041",
        burger: "\u0042",
        chat: "\u0043",
        checkmark: "\u0044",
        close: "\u0045",
        conceal: "\u0046",
        creator: "\u0047",
        edit: "\u0048",
        flag: "\u0049",
        like: "\u004A",
        liked: "\u004B",
        minus: "\u004C",
        add: "\u004D",
        more: "\u004E",
        // notifications: "\u004F",
        owners: "\u0050",
        reveal: "\u0051",
        search: "\u0052",
        trade: "\u0053",
        trash: "\u0054",
        block: "\u0055",
        // unowned: "\u0055",
        warning: "\u0056",
        // print: "\u0057",
        behance: "\u002F",
        deviantArt: "\u005B",
        dribbble: "\u005C",
        instagram: "\u005D",
        facebook: "\u005E",
        etsy: "\u005F",
        googlePlus: "\u0060",
        pinterest: "\u007C",
        tumblr: "\u007D",
        twitter: "\u007E",
    } as const;
    const ICOMOON_ICONS = {
        checklist: "\uE900",
        wishlist: "\uE901",
        wishlisted: "\uE902",
        multiPrints: "\uE903",
        questSeries: "\uE905",
        collection: "\uE905",
        seriesDetail: "\uE906",
        ascending: "\uE907",
        packAvailable: "\uE908",
        seriesChecklist: "\uE909",
        completed: "\uE90A",
        descending: "\uE90B",
        filter: "\uE90C",
        incomplete: "\uE90D",
        lock: "\uE90E",
        owned: "\uE910",
        packUnavailable: "\uE911",
        unlocked: "\uE912",
        yourCollection: "\uE914",
        freebie: "\uE915",
        limited: "\uE916",
        unlimited: "\uE917",
        helpLight: "\uE918",
        search: "\uE919",
        ascendingSimple: "\uE91A",
        seriesFinder: "\uE91B",
        descendingSimple: "\uE91C",
        unownedCard: "\uE91D", // deprecated
        cards: "\uE91E",
        time: "\uE920",
        commonSeries: "\uE921",
        rank: "\uE922",
        quest: "\uE923",
        quickness: "\uE924",
        odds: "\uE925",
        question: "\uE926",
        average: "\uE927",
        "crown-1": "\uE928",
        streak: "\uE92D",
        "chevron-1": "\uE92E",
        "chevron-2": "\uE92F",
        "chevron-3": "\uE930",
        "lighting-1": "\uE931",
        "lighting-2": "\uE932",
        "lighting-3": "\uE933",
        "crescent-moon-1": "\uE934",
        "crescent-moon-2": "\uE935",
        "crescent-moon-3": "\uE936",
        "star-1": "\uE937",
        "star-2": "\uE938",
        "star-3": "\uE939",
        "8-point-star-1": "\uE93A",
        "8-point-star-2": "\uE93B",
        "8-point-star-3": "\uE93C",
        "diamond-1": "\uE93D",
        "diamond-2": "\uE93E",
        "diamond-3": "\uE93F",
        "water-1": "\uE940",
        "water-2": "\uE941",
        "water-3": "\uE942",
        duplicate: "\uE943",
        limitedSeries: "\uE946",
        discarding: "\uE947",
        trader: "\uE948",
        success: "\uE949",
        rarityMilestone: "\uE94A",
        // RE: "\uE94B",
        user: "\uE94C",
        discard: "\uE94D",
        // LE: "\uE94E",
        traderGrade: "\uE94F",
        unowned: "\uE950",
        score: "\uE951",
        // pro: "\uE952",
        reload: "\uE953",
        edit: "\uE954",
        filterUnowned: "\uE955",
    } as const;
    const IMG_ICONS = [
        "carat", "card-trading", "credit", "loader", "notifications", "pro", "save", "LE", "RE",
        "common", "uncommon", "rare", "veryRare", "extraRare", "core", "chase", "variant", "legendary",
        "difficulty-0", "difficulty-1", "difficulty-2", "difficulty-3", "difficulty-4",
        "difficulty-5", "difficulty-6", "difficulty-7", "difficulty-8",
    ] as const;

    type IconName = keyof typeof GLYPHTER_ICONS
        | keyof typeof ICOMOON_ICONS
        | typeof IMG_ICONS[number]
        | "";
    export type { IconName };

    const COLORS: Partial<Record<IconName, string>> = {
        behance: "#1D8DB5",
        deviantArt: "#00CE3E",
        dribbble: "#EA4C89",
        etsy: "#F76400",
        facebook: "#3C5A99",
        googlePlus: "#DC4A38",
        instagram: "#005686",
        pinterest: "#AA2529",
        tumblr: "#303D4D",
        twitter: "#1D8DB5",

        // completed: "#1482A1",
        liked: "#FFCF2F",
        warning: "#ea2360",
        wishlisted: "#FFCF2F",
    } as const;
</script>
<!-- @component
    A component for displaying various icons
 -->
<script lang="ts">
    import tip from "./tip";

    type CssUnit = "cm"|"mm"|"in"|"px"|"pt"|"pc"|"em"|"ex"|"ch"|"rem"|"vw"|"vh"|"vmin"|"vmax"|"%";

    /**
     * The icon type to display
     */
    export let icon: IconName = "";
    /**
     * The icon size in px of % of the font-size
     */
    export let size: `${number}${CssUnit}` = "20px";
    /**
     * The icon's tooltip text
    */
    export let hint = "";

    $: type =
        icon in GLYPHTER_ICONS ? "glyphter" :
        icon in ICOMOON_ICONS ? "icomoon" :
        IMG_ICONS.includes(icon as typeof IMG_ICONS[number]) ? `img ${icon}` :
        "";
    $: symbol = GLYPHTER_ICONS[icon as keyof typeof GLYPHTER_ICONS]
        ?? ICOMOON_ICONS[icon as keyof typeof ICOMOON_ICONS]
        ?? "";
    $: color = COLORS[icon] ?? "inherit";
</script>

<span
    class={type} use:tip={hint}
    style:--size={size}
    style:--color={color}
    on:click
>{symbol}</span>

<style>
    /* For fonts generated using Glyphter */
    @font-face {
        font-family: 'glyphter nm icon font';
        src: url('https://d1ld1je540hac5.cloudfront.net/core/asset/font/nm-icon-font.woff') format('woff'),
            url('https://d1ld1je540hac5.cloudfront.net/core/asset/font/nm-icon-font.ttf') format('truetype'),
            url('https://d1ld1je540hac5.cloudfront.net/core/asset/font/LocatorDisplayBold.otf') format('otf');
        font-weight: normal;
        font-style: normal;
    }
    /* For fonts generated using Icomoon (https://icomoon.io/app/#/select) */
    @font-face {
        font-family: 'icomoon nm icon font';
        src:
            url('https://d1ld1je540hac5.cloudfront.net/core/asset/font/nm-icon-im-font.woff') format('woff'),
            url('https://d1ld1je540hac5.cloudfront.net/core/asset/font/nm-icon-im-font.svg') format('svg'),
            url('https://d1ld1je540hac5.cloudfront.net/core/asset/font/nm-icon-im-font.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }

    span {
        display: inline-block;
        aspect-ratio: 1;
        color: var(--color);
        font-size: var(--size);
        width: var(--size);
        height: var(--size);
        box-sizing: content-box;
        line-height: var(--size);
        vertical-align: middle;
        font-style: normal;
    }
    span.glyphter {
        font-family: "glyphter nm icon font";
    }
    span.icomoon {
        font-family: "icomoon nm icon font";
    }
    span.img {
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    .carat {
        background-image: url('//d1ld1je540hac5.cloudfront.net/assets/svg/carats/carat.svg');
    }
    .card-trading {
        background: black;
        padding: 2px;
        transform: rotate(45deg);
    }
    .card-trading::before {
        font-family: 'glyphter nm icon font';
        content: 'S';
        color: white;
        display: block;
        transform: rotate(-45deg);
    }
    .credit {
        background-image: url('//d1ld1je540hac5.cloudfront.net/assets/svg/credit.svg');
    }
    .loader {
        background-image: url('//d1ld1je540hac5.cloudfront.net/assets/img/loader.gif');
    }
    .notifications {
        mask-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3e%3cpath fill="none" d="m14 10.4-2-3V5A3.8 3.8 0 0 0 8 1h-.8c-1.8.4-3.1 2-3.1 3.8 0 .3 0-.2 0 0V7.6l-2 2.9c-.1 0-.1 0 0 0v.1h11.8c.1 0 .1-.1 0-.1ZM6 13a2 2 0 1 0 4 0" stroke="white" stroke-width="1.6"/%3e%3c/svg%3e');
        -webkit-mask-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3e%3cpath fill="none" d="m14 10.4-2-3V5A3.8 3.8 0 0 0 8 1h-.8c-1.8.4-3.1 2-3.1 3.8 0 .3 0-.2 0 0V7.6l-2 2.9c-.1 0-.1 0 0 0v.1h11.8c.1 0 .1-.1 0-.1ZM6 13a2 2 0 1 0 4 0" stroke="white" stroke-width="1.6"/%3e%3c/svg%3e');
        background: currentColor;
    }
    .pro {
        background-image: url('//d1ld1je540hac5.cloudfront.net/assets/svg/carats/pro.svg');
    }
    .save {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"%3e%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 22 22"%3e%3cpath stroke="%235F5668" stroke-width="2" fill="transparent" d="M0 2v16a2 2 0 0 0 2 2h2v-5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5H2h16a2 2 0 0 0 2-2V5l-5-5H7v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V0H2a2 2 0 0 0-2 2"/%3e%3c/svg%3e%3c/svg%3e');
    }
    .RE {
        background-image: url('//d1ld1je540hac5.cloudfront.net/assets/svg/icon-RE.svg');
    }
    .LE {
        background-image: url('//d1ld1je540hac5.cloudfront.net/assets/svg/icon-LE.svg');
    }

    .common {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3e%3ccircle fill="%23c5c5c5" cx="5" cy="5" r="4"/%3e%3cpath fill="%23aeaeae" d="M3 4v2l-1.6.8a4 4 0 0 1 0-3.6Z"/%3e%3cpath fill="%238b8b8b" d="m3 6 1 1-.8 1.6a4 4 0 0 1-1.8-1.8Z"/%3e%3cpath fill="%23aeaeae" d="M4 7h2l.8 1.6a4 4 0 0 1-3.6 0Z"/%3e%3cpath fill="%23e2e2e2" d="M7 6V4l1.6-.8a4 4 0 0 1 0 3.6Z"/%3e%3cpath fill="white" d="M7 4 6 3l.8-1.6a4 4 0 0 1 1.8 1.8Z"/%3e%3cpath fill="%23e2e2e2" d="M6 3H4l-.8-1.6a4 4 0 0 1 3.6 0Z"/%3e%3c/svg%3e');
    }
    .uncommon {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3e%3cpath fill="%2300d8b2" d="M1 1h8v8H1z"/%3e%3cpath fill="%2300c58a" d="M1 1v8l2-2V3Z"/%3e%3cpath fill="%2379ffff" d="M1 1h8L7 3H3Z"/%3e%3cpath fill="%230c995a" d="M1 9h8L7 7H3Z"/%3e%3c/svg%3e');
    }
    .rare {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3e%3cpath fill="%2363c4f6" d="M0 1h10L5 9Z"/%3e%3cpath fill="%23a4edfd" d="m0 1 3 2h4l3-2Z"/%3e%3cpath fill="%230086f0" d="m0 1 3 2 2 3v3Z"/%3e%3c/svg%3e');
    }
    .veryRare {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3e%3cpath fill="%23b981ed" d="M2 3v4l3 3 3-3V3L5 0Z"/%3e%3cpath fill="%23a14de8" d="M2 3v4h2V3Z"/%3e%3cpath fill="%237c00df" d="M4 7H2l3 3V8Z"/%3e%3cpath fill="%23d49ef7" d="M8 3H6v4h2Z"/%3e%3cpath fill="%23f1e5fc" d="M5 0v2l1 1h2Z"/%3e%3c/svg%3e');
    }
    .extraRare {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3e%3cpath fill="%23e82c8e" d="m0 4 5 5 5-5-3-3H3Z"/%3e%3cpath fill="%23c61555" d="M0 4h2l3 3v2Z"/%3e%3cpath fill="%23f7acd3" d="M7 1v2l1 1h2Z"/%3e%3cpath fill="%23ed6caf" d="M3 1v2h4V1Z"/%3e%3c/svg%3e');
    }
    .core {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 12"%3e%3clinearGradient id="a" x1="0" x2="0" y1="0" y2="1"%3e%3cstop stop-color="%23528eee" offset="0%25"/%3e%3cstop stop-color="%23ccdafe" offset="75%25"/%3e%3c/linearGradient%3e%3cpath fill="url(%23a)" d="M4.6 0 0 4.6 7.5 12 15 4.6 10.6 0 7.5 2.8Z"/%3e%3cpath fill="%23528eee" d="M0 4.6h3L4.6 3V0Z"/%3e%3cpath fill="%23514da4" d="M0 4.6h3L7.5 9v3Z"/%3e%3cpath fill="%23979de9" d="M15 4.6h-3L7.5 9v3Z"/%3e%3cpath fill="%23bed3ff" d="M4.6 3V0l2.9 2.8v3ZM10.6 3V0L15 4.6h-3Z"/%3e%3c/svg%3e');
    }
    .chase {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 12"%3e%3clinearGradient id="a" x1="0" x2="0" y1="0" y2="1"%3e%3cstop stop-color="%23f7c46c" offset="0%25"/%3e%3cstop stop-color="%23f27fb3" offset="75%25"/%3e%3c/linearGradient%3e%3cpath fill="url(%23a)" d="M4.6 0 0 4.6 7.5 12 15 4.6 10.6 0 7.5 2.8Z"/%3e%3cpath fill="%23ee2a4d" d="M0 4.6h3L7.5 9v3Z"/%3e%3cpath fill="%23f37493" d="M15 4.6h-3L7.5 9v3Z"/%3e%3cpath fill="%23fcf29d" d="M4.6 3V0l2.9 2.8v3ZM10.6 3V0L15 4.6h-3Z"/%3e%3c/svg%3e');
    }
    .variant {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 12"%3e%3cpath fill="%23c5c5c5" d="M4.6 0 0 4.6 7.5 12V2.8Z"/%3e%3cpath fill="%238b8b8b" d="M0 4.6h3L7.5 9v3Z"/%3e%3cpath fill="%23f7f7f7" d="M4.6 3V0l2.9 2.8v3Z"/%3e%3cpath fill="%23654a7e" d="M7.5 2.8V12L15 4.6 10.6 0Z"/%3e%3cpath fill="%23432e54" d="M15 4.6h-3L7.5 9v3Z"/%3e%3cpath fill="%23a77ac9" d="M10.6 3V0L15 4.6h-3Z"/%3e%3c/svg%3e');
    }
    .legendary {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3e%3cpath fill="%2395a7d6" d="m10 10 15 40-15 40 40-15 40 15-15-40 15-40-40 15Z"/%3e%3cpath fill="%23d9e1f7" d="m10 10 80 80-15-40 15-40-40 40V25Z"/%3e%3cpath fill="%23fafcff" d="M90 10 50 25v25Z"/%3e%3cpath fill="%2345568e" d="m10 90 40-40v25Z"/%3e%3cdefs%3e%3clinearGradient id="a" x1="0" y1="0" x2="1" y2="1"%3e%3cstop offset="50%25" stop-opacity=".3"/%3e%3cstop offset="52%25" stop-opacity=".2"/%3e%3cstop offset="54%25" stop-opacity=".1"/%3e%3cstop offset="56%25" stop-opacity="0"/%3e%3c/linearGradient%3e%3clinearGradient id="c" x1="1" y1="0" x2="0" y2="1"%3e%3cstop offset="20%25" stop-opacity=".3"/%3e%3cstop offset="52%25" stop-opacity=".2"/%3e%3cstop offset="54%25" stop-opacity=".1"/%3e%3cstop offset="56%25" stop-opacity="0"/%3e%3c/linearGradient%3e%3clinearGradient id="b" x1="0" y1="0" x2="1" y2="1"%3e%3cstop offset="40%25" stop-color="white" stop-opacity="0"/%3e%3cstop offset="45%25" stop-color="white" stop-opacity=".3"/%3e%3cstop offset="50%25" stop-color="white" stop-opacity=".7"/%3e%3c/linearGradient%3e%3c/defs%3e%3cpath fill="url(%23a)" d="m10 90 80-80-21 59Z"/%3e%3cpath fill="url(%23b)" d="m50 25 40-15-40 40Z"/%3e%3cpath fill="url(%23c)" d="m10 10 80 80-59-21Z"/%3e%3cpath fill="%23fccc55" d="M50 0 35 35 0 50l35 15 15 35 15-35 35-15-35-15Z"/%3e%3cpath fill="%23d96a05" d="M50 50 35 65l15 35V50h50L65 65Z"/%3e%3cpath fill="%23f39c3f" d="M50 50 35 65 0 50h50V0L35 35Z"/%3e%3cdefs%3e%3clinearGradient id="e" x1="0" y1="0" x2="0" y2="1"%3e%3cstop offset="0%25" stop-color="%23bd4101" stop-opacity=".3"/%3e%3cstop offset="10%25" stop-color="%23bd4101" stop-opacity=".3"/%3e%3cstop offset="20%25" stop-color="%23bd4101" stop-opacity=".1"/%3e%3cstop offset="30%25" stop-color="%23bd4101" stop-opacity="0"/%3e%3c/linearGradient%3e%3clinearGradient id="f" x1="0" y1="0" x2="0" y2="1"%3e%3cstop offset="70%25" stop-color="%23bd4101" stop-opacity="0"/%3e%3cstop offset="85%25" stop-color="%23bd4101" stop-opacity=".1"/%3e%3cstop offset="100%25" stop-color="%23bd4101" stop-opacity=".3"/%3e%3c/linearGradient%3e%3clinearGradient id="g" x1="0" y1="0" x2="0" y2="1"%3e%3cstop offset="70%25" stop-color="white" stop-opacity="0"/%3e%3cstop offset="80%25" stop-color="white" stop-opacity=".1"/%3e%3cstop offset="90%25" stop-color="white" stop-opacity=".3"/%3e%3cstop offset="100%25" stop-color="white" stop-opacity=".5"/%3e%3c/linearGradient%3e%3clinearGradient id="h" x1="0" y1="0" x2="1" y2="0"%3e%3cstop offset="35%25" stop-color="white" stop-opacity="0"/%3e%3cstop offset="45%25" stop-color="white" stop-opacity=".3"/%3e%3cstop offset="50%25" stop-color="white" stop-opacity=".5"/%3e%3cstop offset="60%25" stop-color="white" stop-opacity=".3"/%3e%3cstop offset="70%25" stop-color="white" stop-opacity="0"/%3e%3c/linearGradient%3e%3cfilter id="d"%3e%3cfeGaussianBlur in="SourceGraphic" stdDeviation="2"/%3e%3c/filter%3e%3c/defs%3e%3cpath stroke="%23bd4101" stroke-width="2" fill="none" d="m36 67 16-17 15 14" filter="url(%23d)"/%3e%3cpath stroke="white" stroke-width="2" fill="none" d="M67 36 52 50 36 33" filter="url(%23d)"/%3e%3cpath fill="url(%23e)" d="M0 50h100L50 75Z"/%3e%3cpath fill="url(%23f)" d="M0 50h50L35 35Z"/%3e%3cpath fill="url(%23g)" d="M50 50h50L50 25Z"/%3e%3cpath fill="url(%23h)" d="M50 0 35 35l15 15 15-15Z"/%3e%3c/svg%3e');
    }

    .difficulty-0 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath d="M22.5 0h-12a10 10 0 0 0-10 10v12a10 10 0 0 0 10 10h12a10 10 0 0 0 10-10V10a10 10 0 0 0-10-10Z" fill="%2375A9FF"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M31.9 6.6A10 10 0 0 0 23.5 2h-12a10 10 0 0 0-10 10v12c0 1.2.2 2.4.6 3.4A10 10 0 0 1 .5 22V10a10 10 0 0 1 10-10h12c4.3 0 8 2.7 9.4 6.6Z" fill="%23BAD4FF"/%3e%3cpath d="M22.5 4h-12a6 6 0 0 0-6 6v12a6 6 0 0 0 6 6h12a6 6 0 0 0 6-6V10a6 6 0 0 0-6-6Z" fill="%23205ABA"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M27.6 6.9a6 6 0 0 0-3.1-.9h-12a6 6 0 0 0-6 6v12a6 6 0 0 0 .9 3.1A6 6 0 0 1 4.5 22V10a6 6 0 0 1 6-6h12a6 6 0 0 1 5.1 2.9Z" fill="%231E4A98"/%3e%3cpath d="M17 13a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="%2375A9FF"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M18 13.1a3.5 3.5 0 0 0 0 6.8 3.5 3.5 0 1 1 0-6.8Z" fill="%23BAD4FF"/%3e%3c/svg%3e');
    }
    .difficulty-1 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 26"%3e%3cpath d="M18.2.2H8.6a8 8 0 0 0-8 8v9.6a8 8 0 0 0 8 8h9.6a8 8 0 0 0 8-8V8.2a8 8 0 0 0-8-8Z" fill="%2320BDFF"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M24.6 3.4a8 8 0 0 0-4.8-1.6h-9.6a8 8 0 0 0-8 8v9.6a8 8 0 0 0 1.6 4.8 8 8 0 0 1-3.2-6.4V8.2a8 8 0 0 1 8-8h9.6a8 8 0 0 1 6.4 3.2Z" fill="%238FDEFF"/%3e%3cpath d="M18.2 3.4H8.6a4.8 4.8 0 0 0-4.8 4.8v9.6c0 2.7 2.1 4.8 4.8 4.8h9.6c2.7 0 4.8-2.1 4.8-4.8V8.2c0-2.7-2.1-4.8-4.8-4.8Z" fill="%231783B1"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M22.3 5.7c-.7-.4-1.6-.7-2.5-.7h-9.6a4.8 4.8 0 0 0-4.8 4.8v9.6c0 1 .3 1.8.7 2.5a4.8 4.8 0 0 1-2.3-4.1V8.2c0-2.7 2.1-4.8 4.8-4.8h9.6c1.7 0 3.3 1 4.1 2.3Z" fill="%23006A92"/%3e%3cpath d="M13.4 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="%2320BDFF"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M16 10a4 4 0 0 0-3.5 6.9 4 4 0 1 1 3.4-7Z" fill="%238FDEFF"/%3e%3c/svg%3e');
    }
    .difficulty-2 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m2 9.5 8-8A5 5 0 0 1 13.5 0h6A5 5 0 0 1 23 1.5l8 8a5 5 0 0 1 1.5 3.5v6a5 5 0 0 1-1.5 3.5l-8 8a5 5 0 0 1-3.5 1.5h-6a5 5 0 0 1-3.5-1.5l-8-8A5 5 0 0 1 .5 19v-6A5 5 0 0 1 2 9.5Z" fill="%2302E089"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M25 3.5A5 5 0 0 0 21.5 2h-6A5 5 0 0 0 12 3.5l-8 8A5 5 0 0 0 2.5 15v6A5 5 0 0 0 4 24.5l-2-2A5 5 0 0 1 .5 19v-6A5 5 0 0 1 2 9.5l8-8A5 5 0 0 1 13.5 0h6A5 5 0 0 1 23 1.5l2 2Z" fill="%2380EFC4"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M11.2 26.5 6 21.3a5 5 0 0 1-1.5-3.6v-3.4A5 5 0 0 1 6 10.7l5.2-5.2A5 5 0 0 1 14.8 4h3.4a5 5 0 0 1 3.6 1.5l5.2 5.2a5 5 0 0 1 1.5 3.6v3.4a5 5 0 0 1-1.5 3.6l-5.2 5.2a5 5 0 0 1-3.6 1.5h-3.4a5 5 0 0 1-3.6-1.5Z" fill="%2316A46C"/%3e%3cpath d="M16.5 14h5a.6.6 0 0 1 .5 1l-4.4 8a.6.6 0 0 1-1.1-.3v-4.8h-5a.6.6 0 0 1-.5-.9l4.4-8a.6.6 0 0 1 1.1.3v4.8Z" fill="%2302E089"/%3e%3cpath d="M18.5 14h3-3Zm0 7.4-.9 1.6a.6.6 0 0 1-1.1-.3v-4.8h2v3.5Zm-5-3.5h-2a.6.6 0 0 1-.5-.9l4.4-8a.6.6 0 0 1 1.1.3v1.3L13 17a.6.6 0 0 0 .5 1Z" fill="%2380EFC4"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m8 23.3-2-2a5 5 0 0 1-1.5-3.6v-3.4A5 5 0 0 1 6 10.7l5.2-5.2A5 5 0 0 1 14.8 4h3.4a5 5 0 0 1 3.6 1.5l2 2A5 5 0 0 0 20.2 6h-3.4a5 5 0 0 0-3.6 1.5L8 12.7a5 5 0 0 0-1.5 3.6v3.4A5 5 0 0 0 8 23.3Z" fill="%23048646"/%3e%3c/svg%3e');
    }
    .difficulty-3 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m1.7 9.8 8.6-8.6A4 4 0 0 1 13 0h6.8c1 0 2 .4 2.8 1.2l8.6 8.6a4 4 0 0 1 1.2 2.8v6.8c0 1-.4 2-1.2 2.8l-8.6 8.6A4 4 0 0 1 20 32h-6.8c-1 0-2-.4-2.8-1.2l-8.6-8.6a4 4 0 0 1-1.2-2.8v-6.8c0-1 .4-2 1.2-2.8Z" fill="%2325AB83"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M24.7 3.2A4 4 0 0 0 22 2h-6.8c-1 0-2 .4-2.8 1.2l-8.6 8.6a4 4 0 0 0-1.2 2.8v6.8c0 1 .4 2 1.2 2.8l-2-2a4 4 0 0 1-1.2-2.8v-6.8c0-1 .4-2 1.2-2.8l8.6-8.6A4 4 0 0 1 13 0h6.8c1 0 2 .4 2.8 1.2l2 2Z" fill="%2366C4A8"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M11.5 26.8 5.7 21A4 4 0 0 1 4.5 18V14c0-1 .4-2.1 1.2-2.9l5.8-5.8A4 4 0 0 1 14.4 4h4.2c1 0 2.1.4 2.9 1.2l5.8 5.8a4 4 0 0 1 1.2 2.9V18c0 1-.4 2.1-1.2 2.9l-5.8 5.8a4 4 0 0 1-2.9 1.2h-4.2c-1 0-2.1-.4-2.9-1.2Z" fill="%230E6C50"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m7.7 23-2-2A4 4 0 0 1 4.5 18V14c0-1 .4-2.1 1.2-2.9l5.8-5.8A4 4 0 0 1 14.4 4h4.2c1 0 2.1.4 2.9 1.2l2 2A4 4 0 0 0 20.6 6h-4.2c-1 0-2.1.4-2.9 1.2L7.7 13A4 4 0 0 0 6.5 16V20c0 1 .4 2.1 1.2 2.9Z" fill="%23065D45"/%3e%3cpath d="M16.5 14h5.3a.4.4 0 0 1 .4.7L17.6 23a.6.6 0 0 1-1.1-.3v-4.8h-5.3a.4.4 0 0 1-.4-.6L15.4 9a.6.6 0 0 1 1.1.3v4.8Z" fill="%2325AB83"/%3e%3cpath d="M18.5 14h3.3-3.3Zm0 7.4-.9 1.6a.6.6 0 0 1-1.1-.3v-4.8h2v3.5Zm-5.3-3.5h-2a.4.4 0 0 1-.4-.6L15.4 9a.6.6 0 0 1 1.1.3v1.3l-3.7 6.7a.4.4 0 0 0 .4.6Z" fill="%2366C4A8"/%3e%3c/svg%3e');
    }
    .difficulty-4 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M1.4 10 10.6 1a3 3 0 0 1 2-.9h7.7a3 3 0 0 1 2.1.9l9.2 9.2c.6.5.9 1.3.9 2v7.7a3 3 0 0 1-.9 2.1l-9.2 9.2a3 3 0 0 1-2 .9h-7.7a3 3 0 0 1-2.1-.9L1.4 22a3 3 0 0 1-.9-2v-7.7c0-.8.3-1.6.9-2.1Z" fill="%23FFD63D"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M24.4 2.9a3 3 0 0 0-2-.9h-7.7a3 3 0 0 0-2.1.9L3.4 12a3 3 0 0 0-.9 2v7.7c0 .8.3 1.6.9 2.1l-2-2a3 3 0 0 1-.9-2v-7.7c0-.8.3-1.6.9-2.1L10.6.9a3 3 0 0 1 2-.9h7.7a3 3 0 0 1 2.1.9l2 2Z" fill="%23FFE999"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m11.8 27.1-6.4-6.4a3 3 0 0 1-.9-2.2v-5c0-.8.3-1.6.9-2.2L11.8 5A3 3 0 0 1 14 4h5a3 3 0 0 1 2.2.9l6.4 6.4c.6.6.9 1.4.9 2.2v5a3 3 0 0 1-.9 2.2L21.2 27a3 3 0 0 1-2.2.9h-5a3 3 0 0 1-2.2-.9Z" fill="%23FFA600"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m7.4 22.7-2-2a3 3 0 0 1-.9-2.2v-5c0-.8.3-1.6.9-2.2L11.8 5A3 3 0 0 1 14 4h5a3 3 0 0 1 2.2.9l2 2A3 3 0 0 0 21 6h-5a3 3 0 0 0-2.2.9l-6.4 6.4a3 3 0 0 0-.9 2.2v5c0 .8.3 1.6.9 2.2Z" fill="%23FE9600"/%3e%3cpath d="M16.5 18h-5.3a.4.4 0 0 1-.4-.7l5-9a.4.4 0 0 1 .7.3V14h5.3a.4.4 0 0 1 .4.6l-5 9a.4.4 0 0 1-.7-.3V18Z" fill="%23FFD63D"/%3e%3cpath d="M12.5 18h-1.3a.4.4 0 0 1-.4-.7l5-9a.4.4 0 0 1 .7.3v2l-4 7.3Zm6 3.4-1.2 2.2a.4.4 0 0 1-.8-.2V18h2v3.4Z" fill="%23FFE999"/%3e%3c/svg%3e');
    }
    .difficulty-5 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M1 10.4 11 .6a2 2 0 0 1 1.4-.6h8.4c.6 0 1 .2 1.4.6l9.8 9.8c.4.3.6.8.6 1.4v8.4c0 .6-.2 1-.6 1.4l-9.8 9.8a2 2 0 0 1-1.4.6h-8.4a2 2 0 0 1-1.4-.6L1 21.6a2 2 0 0 1-.6-1.4v-8.4c0-.6.2-1 .6-1.4Z" fill="%23FF7133"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M24.1 2.6a2 2 0 0 0-1.4-.6h-8.4a2 2 0 0 0-1.4.6L3 12.4a2 2 0 0 0-.6 1.4v8.4c0 .6.2 1 .6 1.4l-2-2a2 2 0 0 1-.6-1.4v-8.4c0-.6.2-1 .6-1.4L10.9.6a2 2 0 0 1 1.4-.6h8.4c.6 0 1 .2 1.4.6l2 2Z" fill="%23FFA27A"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M19.5 28h-6a2 2 0 0 1-1.4-.6l-7-7a2 2 0 0 1-.6-1.4v-6c0-.5.2-1 .6-1.4l7-7a2 2 0 0 1 1.4-.6h6c.5 0 1 .2 1.4.6l7 7c.4.4.6 1 .6 1.4v6c0 .5-.2 1-.6 1.4l-7 7a2 2 0 0 1-1.4.6Z" fill="%23CD5129"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m7 22.4-2-2a2 2 0 0 1-.5-1.4v-6c0-.5.2-1 .6-1.4l7-7a2 2 0 0 1 1.4-.6h6c.5 0 1 .2 1.4.6l2 2a2 2 0 0 0-1.4-.6h-6a2 2 0 0 0-1.4.6l-7 7a2 2 0 0 0-.6 1.4v6c0 .5.2 1 .6 1.4Z" fill="%23A64018"/%3e%3cpath d="M16.5 18v5.4a.4.4 0 0 0 .8.2l5-9.2a.2.2 0 0 0-.1-.3h-5.7V8.6a.4.4 0 0 0-.8-.2l-5 9.2a.2.2 0 0 0 .1.3h5.7Z" fill="%23FF7133"/%3e%3cpath d="m16.5 10.6-4 7.3h-1.7a.2.2 0 0 1-.1-.3l5-9.2a.4.4 0 0 1 .8.2v2ZM18.5 21.4l-1.2 2.2a.4.4 0 0 1-.8-.2V18h2v3.4Z" fill="%23FFA27A"/%3e%3c/svg%3e');
    }
    .difficulty-6 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M.5 21v-9.6c0-.3.1-.6.3-.7L11.2.3c.1-.2.4-.3.7-.3H21c.3 0 .6.1.7.3l10.4 10.4c.2.1.3.4.3.7v9.2c0 .3-.1.6-.3.7L21.8 31.7a1 1 0 0 1-.7.3H12a1 1 0 0 1-.7-.3L.5 21.1Z" fill="%23EA4040"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M23.8 2.3a1 1 0 0 0-.7-.3H14a1 1 0 0 0-.7.3L2.8 12.7a1 1 0 0 0-.3.7V23l-2-2v-9.7c0-.3.1-.6.3-.7L11.2.3c.1-.2.4-.3.7-.3H21c.3 0 .6.1.7.3l2 2Z" fill="%23F07979"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M20.3 28H13a1 1 0 0 1-.7-.3l-7.6-7.6a1 1 0 0 1-.3-.7v-6.8c0-.2.1-.5.3-.7l7.6-7.6c.2-.2.5-.3.7-.3H20c.2 0 .5.1.7.3l7.6 7.6c.2.2.3.5.3.7v6.8c0 .2-.1.5-.3.7l-8 7.9Z" fill="%23A92121"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m6.8 22-2-2a1 1 0 0 1-.3-.6v-6.8c0-.2.1-.5.3-.7l7.6-7.6c.2-.2.5-.3.7-.3H20c.2 0 .5.1.7.3l2 2a1 1 0 0 0-.7-.3H15a1 1 0 0 0-.7.3l-7.6 7.6a1 1 0 0 0-.3.7v6.8c0 .2.1.5.3.7Z" fill="%238D1313"/%3e%3cpath d="M16.5 18h-5.7a.2.2 0 0 1-.1-.4l5.4-10a.2.2 0 0 1 .4.2V14h5.7a.2.2 0 0 1 .1.3l-5.4 10a.2.2 0 0 1-.4-.2V18Z" fill="%23EA4040"/%3e%3cpath d="M12.5 18h-1.7a.2.2 0 0 1-.1-.4l5.4-10a.2.2 0 0 1 .4.2v2.8l-4 7.3Zm6 3.4-1.6 3a.2.2 0 0 1-.4-.2V18h2v3.4Z" fill="%23F07979"/%3e%3c/svg%3e');
    }
    .difficulty-7 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath d="M32.5 9.2V21c0 6-4.9 11-11 11h-10c-6.1 0-11-5-11-11V9.1a2 2 0 0 1 1.1-1.8l14-7a2 2 0 0 1 1.8 0l14 7.1c.7.4 1.1 1 1.1 1.8Z" fill="%23DE2752"/%3e%3cpath d="m32.5 9-13-6.8a2 2 0 0 0-1.9 0l-14 7.1a2 2 0 0 0-1 1.8L2.4 23c0 2.5.9 4.9 2.3 6.7A11 11 0 0 1 .5 21V9.1a2 2 0 0 1 1.1-1.8l14-7a2 2 0 0 1 1.8 0l14 7.1c.6.3 1 .9 1 1.5Z" fill="%23F06083"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m17.4 4.5 10 5c.7.4 1.1 1 1.1 1.8v8.5c0 4.5-3.7 8.2-8.2 8.2h-7.6a8.2 8.2 0 0 1-8.2-8.2v-8.5a2 2 0 0 1 1.1-1.8l10-5a2 2 0 0 1 1.8 0Z" fill="%23981241"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M21 6.3a2 2 0 0 0-1.4.2l-10 5a2 2 0 0 0-1 1.8l-.1 8.5c0 2.4 1 4.6 2.7 6-3.8-.7-6.7-4-6.7-8v-8.5a2 2 0 0 1 1.1-1.8l10-5a2 2 0 0 1 1.8 0l3.7 1.8Z" fill="%237A0E37"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M15.3 12.6a15 15 0 0 0-2.8 7.4c0 2.1 1.7 4 5 4s5-2.2 5-4.5c0-1.3-1-2.8-2.8-4.7a.4.4 0 0 0-.7.1l-.4 1.3a.4.4 0 0 1-.7.1l-2-3.7a.4.4 0 0 0-.6 0Z" fill="%236E092E"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="m21 20.5-.1.3c-.8 1.3-2.2 2.2-4.4 2.2-3.3 0-5-1.9-5-4 0-1.6.6-3.4 1.7-5.6a42.9 42.9 0 0 1 1.2-2c.2 0 .5 0 .6.2l1.9 3.7a.4.4 0 0 0 .7 0l.4-1.4a.4.4 0 0 1 .7-.1c1.9 1.9 2.8 3.4 2.8 4.7 0 .7-.2 1.4-.5 2Z" fill="%23FFAC33"/%3e%3cpath fill-rule="evenodd" clip-rule="evenodd" d="M15.6 12.8c-1.4 2.4-2.1 4.5-2.1 6.2 0 2 1.4 3.6 4 4h-1c-3.3 0-5-1.9-5-4a15 15 0 0 1 3-7.6c.1 0 .3 0 .4.2l.7 1.2Zm2.5 1c.2-.2.4-.2.6 0l1 1.1v.3a.4.4 0 0 1-.8.1l-.8-1.5Z" fill="%23FFC769"/%3e%3c/svg%3e');
    }
    .difficulty-8 {
        background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32"%3e%3cpath d="M.5 10.2a4 4 0 0 1 2.2-3.6l12-6.2a4 4 0 0 1 3.6 0l12 6.3a4 4 0 0 1 2.2 3.6v10.6a11 11 0 0 1-11 11.1h-10c-6.1 0-11-5-11-11V10.1Z" fill="%23946BE8"/%3e%3cpath d="M2.7 6.6a4 4 0 0 0-2.2 3.6v10.7c0 3.6 1.7 6.8 4.3 8.9a11.2 11.2 0 0 1-2.3-6.9V12.2a4 4 0 0 1 2.2-3.6l12-6.2a4 4 0 0 1 3.6 0l11.8 6.2a4 4 0 0 0-1.8-2L18.3.5a4 4 0 0 0-3.6 0l-12 6.2Z" fill="white" fill-opacity=".3"/%3e%3cpath d="M4.5 10.7v9.1c0 4.5 3.7 8.2 8.2 8.2h7.6c4.5 0 8.2-3.7 8.2-8.2v-9a1 1 0 0 0-.5-1L17 4.2a1 1 0 0 0-1 0L5 9.8a1 1 0 0 0-.5.9Z" fill="%234C38A9"/%3e%3cpath d="M4.5 19.8v-9.1a1 1 0 0 1 .6-1l11-5.5a1 1 0 0 1 .9 0l3.7 2a1 1 0 0 0-.6 0L9 11.8a1 1 0 0 0-.6.9v9.1a8.2 8.2 0 0 0 2.7 6 8.2 8.2 0 0 1-6.7-8Z" fill="%23210F5B" fill-opacity=".3"/%3e%3cpath d="M15.3 11c.4 4.2-3.8 5.6-3.8 9.3 0 2.5 2 4.7 6 4.7s6-2.6 6-5.2c0-2.4-1.4-4.7-4-6.1.4.8.2 1.7-.4 2.6a.4.4 0 0 1-.7-.1c-.6-2.7-1.6-4.5-3.1-5.2Z" fill="%231A0B4F" fill-opacity=".4"/%3e%3cpath d="M14.3 10c.4 4.2-3.8 5.6-3.8 9.3 0 2.5 2 4.7 6 4.7s6-2.6 6-5.2c0-2.4-1.4-4.7-4-6.1.4.8.2 1.7-.4 2.6a.4.4 0 0 1-.7-.1c-.6-2.7-1.6-4.5-3.1-5.2Z" fill="%23FF7133"/%3e%3cpath d="M12.3 15.1c1-1.4 2.2-2.9 2-5.1.7.4 1.3 1 1.8 1.8-.3 1.3-1 2.3-1.8 3.3-.9 1.3-1.8 2.5-1.8 4.2 0 2.3 1.7 4.3 5 4.6a8.3 8.3 0 0 1-1 .1c-4 0-6-2.2-6-4.7 0-1.7 1-3 1.8-4.2Zm8.3-.9a8.5 8.5 0 0 0-2-1.5c.3.7.6 1.5.8 2.5a.4.4 0 0 0 .7.1l.5-1Z" fill="%23E0FF00" fill-opacity=".3"/%3e%3c/svg%3e');
    }
</style>
