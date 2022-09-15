import type { SvelteComponent } from "svelte";
import type Services from "../utils/NMServices";
import type NM from "../utils/NMTypes";
// https://github.com/sveltejs/svelte/issues/5817
// import type { InitialData } from "../components/TradeWindow.svelte";

import TradeWindow from "../components/TradeWindow.svelte";
import addPatches from "../utils/patchAngular";
import NMApi from "../utils/NMApi";
import currentUser from "../services/currentUser";
import { debug } from "../utils/utils";
import config from "../services/config";

addPatches(() => {
    angular.module("nm.trades").run([
        "$rootScope",
        "nmTrades", 
        "pieceTraderClickTracker",
        "artOverlay",
        "artNotificationCenter",
        "artSubscriptionService",
        "artUser",
        "artConfirm",
        (
            $scope: angular.IScope,
            nmTrades: Services.NMTrade, 
            pieceTraderClickTracker: Services.PieceTraderClickTracker, 
            artOverlay: Services.ArtOverlay,
            artNotificationCenter: Services.ArtNotificationCenter,
            artSubscriptionService: Services.ArtSubscriptionService,
            artUser: Services.ArtUser,
            artConfirm: Services.ArtConfirm,
        ) => {
            /**
             * Show or hide the trade conversation
             * @param userId - the partner ID of conversation
             * @param show - show or hide
             */
            function showConversation(userId: number, show: boolean) {
                if (show) {
                    artNotificationCenter.show("conversation", {
                        recipient: userId,
                        conversationNavState: "trade"
                    });
                } else {
                    artNotificationCenter.hide();
                }
            }

            /**
             * Updates various user info and triggers showing or badges and other stuff
             * @param trade - completed trade
             */
            async function updateUserData (trade: NM.Trade) {
                if (artNotificationCenter.getNotificationsByType(config.TRADES_KEY).length > 0) {
                    artNotificationCenter.show(config.MESSAGES_KEY);
                } else {
                    artNotificationCenter.hide();
                }

                // _showBadges
                if (trade.badges && trade.badges.length > 0) {
                    for (let badge of trade.badges) {
                        if (badge.type === "all_pieces") {
                            badge.type = "all_rarity";
                        }
                    }
                    artSubscriptionService.broadcast("show-growl-notifications", trade.badges);
                    artSubscriptionService.broadcast("badge-achieved", trade.badges);
                }

                let rewards: {
                    message: string,
                    data: any,
                    rewardType: string,
                    okText?: string,
                    hasCloseBtn?: boolean,
                    parentClass?: string,
                    messageQueue?: any[],
                    callback?: (canceled: boolean) => void, 
                }[] = [];
                // _updateUserLevel
                if (trade.level_ups && trade.level_ups.length > 0) {
                    artUser.updateUserLevel(trade.level_ups[0]);
                    // _prepareLevelUpModelData
                    rewards = trade.level_ups.map((level) => artUser.areFeaturesGated() && level.new_features.length
                        ? {
                            rewardType: "gated-level-up",
                            message: "Congratulations",
                            okText: "FIND A SERIES",
                            data: level,
                            parentClass: "series-complete-reward",
                            hasCloseBtn: true,
                        } : {
                            rewardType: "level-up",
                            message: "Level Up!",
                            okText: "GREAT!",
                            data: level,
                            parentClass: "series-complete-reward",
                        });
                    // _showLevelUpModel
                    const gatedLevelUp = rewards.find((reward) => reward.rewardType === "gated-level-up");
                    if (gatedLevelUp) {
                        artConfirm.showEarnedStatus(gatedLevelUp);
                    }
                }
                if (trade.state !== "accepted") return;

                // sync owned cards - done in `ownedCards`

                if (trade.total_carats) artUser.updateUserCarats(trade.total_carats);

                // _showMilestoneRewardModal
                if (!trade.rewards?.length) return;
                const setts = await NMApi.user.suggestedSetts(currentUser.id, trade.rewards[0].sett.id);
                // _processSuggestionSet
                //   _prepareRewards
                trade.rewards.forEach((reward) => {
                    if (!artUser.areFeaturesGated()) {
                        rewards.push({
                            rewardType: "series-complete",
                            message: "Series Completed",
                            okText: "Claim Reward",
                            data: reward,
                        }, {
                            rewardType: "series-complete-reward",
                            message: "<div class='reward-carat-header'><span class='reward-header-msg'>Core Series Completed!</span></div>",
                            data: {
                                baseReward: reward.carats,
                                proBonus: reward.pro_bonus,
                                difficultyBonus: reward.difficulty_bonus,
                                totalReward: reward.total,
                                suggestedSett: setts,
                            },
                        });
                    } else {
                        rewards.push({
                            rewardType: "series-complete-beginner",
                            message: "Awesome Job!",
                            okText: "GREAT!",
                            data: reward,
                        });
                    }
                });
                if (rewards.length > 0) {
                    const [reward, ...rewardQueue] = rewards;
                    reward.messageQueue = rewardQueue;
                    reward.parentClass = "series-complete-reward";
                    artConfirm.showEarnedStatus(reward);
                }
            }

            let div: HTMLElement;
            let tw: SvelteComponent;

            nmTrades.loadTrade = (id: number) => {
                tw?.$destroy();
                div = document.querySelector(".nm-overlay-content")!;

                tw = new TradeWindow({
                    target: div,
                    props: {
                        tradeId: +id,
                        showConversation,
                        closeTrade: (backOrTrade: boolean | NM.Trade) => {
                            tw.$destroy();
                            $scope.$apply(() => artOverlay.hide());
                            // remove the query string
                            history.pushState(null, "", location.pathname);
                            if (typeof backOrTrade === "object") {
                                updateUserData(backOrTrade);
                            }
                        },
                    }
                });
                artOverlay.show("trade-modal");
            };

            nmTrades.createNewTrade = (bidder, responder, initialCardData) => {
                tw?.$destroy();
                div = document.querySelector(".nm-overlay-content")!;

                const pieceData = pieceTraderClickTracker.getPieceData();
                const backButtonText = pieceData.need ? "seekers" : pieceData.need === false ? "owners" : null;

                const youAreBidder = currentUser.id === bidder.id;
                const you = youAreBidder ? bidder : responder;
                const partner = youAreBidder ? responder : bidder;
                const sett = pieceData.piece && "set" in pieceData.piece ? pieceData.piece.set : pieceData.sett!;
                let initialData: {
                    side: "bidder"|"responder",
                    card: NM.Card | NM.Unmerged.Prints,
                    sett: { id: number, name: string },
                } | null = null;
                if (initialCardData) {
                    initialData = {
                        side: initialCardData.offerType === "bidder_offer" ? "bidder" : "responder",
                        card: pieceData.piece,
                        sett,
                    } 
                }

                tw = new TradeWindow({
                    target: div,
                    props: {
                        actors: { youAreBidder, you, partner, bidder, responder },
                        initialData,
                        backButtonText,
                        showConversation,
                        closeTrade: (backOrTrade: boolean | NM.Trade) => {
                            tw.$destroy();
                            $scope.$apply(() => artOverlay.hide());
                            // remove the query string
                            history.pushState(null, "", location.pathname);
                            // show the search list of trades
                            if (backOrTrade === true) {
                                const overlay = backButtonText === "seekers" ? "show-needers" : "show-owners";
                                // to help angular faster catch the changes
                                $scope.$apply(() => {
                                    artNotificationCenter.hide();
                                    artOverlay.show(overlay, {...pieceData}, true, 'theme-light');
                                });
                            } else if (typeof backOrTrade === "object") {
                                updateUserData(backOrTrade);
                            }
                        },
                    }
                });
                artOverlay.show("trade-modal");
            };

            debug("new trade window injected");
    }]);
}, {
    // there will be Svelte component so remove everything
    names: ["/static/common/trades/partial/trade-modal.html"],
    patches: [{
        target: /^.*$/g,
        replace: "",
    }],
});
