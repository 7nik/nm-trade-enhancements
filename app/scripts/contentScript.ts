import "../styles/contentScript.css";

// add `scripts/pageScript.js` to the page context
// it needs access to globals `angular` and `NM` 
const script = document.createElement("script");
script.src = chrome.runtime.getURL('scripts/pageScript.js');
(document.head || document.documentElement).append(script);
