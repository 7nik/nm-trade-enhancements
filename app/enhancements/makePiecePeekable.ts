import type NM from "../utils/NMTypes";

import tippy from "tippy.js";
import addPatches from "../utils/patchAngular";
import type Services from "../utils/NMServices";

type Scope = angular.IScope & {
    piece: NM.Print,
    requestedSize: "medium" | "large" | "xlarge",
    width: number,
    height: number,
    fluid: boolean,
    isPublic: boolean,
    showLoading: boolean,
    isPackOpenPage: boolean,

    settVersion: 2|3,
    pieceClass: string,
    assetType: "image" | "video",
    sizeName: number,
    videoSources?: NM.Video["sources"],
    imageUrl: string,
    posterUrl: string,
    calcedWidth?: number | null,
    calcedHeight?: number | null,
    dimensionStyle: { width?: string, height?: string },
}

/**
 * Adds an alternative directive for displaying a piece which allows to see
 * the colored/animated version of a card by clicking and holding on it.
 */
addPatches(() => {
    // based on https://d1ld1je540hac5.cloudfront.net/_dev/angular-app/art/piece/piece-asset.directive.js
    angular.module("Art").directive("artPeekablePieceAsset", () => ({
        templateUrl: "partials/art/piece/piece-asset.partial.html",
        scope: {
            piece: "=artPeekablePieceAsset",
            requestedSize: "=?artSize",
            width: "=?artWidth",
            height: "=?artHeight",
            fluid: "=?artFluid",
            isPublic: "=?artPublic",
            showLoading: "=?artShowLoading",
            isPackOpenPage: "=?artPackOpenPage",
        },
        controller: [
            "$scope",
            "$element",
            "artPieceService",
            "artUser",
            "wsLumberjack",
            "artConstants",
            (
                $scope: Scope, 
                $elem: angular.IAugmentedJQuery, 
                artPieceService: Services.ArtPieceService, 
                artUser: Services.ArtUser, 
                wsLumberjack: Services.WsLumberjack, 
                artConstants: Services.ArtConstants,
            ) => {
                const adaptors = {
                    video: {
                        getSize: () => ($scope.requestedSize === "xlarge"
                            ? (!$scope.isPublic && hasPiece() ? "original" : "large")
                            : $scope.requestedSize),
                        isValid () {
                            try {
                                const canViewVideo = $scope.isPublic
                                    || (artUser.isAuthenticated() && hasPiece());
                                if (!canViewVideo) return false;

                                if (!$scope.fluid && this.getSize() && this.getData()) {
                                    return true;
                                }
                            } catch (ex) {
                                wsLumberjack.exception(ex as Error);
                            }
                            return false;
                        },
                        getData () { return $scope.piece.piece_assets.video?.[this.getSize()]; },
                    },
                    image: {
                        getSize: () => $scope.requestedSize,
                        isValid: () => true,
                        getData () { return $scope.piece.piece_assets.image[this.getSize()]; },
                    },
                };
                // used by Sett creator only
                const redrawAssetListener = $scope.$on("artRedrawAsset", (_, pieceId:number) => {
                    if ($scope.piece.id !== pieceId) return;
                    init();
                });

                function init () {
                    $scope.requestedSize = $scope.requestedSize || "large";
                    $scope.fluid = !!$scope.fluid;
                    $scope.isPublic = !!$scope.isPublic;
                    $scope.showLoading = $scope.showLoading !== false;
                    $scope.settVersion = artConstants.VERSION_TYPES.limited;

                    $scope.assetType = calcAssetType();
                    const adaptor = adaptors[$scope.assetType];

                    $scope.pieceClass = `piece-${$scope.assetType}`;
                    if (!$scope.isPublic && !hasPiece()) $scope.pieceClass += " gray-card";
                    if ($scope.assetType === "video" && adaptor.getSize() === "original") {
                        $scope.pieceClass += " original";
                    }

                    $scope.videoSources = [];
                    $scope.imageUrl = "";
                    $scope.posterUrl = "";

                    const pieceData = adaptor.getData();
                    if (!pieceData) return;

                    $scope.videoSources = adaptors.video.getData()?.sources;
                    $scope.imageUrl = adaptors.image.getData().url;
                    $scope.posterUrl = $scope.imageUrl;

                    ({
                        width: $scope.calcedWidth,
                        height: $scope.calcedHeight,
                    } = getDimensionSize(pieceData));
                    $scope.dimensionStyle = {
                        width: $scope.calcedWidth + "px",
                        height: $scope.calcedHeight + "px"
                    };
                }

                function calcAssetType () {
                    const adaptor = adaptors[$scope.piece.asset_type];
                    if (adaptor && adaptor.isValid()) return $scope.piece.asset_type;
                    return "image";
                }

                function getDimensionSize (data: { width: number, height: number }) {
                    const ratio = data.width / data.height;
                    let height;
                    let width;

                    if ($scope.fluid) return {};

                    if ($scope.width && $scope.height) {
                        if (ratio < $scope.width / $scope.height) {
                            height = $scope.height;
                            width = Math.ceil($scope.height * ratio);
                        } else {
                            width = $scope.width;
                            height = Math.ceil($scope.width / ratio);
                        }
                    } else if ($scope.height) {
                        height = $scope.height;
                        width = Math.ceil($scope.height * ratio);
                    } else if ($scope.width) {
                        width = $scope.width;
                        height = Math.ceil($scope.width / ratio);
                    } else {
                        width = data.width;
                        height = data.height;
                    }

                    width = Math.min(width, data.width);
                    height = Math.min(height, data.height);

                    return { width, height };
                }

                function hasPiece () { return artPieceService.hasPiece(artUser, $scope.piece); }

                init();

                if (!$scope.isPublic && !hasPiece()) {
                    const type = $scope.piece.piece_assets.video ? "animated" : "colored";
                    tippy($elem[0], {
                        content: `Press and hold to see the ${type} version`,
                        theme: "tooltip",
                    });

                    $elem.on("mousedown", (ev) => {
                        $scope.$apply(() => {
                            ev.preventDefault();
                            $scope.pieceClass = $scope.pieceClass.replace(" gray-card", "");
                            if ($scope.videoSources) {
                                if ($scope.videoSources[0].mime_type === "image/gif") {
                                    $scope.imageUrl = $scope.videoSources[0].url;
                                } else if (ev.button === 0) {
                                    $scope.assetType = "video";
                                }
                            }
                        });
                    });
                    $elem.on("mouseup", () => {
                        $scope.$apply(() => {
                            $scope.pieceClass += " gray-card";
                            if ($scope.videoSources) {
                                if ($scope.videoSources[0].mime_type === "image/gif") {
                                    $scope.imageUrl = $scope.posterUrl;
                                } else {
                                    $scope.assetType = "image";
                                }
                            }
                        });
                    });
                }

                $scope.$on("$destroy", () => {
                    redrawAssetListener();
                });
            },
        ],
    }));
}, {
    // replace directive with custom one
    names: ["partials/art/piece/piece.partial.html"],
    patches: [{
        target: `data-art-piece-asset="piece"`,
        replace: `data-art-peekable-piece-asset="piece"`,
    }],
});
