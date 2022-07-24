import type NM from "../utils/NMTypes";

import Collection from "../utils/Collection";
import NMApi from "../utils/NMApi";
import { getScope } from "../utils/utils";

/**
 * Add notifications of auto-withdrawn trades
 */
 function fixAutoWithdrawnTrade () {
    if (typeof io === "undefined") {
        setTimeout(fixAutoWithdrawnTrade, 100);
        return;
    }

    // current active trades
    let pendingTrades = new Collection<NM.TradeEvent>("pendingTrades");
    // the auto-withdrawn trades
    const hiddenTrades = new Collection<NM.TradeEvent>("hiddenTrades");
    const socketNotif = io.connect(
        "https://napi.neonmob.com/notifications",
        // @ts-ignore
        { transports: ["websocket"] },
    );

    /**
     * Show trade in notification if it was auto-withdrawn
     * @param {object} trade - Trade info
     */
    function addAutoWithdrawnNotification (trade: NM.TradeEvent) {
        if (trade.verb_phrase !== "auto-withdrew") return;
        trade.read = false;
        hiddenTrades.add(trade);
        // add the trade to notifications
        socketNotif.listeners("addItem")[0]?.(trade);
    }

    socketNotif.on("loadInitial", ({ results: notifications } : { results: NM.Event<{},string,string>[] }) => {
        const minTime = new Date(notifications[notifications.length - 1].actor.time).getTime();
        // remove trades that go after the last notification
        hiddenTrades.remove((trade) => new Date(trade.actor.time).getTime() < minTime);
        if (hiddenTrades.count > 0) {
            // add the trade to notifications
            const [addItem] = socketNotif.listeners("addItem");
            if (addItem) {
                hiddenTrades.forEach((trade) => addItem(trade));
            } else {
                notifications.push(...hiddenTrades);
            }
        }
    });

    let firstTime = true;
    NMApi.trade.onTradesAdded((trades) => {
        if (firstTime) {
            pendingTrades.remove(trades);
            pendingTrades.forEach(async (trade) => {
                trade.verb_phrase = (await NMApi.trade.get(trade.object.id, false)).state;
                addAutoWithdrawnNotification(trade);
            });
            pendingTrades = new Collection("pendingTrades", trades);
        } else {
            pendingTrades.add(trades);
        }
    });
    NMApi.trade.onTradeRemoved(trade => {
        pendingTrades.remove(trade);
        addAutoWithdrawnNotification(trade);
    });

    // synchronize added notification status when they get read
    window.addEventListener("click", ({ target }) => {
        if (!target) return;
        // when clicked the notification
        const notifElem = (target as Element).closest("li.nm-notifications-feed--item");
        if (notifElem) {
            const { notification } = getScope<{ notification:NM.TradeEvent }>(notifElem as HTMLElement);
            if (notification.verb_phrase === "auto-withdrew") {
                if (notification.read) return;
                // replace trade with read copy to avoid side-effect and save
                hiddenTrades.add({ ...notification, read: true });
            }
        // when clicked "Mark all read"
        } else if ((target as Element).matches("a.text-link")) {
            // replace trades with read copies to avoid side-effect and save
            hiddenTrades.forEach((trade) => {
                if (!trade.read) hiddenTrades.add({ ...trade, read: true });
            });
        }
    }, true);
}

fixAutoWithdrawnTrade();
