import type NM from "../utils/NMTypes";

import OwnedCards from "../services/ownedCards";
import addPatches from "../utils/patchAngular";
import { loadValue } from "../utils/storage";

type Scope = angular.IScope & {
    print: NM.Print,
    $parent: {
        user: NM.User,
    },
}

/**
 * On the series page replace the checkmark with
 * the number of owned prints if it's 2 or more.
 */
if (loadValue("replaceCheckmark", false)) {
    addPatches((angular) => {
        // Add a directive for providing number of owned prints
        angular.module("neonmobApp").directive("addPrintCount", [() => ({
            scope: { print: "=addPrintCount" },
            link: (scope: Scope, elem) => {
                const unsubscribe = new OwnedCards(scope.$parent.user.id)
                    .getPrintCount(scope.print.id, true)
                    .subscribe((count) => elem.attr("data-count", count));
                scope.$on("$destroy", () => {
                    unsubscribe();
                });
            },
        })]);
    }, {
        // inject the directive
        names: ["partials/art/sett-checklist-rarity-group.partial.html"],
        patches: [{
            target: `"{ 'icon-checkmark': isOwned(piece), 'icon-unowned': !isOwned(piece)}"`,
            append: ` add-print-count="piece"`,
        }],
    });
}
