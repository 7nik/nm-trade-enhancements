import type NM from "./NMTypes";
import { loadValue, saveValue } from "./storage";
import NMAPI from "./NMApi";

/**
 * Wrapper of trade object
 */
 export default class Trade {
    id: number
    state: NM.Trade["state"]
    you: NM.User
    yourOffer: NM.PrintInTrade[]
    partner: NM.User
    partnerOffer: NM.PrintInTrade[]
    /**
     * Wrapper for trade info object
     * @param  {NM.Trade} trade - Trade info object
     */
    constructor (trade: NM.Trade) {
        this.id = trade.id;
        this.state = trade.state;
        const youAreBidder = trade.bidder.id === NM.you.attributes.id;
        this.you = youAreBidder ? trade.bidder : trade.responder;
        this.yourOffer = youAreBidder ? trade.bidder_offer.prints : trade.responder_offer.prints;
        this.yourOffer.reverse().sort((a, b) => b.rarity.rarity - a.rarity.rarity);
        this.partner = youAreBidder ? trade.responder : trade.bidder;
        this.partnerOffer = youAreBidder ? trade.responder_offer.prints : trade.bidder_offer.prints;
        this.partnerOffer.reverse().sort((a, b) => b.rarity.rarity - a.rarity.rarity);
    }

    /**
     * Creates the trade preview
     * @return {HTMLElement} Element with trade preview
     */
    makeTradePreview (highlightCardId?: number): HTMLAnchorElement {
        const a = document.createElement("a");
        a.className = "trade-preview";
        a.href = `?view-trade=${this.id}`;
        a.innerHTML = `
            <div class="trade-preview--give">
                <div class="trade-preview--heading small-caps">You will give</div>
                ${this.yourOffer.map(Trade.makeThumb).join("")}
            </div>
            <div class="trade-preview--get">
                <div class="trade-preview--heading small-caps">${this.partner.name} will give</div>
                ${this.partnerOffer.map(Trade.makeThumb).join("")}
            </div>
            <div class="btn small trade-preview--action">View Trade</div>`;
        // @ts-ignore
        a.addEventListener("click", () => a._tippy?.hide());

        if (highlightCardId) {
            const card = a.querySelector(`[data-print-id="${highlightCardId}"`);
            if (card) card.classList.add("highlight-card");
        }

        return a;
    }

    /**
     * Creates small thumbnail of a print
     * @param  {NM.PrintInTrade} print - Print for thumbnailing
     * @return {string} HTML code of the thumbnail
     */
    static makeThumb (print: NM.PrintInTrade): string {
        return `
        <span class="trade-preview--print" data-print-id="${print.id}">
            <div class="piece small fluid">
                <figure class="front">
                    <img class="asset" src="${print.piece_assets.image.small.url}">
                    <span class="piece-info">
                        <i class="i tip ${print.rarity.class}"></i>
                    </span>
                </figure>
            </div>
        </span>`;
    }

    /**
     * Gets and caches info about a trade by its id
     * @param  {number} tradeId - Trade id
     * @param  {boolean} [useCache=true] - May use cache or forcely do request
     * @return {Promise<Trade>} trade info
     */
    static async get (tradeId: number, useCache: boolean = true): Promise<Trade> {
        if (!Trade.cache[tradeId] || !useCache) {
            Trade.cache[tradeId] = await NMAPI.trade.get(tradeId);
            saveValue("tradesCache", Trade.cache);
        }
        return new Trade(Trade.cache[tradeId]);
    }

    static cache: Record<number, NM.Trade> & { minDate: number } = (() => {
        const trades = loadValue<typeof Trade.cache>("tradesCache", { minDate: 0 });
        // remove outdated trades
        Reflect.ownKeys(trades).forEach((id) => {
            if (id === "minDate") return;    
            if (new Date(trades[Number(id)].expire_date).getTime() < trades.minDate) {
                delete trades[Number(id)];
            }
        });
        return trades;
    })()
}
