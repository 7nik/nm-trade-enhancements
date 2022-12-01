import type NM from "../utils/NMTypes";

import Collection from "../utils/Collection";
import NMApi from "../utils/NMApi";
import { liveListProvider } from "../utils/NMLiveApi";

// current active trades
let pendingTrades = new Collection<NM.TradeNotification>("pendingTrades");
// the auto-withdrawn trades
const hiddenTrades = new Collection<NM.TradeNotification>("hiddenTrades");

const notifications = liveListProvider("notifications")
    .on("init", (items) => {
        const minTime = items.length > 0
            ? new Date(items[items.length - 1].actor.time).getTime()
            : 0;
        // remove trades that go after the last notification
        hiddenTrades.remove((trade) => new Date(trade.actor.time).getTime() < minTime);
        if (hiddenTrades.count > 0) {
            // add the trade to notifications
            for (const trade of hiddenTrades) notifications.forceAddItem(trade);
        }
    });

/**
 * Show trade in notification if it was auto-withdrawn
 * @param {object} trade - Trade info
 */
function addAutoWithdrawnNotification (trade: NM.TradeNotification) {
    if (trade.verb_phrase !== "auto-withdrew") return;
    trade.read = false;
    hiddenTrades.add(trade);
    // add the trade to notifications
    notifications.forceAddItem(trade);
}

// synchronize added notification status when they get read
window.addEventListener("click", ({ target }) => {
    if (!target) return;
    // when clicked the notification
    const notifElem = (target as Element).closest("li.nm-notifications-feed--item");
    if (notifElem?.querySelector("[ng-bind-html='getVerbPhrase()']")
        ?.textContent?.startsWith("auto-withdrew")
    ) {
        const id = notifElem.firstElementChild!.id.replace("notification-", "");
        const notification = hiddenTrades.find(id);
        if (notification && !notification.read) {
            // replace trade with read copy to avoid side-effect and save
            hiddenTrades.add({ ...notification, read: true });
        }
    // when clicked "Mark all read"
    } else if ((target as Element).matches("a.text-link")) {
        // replace trades with read copies to avoid side-effect and save
        for (const trade of hiddenTrades) {
            if (!trade.read) hiddenTrades.add({ ...trade, read: true });
        }
    }
}, true);

liveListProvider("trades")
    .on("init", (trades) => {
        pendingTrades.remove(trades);
        for (const trade of pendingTrades) {
            NMApi.trade.get(trade.object.id, false).then(({ state }) => {
                trade.verb_phrase = state;
                addAutoWithdrawnNotification(trade);
            });
        }
        pendingTrades = new Collection("pendingTrades", trades);
    })
    .on("add", (trade) => {
        pendingTrades.add(trade);
    })
    .on("remove", (trade) => {
        pendingTrades.remove(trade);
        addAutoWithdrawnNotification(trade);
    });
