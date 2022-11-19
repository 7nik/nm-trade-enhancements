// moment.defineLocale("nm-base", {
//     parentLocale: "en",
//     relativeTime: {
//         future: "just now",
//         past: "%s",
//         s: "just now",
//         m: "just now",
//         mm: "%d minutes ago",
//         h: "1 hour ago",
//         hh: "%d hours ago",
//         d: "1 day ago",
//         dd: "%d days ago",
//         M: "1 month ago",
//         MM: "%d months ago",
//         y: "1 year ago",
//         yy: "%d years ago",
//     },
// });

// moment.defineLocale("nm-medium", {
//     parentLocale: "en",
//     relativeTime: {
//         future: "just now",
//         past: "%s",
//         s: "just now",
//         m: "just now",
//         mm: "%d min ago",
//         h: "1 hour ago",
//         hh: "%d hours ago",
//         d: "1 day ago",
//         dd: "%d days ago",
//         M: "1 month ago",
//         MM: "%d months ago",
//         y: "1 year ago",
//         yy: "%d years ago",
//     },
// });

// moment.defineLocale("nm-condense", {
//     parentLocale: "en",
//     relativeTime: {
//         future: "now",
//         past: "%s",
//         s: "now",
//         m: "now",
//         mm: "%d mins",
//         h: "1 hr",
//         hh: "%d hrs",
//         d: "1 day",
//         dd: "%d days",
//         M: "1 mon",
//         MM: "%d mos",
//         y: "1 yr",
//         yy: "%d yrs",
//     },
// });

// moment.defineLocale("nm-til", {
//     parentLocale: "en",
//     relativeTime: {
//         future: "%s",
//         past: "0 minutes left",
//         s: "less than 1 minute left",
//         m: "less than 1 minute left",
//         mm: "%d minutes left",
//         h: "1 hour left",
//         hh: "%d hours left",
//         d: "1 day left",
//         dd: "%d days left",
//         M: "1 month left",
//         MM: "%d months left",
//         y: "1 year left",
//         yy: "%d years left",
//     },
// });

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime, {
    thresholds: [
        { l: 'm', r: 1 },
        { l: 'mm', r: 59, d: 'minute' },
        { l: 'h', r: 1 },
        { l: "hh", r: 71, d: "hour" },
        { l: 'd', r: 1 },
        { l: 'dd', r: 29, d: 'day' },
        { l: 'M', r: 1 },
        { l: 'MM', r: 11, d: 'month' },
        { l: 'y' },
        { l: 'yy', d: 'year' },
    ],
});
// load and set locale for NM
const locale = {
    name: "nm-relative",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    formats: {},
    relativeTime: {
        future: "%s left",
        past(out: string) {
            if (!out || out.includes("now")) return out;
            return `${out} ago`;
        },
        m(n:number, _withoutSuffix:boolean, _key:string, isFuture:boolean) {
            return isFuture
                ? n ? "less than 1 minute" : "0 minutes"
                : "just now";
        },
        mm: "%d minutes",
        h: "1 hour",
        hh: "%d hours",
        d: "1 day",
        dd: "%d days",
        M: "1 month",
        MM: "%d months",
        y: "1 year",
        yy: "%d years",
    },
};
// @ts-ignore - ILocale doesn't supports functions in relativeTime
dayjs.locale(locale)

// function toPluralize (val: number, str: string) {
//     return (val<=1 ? str : str+'s')
// }

// function formDiscontStr (inDays: number, inHours: number, inMins: number, inMonths: number) {
//     if(inMins >= 1  && inMins < 60) {
//         return inMins + ' ' + toPluralize(inMins, 'minute');
//     }
//     else if(inHours >= 1 && inHours < 24) {
//         return inHours + ' ' + toPluralize(inHours, 'hour');
//     }
//     else if(inDays >= 1 && inDays < 11) {
//         return inDays + ' ' + toPluralize(inDays, 'day');
//     }
//     return false;
// }

// function findDiff (startDate: moment.Moment, endDate: moment.Moment) {
//     const inDays = Math.round(endDate.diff(startDate, 'days', true));
//     const inHours = Math.round(endDate.diff(startDate, 'hours', true));
//     const inMins = Math.round(endDate.diff(startDate, 'minutes', true));
//     const inMonths = Math.round(endDate.diff(startDate, 'months', true));
//     return formDiscontStr(inDays, inHours, inMins, inMonths);
// }

// /**
//  * Text representation of time passed since the given time
//  * @param time - the target time
//  * @param baseTime - the current time, default - now
//  * @param isCondensed - use condensed format, no by default
//  */
// export function timeAgo (time: string, baseTime?: string, isCondensed = false) {
//     moment.locale(isCondensed ? "nm-condense" : "nm-base");
//     return baseTime
//         ? moment(time).from(baseTime)
//         : moment(time).fromNow();
// }

// /**
//  * Text representation of time til the given time
//  * @param time - the target time
//  * @param isCondensed - use condensed format, no by default
//  * @param hourToDate - amount of hours before switching to days, default - 72
//  */
// export function timeTil (time: string, isCondensed = false, hourToDate = 72) {
//     moment.locale(isCondensed ? "nm-condense" : "nm-til");
//     moment.relativeTimeThreshold('h', hourToDate);
//     return moment().to(time);
// }

/**
 * Text timestamp of now
 */
export function timestampNow () {
    return dayjs().format();
}

export default dayjs;
