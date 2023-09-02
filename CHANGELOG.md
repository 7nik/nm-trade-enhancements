# NeonMob Trade Enhancements changelog

## 3.3.2
* Improve compatibility with touch devices

## 3.3.1
* Fixed not running in Safari (old version only?)
* Fixed not playing animated cards in some cases
* Fixed stopping to load cards in some cases
* Fixed not updating active filters at the first change
* Now the collection page will be updated if
one of its cards is involved in an accepted trade

## 3.3.0
* Added optional replacing the checkmark on
the series page with the number of owned cards (#3)
* Fixed not finding cards of non-collected series when the series is chosen
* Misc UI improvements

## 3.2.4
* Fixed crashing on the redeem page
* Fixed not displaying the number of print copies in some cases

## 3.2.3
* Fixed crashing during parsing configs with notifications (tips)

## 3.2.1
* Fixed initialization of traded cards filter with wrong value
* Fixed initialization of filter set selector on the partner side with no selected value

## 3.2.0
* Trade window: added favorite cards filter
* Trade window: added favorite series filter
* Trade window: added ability to search by cards used in trades
* Trade window: added a message when no matching series
* Fixed not switching filter set in rare cases
* Fixed asking to log in when no need
* Various

## 3.1.6
* Fixed progress tooltip size
* Fixed issue #1: crashing when trading a card from
the Cards section on profile page

## 3.1.5
* Fixed position of the filter menu on "small" screens

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
