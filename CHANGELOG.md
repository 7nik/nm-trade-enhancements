# NeonMob Trade Enhancements changelog

## 3.1.4
* Fixed breakage of the production build

## 3.1.3
* Styles are encapsulated
* Filter name aren't capitalized anymore
* The incomplete series filter now is a separated filter
* Trade window: if the card involved in a trade, but not this print,
now it will have the icon but faded
* Implemented reward windows
* Fixed failed start in some cases
* Various fixes
* Switched bundler for the userscript to rollup,
replace `moment` with `dayjs` and `tippy.js` with `@floating-ui` - now the generated code is smaller up to twice
* ESLint is now applied :(

## 3.1.2
* Improved the card search performance in the trade window
* Removed sequential processing of network requests
* Speeded up mass wishlisting and unwishlisting

## 3.1.1
* Implemented the sidebar, but not include in the US as it provides nothing new
* Various fixes
* Code improvements

## 3.1.0
* Implemented and injected the entire trade window
* MutationSummary isn't used anymore
* No dependency on the angular scope anymore
* Various fixes

## 3.0.0
It's a code of https://github.com/7nik/userscripts/blob/4b217c874b0703502126eb1e3e591cd8b6e22204/NM%20trade%20enhancement.user.js
which was moved to TS, split into modules and the project was set up to
compile as both userscript and webextension.
Now it seem to successfully compile with the same behavior as the original

## before 3.0.0
Changelog of changes in the previous versions is in [the NeonMob Forum](https://forum.neonmob.com/t/userscript-trade-enhancements/4535/2).
