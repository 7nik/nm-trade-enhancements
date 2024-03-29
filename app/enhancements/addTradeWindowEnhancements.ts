/* eslint-disable sonarjs/no-duplicate-string */
import type Services from "../utils/NMServices";
import type NM from "../utils/NMTypes";
import type { SvelteComponent } from "svelte";
// https://github.com/sveltejs/svelte/issues/5817
// import type { InitialData } from "../components/TradeWindow.svelte";

import TradeWindow from "../components/TradeWindow.svelte";
import config from "../services/config";
import currentUser from "../services/currentUser";
import NMApi from "../utils/NMApi";
import { liveListProvider } from "../utils/NMLiveApi";
import addPatches from "../utils/patchAngular";
import { debug } from "../utils/utils";

addPatches((angular) => {
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
        // eslint-disable-next-line sonarjs/cognitive-complexity
        ) => {
            let tradeWindow: SvelteComponent;

            /**
             * Show or hide the trade conversation
             * @param userId - the partner ID of conversation
             * @param show - show or hide
             */
            function showConversation (userId: number, show: boolean) {
                // to prevent error about still being in $digest
                setTimeout(() => $scope.$apply(() => {
                    if (show) {
                        artNotificationCenter.show("conversation", {
                            recipient: userId,
                            conversationNavState: "trade",
                        });
                    } else {
                        artNotificationCenter.hide();
                    }
                }));
            }

            /**
             * Updates various user info and triggers showing or badges and other stuff
             * @param backOrTrade - completed trade or flag about returning to previous window
             */
            async function closeTrade (
                backOrTrade: boolean | NM.Trade,
                overlayName = "",
                overlayData?: object,
            ) {
                tradeWindow.$destroy();
                // remove the query string
                window.history.pushState(null, "", window.location.pathname);

                $scope.$apply(() => {
                    if (overlayName && backOrTrade === true) {
                        artOverlay.show(overlayName, overlayData, true, "theme-light");
                    } else {
                        artOverlay.hide();
                    }

                    if (!artNotificationCenter.getState()) return;
                    if (artNotificationCenter
                        .getNotificationsByType(config.TRADES_KEY)
                        .length > 0
                    ) {
                        artNotificationCenter.show(config.MESSAGES_KEY);
                    } else {
                        artNotificationCenter.hide();
                    }
                });

                if (typeof backOrTrade !== "object") return;
                const trade = backOrTrade;

                // _showBadges
                if (trade.badges && trade.badges.length > 0) {
                    for (const badge of trade.badges) {
                        if (badge.type === "all_pieces") {
                            badge.type = "all_rarity";
                        }
                    }
                    artSubscriptionService.broadcast("show-growl-notifications", trade.badges);
                    artSubscriptionService.broadcast("badge-achieved", trade.badges);
                }

                let rewards: Parameters<Services.ArtConfirm["showEarnedStatus"]>["0"][] = [];
                // _updateUserLevel
                if (trade.level_ups && trade.level_ups.length > 0) {
                    artUser.updateUserLevel(trade.level_ups[0]);
                    // _prepareLevelUpModelData
                    rewards = trade.level_ups.map((level) => (
                        artUser.areFeaturesGated() && level.new_features.length > 0
                            ? {
                                rewardType: "gated-level-up",
                                message: "Congratulations",
                                okText: "FIND A SERIES",
                                data: level,
                                parentClass: "series-complete-reward",
                                hasCloseBtn: true,
                            }
                            : {
                                rewardType: "level-up",
                                message: "Level Up!",
                                okText: "GREAT!",
                                data: level,
                                parentClass: "series-complete-reward",
                            }));
                    // _showLevelUpModel
                    const gatedLevelUp = rewards
                        .find((reward) => reward.rewardType === "gated-level-up");
                    if (gatedLevelUp) {
                        artConfirm.showEarnedStatus(gatedLevelUp);
                    }
                }
                if (trade.state !== "accepted") return;

                // sync owned cards - done in `ownedCards`

                if (trade.total_carats) artUser.updateUserCarats(trade.total_carats);

                // _showMilestoneRewardModal
                if (!trade.rewards?.length) return;
                const setts = await NMApi.user.suggestedSetts(
                    currentUser.id,
                    trade.rewards[0].sett.id,
                );
                // _processSuggestionSet
                //   _prepareRewards
                for (const reward of trade.rewards) {
                    if (artUser.areFeaturesGated()) {
                        rewards.push({
                            rewardType: "series-complete-beginner",
                            message: "Awesome Job!",
                            okText: "GREAT!",
                            data: reward,
                        });
                    } else {
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
                    }
                }
                if (rewards.length > 0) {
                    const [reward, ...rewardQueue] = rewards;
                    reward.messageQueue = rewardQueue;
                    reward.parentClass = "series-complete-reward";
                    artConfirm.showEarnedStatus(reward);
                }
            }

            nmTrades.loadTrade = (id: number) => {
                tradeWindow?.$destroy();
                const div = document.querySelector(".nm-overlay-content")!;

                tradeWindow = new TradeWindow({
                    target: div,
                    props: {
                        initialData: { tradeId: +id },
                        showConversation,
                        closeTrade,
                    },
                });
                artOverlay.show("trade-modal");
            };

            nmTrades.createNewTrade = (bidder, responder, initialCardData) => {
                tradeWindow?.$destroy();
                const div = document.querySelector(".nm-overlay-content")!;

                const pieceData = pieceTraderClickTracker.getPieceData();
                const backButtonText = pieceData.need
                    ? "seekers"
                    : (pieceData.need === false ? "owners" : null);
                const overlayName = pieceData.need
                    ? "show-needers"
                    : (pieceData.need === false ? "show-owners" : "");

                const youAreBidder = currentUser.id === bidder.id;
                const actors = {
                    youAreBidder,
                    bidder,
                    responder,
                    you: youAreBidder ? bidder : responder,
                    partner: youAreBidder ? responder : bidder,
                };

                const initialData = initialCardData
                    ? {
                        actors,
                        side: initialCardData.offerType === "bidder_offer" ? "bidder" : "responder",
                        card: pieceData.piece,
                        sett: pieceData.piece && "sett_id" in pieceData.piece
                            ? {
                                id: pieceData.piece.sett_id,
                                name: pieceData.piece.sett_name,
                            }
                            : (pieceData.piece && "set" in pieceData.piece
                                ? pieceData.piece.set
                                : pieceData.sett!),
                    }
                    : { actors };

                tradeWindow = new TradeWindow({
                    target: div,
                    props: {
                        initialData,
                        backButtonText,
                        showConversation,
                        closeTrade (backOrTrade: boolean | NM.Trade) {
                            closeTrade(backOrTrade, overlayName, pieceData);
                        },
                    },
                });
                artOverlay.show("trade-modal");
            };

            // if we are on a series page of a card from the accepted trade,
            // send a signal to re-render the page to display the changes
            liveListProvider("trades").on("remove", async (tradeEvent) => {
                if (tradeEvent.verb_phrase !== "accepted") return;
                const trade = await NMApi.trade.get(tradeEvent.object.id);
                const seriesNames = trade.bidder_offer.prints.concat(trade.responder_offer.prints)
                    .map((print) => print.sett_name);
                const currentSeries = document.querySelector(".set-header--title a")
                    ?.textContent?.trim();
                if (seriesNames.includes(currentSeries!)) {
                    artSubscriptionService.broadcast("trade-accepted", tradeEvent);
                }
            });

            debug("new trade window injected");
        },
    ]);
}, {
    // there will be Svelte component so remove everything
    names: ["/static/common/trades/partial/trade-modal.html"],
    patches: [{
        target: /^.*$/g,
        replace: "",
    }],
});
