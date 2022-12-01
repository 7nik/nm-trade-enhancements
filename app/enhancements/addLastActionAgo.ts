import NMApi from "../utils/NMApi";
import addPatches from "../utils/patchAngular";

type Scope = angular.IScope & {
    userId: number,
    lastActionAgo: string,
}

function setLastActionAgo (scope: Scope) {
    scope.lastActionAgo = "...";
    NMApi.user.activityFeed(scope.userId).then((actions) => {
        const lastActionAgo = actions[0]?.created ?? "one eternity ago";
        scope.$apply(() => { scope.lastActionAgo = lastActionAgo; });
    });
}

addPatches(() => {
    angular.module("Art").directive("lastAction", [() => ({
        scope: { userId: "=lastAction" },
        link: (scope: Scope) => {
            setLastActionAgo(scope);
            scope.$watch("userId", () => setLastActionAgo(scope));
        },
        template: "last action: <i>{{lastActionAgo}}</i>",
    })]);
}, {
    names: ["partials/art/notifications/conversation.partial.html"],
    patches: [{
        target: "</h3>",
        prepend: `<div class="last-action" last-action="recipient.id"></div>`,
    }],
});
