import type NM from "../utils/NMTypes";

import addPatches from "../utils/patchAngular";
import { debug } from "../utils/utils";

type Scope = angular.IScope & {
    pieces: NM.Print[],
    $parent: angular.IScope & {
        checklistCards: NM.Print[],
    },
}

/**
 * Add arrows on detailed card view on series page
 * Enable arrows on the detailed card view on the series page for
 * convenient navigation between cards.
 * Also, use the same order of cards as in the series checklist.
 */
addPatches((angular) => {
    // Add a directive for providing cards in the same order as in the series checklist
    angular.module("neonmobApp").directive("addChecklistOrderedCards", [() => ({
        scope: { pieces: "=addChecklistOrderedCards" },
        link: (scope: Scope) => {
            scope.$watch("pieces", () => {
                scope.$parent.checklistCards = scope.pieces?.slice()
                    .sort((a, b) => a.rarity.rarity - b.rarity.rarity);
            });
            debug("addChecklistOrderedCards initiated");
        },
    })]);
}, {
    // enable arrows on the detailed card view
    names: ["partials/art/sett-checklist-rarity-group.partial.html"],
    patches: [{
        target: `nm-show-piece-detail="piece" `,
        append: `nm-show-piece-detail-collection="pieces" `,
    }],
}, {
    // make cards order match with one in the series checklist
    names: ["partials/art/sett-checklist.partial.html"],
    patches: [{
        target: `id="sett-checklist" `,
        append: `add-checklist-ordered-cards="pieces" `,
    }, {
        target: `data-art-sett-checklist-rarity-group="pieces"`,
        replace: `data-art-sett-checklist-rarity-group="checklistCards"`,
    }],
});
