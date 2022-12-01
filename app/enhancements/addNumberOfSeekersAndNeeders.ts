import addPatches from "../utils/patchAngular";

/**
 * Adds a tip which allows to see the total number of
 * needers/seekers of a card
 */

addPatches(null, {
    names: ["partials/trade/piece-trader-list.partial.html"],
    patches: [{
        target: /span\s+data-ng-pluralize([^}]*)}} (Owners|Collectors)/g,
        replace: (_, p1, p2) => `span
            class="tip"
            title="{{itemData.count}} ${p2}"
            data-ng-pluralize${p1}}} ${p2}`,
    }],
});
