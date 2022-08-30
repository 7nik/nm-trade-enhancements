import type NM from "../utils/NMTypes";
import type Services from "../utils/NMServices";

import addPatches from "../utils/patchAngular";
import PrintAsset from "../components/parts/PrintAsset.svelte";
import { error } from "../utils/utils";

type Scope = angular.IScope & {
    piece: NM.Print,
    requestedSize: "medium" | "large" | "xlarge",
    width: number,
    height: number,
    fluid: boolean,
    isPublic: boolean,
    showLoading: boolean,
    isPackOpenPage: boolean,
}

/**
 * Adds an alternative directive for displaying a piece which allows to see
 * the colored/animated version of a card by clicking and holding on it.
 */
addPatches(() => {
    angular.module("Art").directive("artPeekablePieceAsset", () => ({
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
            (
                $scope: Scope, 
                $elem: angular.IAugmentedJQuery,
            ) => {

                if ($scope.showLoading) {
                    error("showLoading option is on");
                }

                new PrintAsset({
                    target: $elem[0],
                    props: {
                        print: $scope.piece,
                        size: $scope.requestedSize ?? "large",
                        maxWidth: $scope.width ?? 0,
                        maxHeight: $scope.height ?? 0,
                        hideIcons: $scope.isPackOpenPage ?? false,
                        isPublic: $scope.isPublic ?? false,
                        setSize: $scope.fluid !== true,
                    },
                });
            },
        ],
    }));
    // make artPieceDetailService preload right images by patching the following method
    angular.module("Art").run([
        "artPieceService",
        "ImageService",
        (artPieceService: Services.ArtPieceService, ImageService: Services.ImageService) => {
            artPieceService.preloadImages = function (user, pieces, size) {
                return ImageService.preloadAll(this.getImageUrls(user, pieces, size, true))
            }
        },
    ]);
}, {
    // replace directive with custom one
    names: ["partials/art/piece/piece.partial.html"],
    patches: [{
        target: `data-art-piece-asset="piece"`,
        replace: `data-art-peekable-piece-asset="piece"`,
    }],
});
