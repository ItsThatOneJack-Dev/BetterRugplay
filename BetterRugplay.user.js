// ==UserScript==
// @name         BetterRugplay
// @namespace    https://itoj.dev
// @version      3.2.0
// @description  Take over the virtual crypto exchange!
// @copyright    Copyright (C) 2025 ItsThatOneJack
// @author       ItsThatOneJack
// @match        *://rugplay.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rugplay.com
// @grant        GM_log
// @supportURL   https://github.com/ItsThatOneJack-Dev/BetterRugplay/issues
// @updateURL    https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/BetterRugplay.user.js
// @downloadURL  https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/BetterRugplay.user.js
// @require      https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/UpdateChecker.user.js
// @require      https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/TooltipSupport.user.js
// @require      https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/URLChangeDetector.user.js
// @require      https://cdn.jsdelivr.net/npm/json5@2/dist/index.min.js
// ==/UserScript==

// NOTE: It is not required to run anything from TooltipSupport, as required modules run as an extension to the main code.
//       Because of this, it will behave like two userscripts are running, unless a blocking action is performed.
//       So, it being required simply combines the functions of this userscript and it.

// COPYRIGHT: Copyright (C) 2025 ItsThatOneJack
//            This work is licensed to you under the terms of the GNU General Public License, version 3.0 or any later version.
//            ... at your decision.
//
//            Failiure to comply with the terms of the GNU GPL license upon this work will result in a Cease & Desist.

// ESLint explicit variable definitions.
/* global JSON5 */
/* global URLChangeDetector */
/* global UpdateChecker */

let Log = GM_log;

if (typeof URLChangeDetector === 'undefined') {
    throw new Error("URLObserver class is undefined. Is it correctly imported and up to date?");
    return;
}
if (typeof UpdateChecker === 'undefined') {
    throw new Error("UpdateChecker class is undefined. Is it correctly imported and up to date?");
    return;
}

function GetByXPath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}
function WaitForElement(XPath) {
    return new Promise((resolve) => {
        const element = GetByXPath(XPath);
        if (element) {
            resolve(element);
            return;
        }
        const observer = new MutationObserver(() => {
            const element = GetByXPath(XPath);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

class DOMInjector {
    constructor() {
        this.isReady = false;
        this.readyCallbacks = [];
        this.init();
    }
    init() {
        if (document.readyState === 'complete') {
            this.setReady();
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.setReady();
                }, 250);
            });
        }
    }
    setReady() {
        this.isReady = true;
        this.readyCallbacks.forEach(callback => callback());
        this.readyCallbacks = [];
    }
    onReady(callback) {
        if (this.isReady) {
            callback();
        } else {
            this.readyCallbacks.push(callback);
        }
    }
    findElementByXPath(xpath) {
        return new Promise((resolve) => {
            const existing = GetByXPath(xpath);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const found = GetByXPath(xpath);
                if (found) {
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    findElementBySelector(selector) {
        return new Promise((resolve) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const found = document.querySelector(selector);
                if (found) {
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    async injectHTML(htmlContent, targetXPath, options = {}) {
        const {
            position = 'append', // "append", "prepend", "before", or "after"
            preventDuplicates = true,
            duplicateIdentifier = null
        } = options;
        try {
            await new Promise(resolve => this.onReady(resolve));
            const targetElement = await this.findElementByXPath(targetXPath);
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = htmlContent.trim();
            const elementsToInject = Array.from(tempContainer.children);
            if (elementsToInject.length === 0) {
                throw new Error("The provided HTML contains no valid tags.");
            }
            if (preventDuplicates && duplicateIdentifier) {
                const existingElement = targetElement.querySelector(duplicateIdentifier);
                if (existingElement) {
                    console.log("Located a duplicate identifier, injection will be skipped. Found identifier: ", duplicateIdentifier);
                    return { success: true, message: 'Duplicate prevented' };
                }
            }
            elementsToInject.forEach(element => {
                switch (position) {
                    case 'prepend':
                        targetElement.insertBefore(element, targetElement.firstChild);
                        break;
                    case 'append':
                        targetElement.appendChild(element);
                        break;
                    case 'before':
                        targetElement.parentNode.insertBefore(element, targetElement);
                        break;
                    case 'after':
                        targetElement.parentNode.insertBefore(element, targetElement.nextSibling);
                        break;
                    default:
                        targetElement.appendChild(element);
                }
            });
            return { success: true, message: "Successfully injected elements.", elements: elementsToInject };
        } catch (error) {
            console.error("Failed to inject HTML. Error message: ", error.message);
            return { success: false, message: error.message };
        }
    }
    async injectHTMLBySelector(htmlContent, targetSelector, options = {}) {
        try {
            await new Promise(resolve => this.onReady(resolve));
            const targetElement = await this.findElementBySelector(targetSelector);
            const xpath = this.getXPathFromElement(targetElement);
            return await this.injectHTML(htmlContent, xpath, options);
        } catch (error) {
            console.error("Failed to inject HTML by selector. Error message: ", error.message);
            return { success: false, message: error.message };
        }
    }
    getXPathFromElement(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let hasFollowingSiblings = false;
            let hasPrecedingSiblings = false;
            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    hasPrecedingSiblings = true;
                    index++;
                }
            }
            for (let sibling = element.nextSibling; sibling; sibling = sibling.nextSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    hasFollowingSiblings = true;
                    break;
                }
            }
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = (hasPrecedingSiblings || hasFollowingSiblings) ? `[${index + 1}]` : '';
            parts.splice(0, 0, tagName + pathIndex);
            element = element.parentNode;
        }
        return parts.length ? '/' + parts.join('/') : null;
    }
}

const DOMInjectorObject = new DOMInjector();

function WaitForElementCSS(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(() => {
            observer.disconnect();
            reject(new Error('Element not found within timeout window.'));
        }, timeout);
    });
}

const Sleep = ms => new Promise(res => setTimeout(res, ms));

function RemoveElement(XPath) {
    const observer = new MutationObserver(() => {
        const element = GetByXPath(XPath);
        if (element) {
            element.remove();
            observer.disconnect();
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function MakeTransactionsSidebarButton() {
    const HTMLContent = `<li data-slot="sidebar-menu-item" data-sidebar="menu-item" class="group/menu-item relative"><a href="/transactions" class="peer/menu-button outline-hidden ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&amp;>span:last-child]:truncate [&amp;>svg]:size-4 [&amp;>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-receipt h-5 w-5"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 17.5v-11"></path></svg><span>Transactions</span></a></li>`;
    const PCTarget = '/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul';
    const MobileTarget = '/html/body/div[4]/div[2]/div[2]/div[1]/div/ul';
    try {
        return DOMInjectorObject.injectHTML(HTMLContent, PCTarget, {
            preventDuplicates: false,
            duplicateIdentifier: ""
        });
    } catch {
        return DOMInjectorObject.injectHTML(HTMLContent, MobileTarget, {
            preventDuplicates: false,
            duplicateIdentifier: ""
        });
    }
}
function MakeLiveSidebarButton() {
    const HTMLContent = `<li data-slot="sidebar-menu-item" data-sidebar="menu-item" class="group/menu-item relative"><a href="/live" class="peer/menu-button outline-hidden ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&amp;>span:last-child]:truncate [&amp;>svg]:size-4 [&amp;>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity-icon lucide-activity"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg><span>Live</span></a></li>`;
    const PCTarget = '/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul';
    const MobileTarget = '/html/body/div[4]/div[2]/div[2]/div[1]/div/ul';
    try {
        return DOMInjectorObject.injectHTML(HTMLContent, PCTarget, {
            preventDuplicates: false,
            duplicateIdentifier: ""
        });
    } catch {
        return DOMInjectorObject.injectHTML(HTMLContent, MobileTarget, {
            preventDuplicates: false,
            duplicateIdentifier: ""
        });
    }
}

// Modify sidebar buttons.
MakeTransactionsSidebarButton();
MakeLiveSidebarButton();

// Remove the lightmode toggle on both PC and mobile.
RemoveElement(`/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul/li[11]`);
RemoveElement(`/html/body/div[4]/div[2]/div[2]/div[1]/div/ul/li[11]`);

// Modify sidebar text.
WaitForElement("/html/body/div[1]/div[1]/div/div[2]/div/div[1]/div/div/span").then(element => {
    element.innerText = "BetterRugplay"
});
WaitForElement('/html/body/div[1]/div[1]/div/div[2]/div/div[1]/div/div').then(element => {
    const versionSpan = document.createElement('span');
    versionSpan.className = 'text-base font-semibold';
    versionSpan.textContent = GM_info.script.version;
    element.appendChild(versionSpan);
});
WaitForElement("/html/body/div/div[1]/div/div[2]/div/div[2]/div[4]/div[1]").then(element => {
    element.innerText = "Your Portfolio"
});
WaitForElement("/html/body/div/div[1]/div/div[2]/div/div[2]/div[4]/div[2]/div/div[1]/div/span").then(element => {
    element.innerText = "Net Worth"
});
WaitForElement("/html/body/div/div[1]/div/div[2]/div/div[2]/div[4]/div[2]/div/div[2]/div[1]/span[1]").then(element => {
    element.innerText = "Liquid:"
});
WaitForElement("/html/body/div/div[1]/div/div[2]/div/div[2]/div[4]/div[2]/div/div[2]/div[2]/span[1]").then(element => {
    element.innerText = "Illiquid:"
});


// Tag handling.
function GetBRPTags(Path) {
    const pathMatch = Path.match(/^\/user\/(.+)$/);
    if (!pathMatch) return Promise.resolve([]);
    const currentId = pathMatch[1];
    return fetch('https://raw.githubusercontent.com/ItsThatOneJack-Dev/BetterRugplay-tags/main/tags.json5')
        .then(response => response.text())
        .then(text => JSON5.parse(text))
        .then(tags => {
            const matchingTags = [];
            for (const [message, userList] of Object.entries(tags)) {
                const foundUser = userList.find(([username, userId]) =>
                    currentId === username || currentId === String(userId)
                );
                if (foundUser) {
                    matchingTags.push(message);
                }
            }
            return matchingTags;
        })
        .catch(() => []);
}

function TagProfile(Tags) {
    WaitForElement("/html/body/div/div[1]/main/div/div/div/div/div/div[1]/div/div/div[2]/div[2]/span").then(element => {
        let TagsString = Tags.join(" • ");
        element.innerText = element.innerText + ((TagsString != "") ? " • " + TagsString : "");
    });
}

function setupCommentWatcher() {
    Log("Setting up comment watcher...");
    const existingContainer = document.querySelector('div.space-y-4');
    if (existingContainer) {
        TagComments(existingContainer);
    }
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.classList && node.classList.contains('space-y-4')) {
                        Log("Comment container added, tagging all comments");
                        TagComments(node);
                    }
                    else if (node.classList && node.classList.contains('border-border')) {
                        Log("Individual comment added, tagging it");
                        TagSingleComment(node);
                    }
                    else if (node.querySelector) {
                        const commentDivs = node.querySelectorAll('div.border-border');
                        if (commentDivs.length > 0) {
                            Log(`Found ${commentDivs.length} new comments in added node`);
                            commentDivs.forEach(comment => TagSingleComment(comment));
                        }
                    }
                }
            });
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    Log("Comment watcher setup complete");
    return observer;
}

function TagSingleComment(comment) {
    try {
        const usernameBadge = comment.querySelector('span[data-slot="badge"] span.truncate');
        const username = usernameBadge?.textContent.trim();
        const topbar = comment.querySelector('div.flex.items-center.gap-2');
        Log(`Tagging single comment - USR: ${username}, BAR: ${topbar ? "found" : "null"}`);
        if (username && topbar && !topbar.querySelector('.brp-tags')) {
            const brpTags = document.createElement('span');
            brpTags.className = 'brp-tags text-xs text-muted-foreground ml-2';
            brpTags.textContent = 'Loading tags...';
            topbar.appendChild(brpTags);
            const usernameWithoutAt = username.replace('@', '');
            GetBRPTags(`/user/${usernameWithoutAt}`).then(tags => {
                brpTags.textContent = tags.join(" • ") || "";
            });
        }
    } catch (e) {
        console.error('Error processing single comment:', e);
    }
}
function TagComments(rootElement) {
    if (!rootElement?.children) return console.error('Invalid root element');
    Log(`Tagging ${rootElement.children.length} existing comments`);
    const commentDivs = Array.from(rootElement.children).filter(child =>
        child.querySelector && child.querySelector('span[data-slot="badge"]')
    );
    Log(`Found ${commentDivs.length} comment divs`);
    commentDivs.forEach(comment => TagSingleComment(comment));
}

function InsertBLCAbout() {
    const targetXPath = '/html/body/div/div[1]/main/div/div/div/div';
    const htmlContent = `<div class="container mx-auto space-y-8 px-4 py-8" id="blc-about"><div class="space-y-4 text-center"><div class="mb-4 flex items-center justify-center gap-2"><img src="https://itoj.dev/embed/icons/BRP.png" class="h-12 w-12" alt="Rugplay"> <h1 class="text-4xl font-bold">BetterRugplay</h1></div> <p class="text-muted-foreground mx-auto max-w-2xl text-lg">A userscript for Rugplay, designed to keep you safe, and help your investments grow!</p> </div> <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"><div data-slot="card" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"><!----><div data-slot="card-header" class="@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6"><div data-slot="card-title" class="font-semibold leading-none flex items-center gap-2"><!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-coins text-primary h-5 w-5"><!----><circle cx="8" cy="8" r="6"></circle><!----><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><!----><path d="M7 6h1v4"></path><!----><path d="m16.71 13.88.7.71-2.82 2.82"></path><!----><!----><!----></svg><!----> About BetterRugplay<!----></div><!----></div><!----> <div data-slot="card-content" class="px-6"><div class="space-y-3"><p class="text-muted-foreground text-sm">BetterRugplay is a userscript for Rugplay that offers impressive features, made by players, for players!</p> <p class="text-muted-foreground text-sm">See users who just want your hard earned money, see accounts controlled by scripts, see extra features!</p> <p class="text-muted-foreground text-sm">Join the community of degenerates where paranoia is profitable!</p></div><!----></div><!----><!----></div><!----> <div data-slot="card" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"><!----><div data-slot="card-header" class="@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6"><div data-slot="card-title" class="font-semibold leading-none flex items-center gap-2"><!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-trending-up text-primary h-5 w-5"><!----><path d="M16 7h6v6"></path><!----><path d="m22 7-8.5 8.5-5-5L2 17"></path><!----><!----><!----></svg><!----> Features<!----></div><!----></div><!----> <div data-slot="card-content" class="px-6"><div class="space-y-2"><div class="flex items-center gap-2 text-sm"><span>🤖</span> <span>See accounts that are controlled by scripts!</span></div> <div class="flex items-center gap-2 text-sm"><span>🟢</span> <span>Find safe currencies!</span></div> <div class="flex items-center gap-2 text-sm"><span>🔴</span> <span>Know how to stay safe!</span></div> <div class="flex items-center gap-2 text-sm"><span>⚖️</span> <span>Weigh your options!</span></div> <div class="flex items-center gap-2 text-sm"><span>🎲</span> <span>Play it safe, or live life on the edge!</span></div> <div class="flex items-center gap-2 text-sm"><span>📊</span> <span>View extra information about currencies and users!</span></div> <div class="flex items-center gap-2 text-sm"><span>🏆</span> <span>Beat the competition!</span></div></div><!----></div><!----><!----></div><!----> <div data-slot="card" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"><!----><div data-slot="card-header" class="@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6"><div data-slot="card-title" class="font-semibold leading-none flex items-center gap-2"><!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-user text-primary h-5 w-5"><!----><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><!----><circle cx="12" cy="7" r="4"></circle><!----><!----><!----></svg><!----> Credits<!----></div><!----></div><!----> <div data-slot="card-content" class="px-6"><div class="space-y-4"><p class="text-muted-foreground text-sm">Created by <strong>ItsThatOneJack</strong></p> <div class="flex flex-wrap gap-2"><!----><a data-slot="button" class="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 cursor-pointer bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5" href="https://itoj.dev" target="_blank" rel="noopener"><!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe-icon lucide-globe"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg><!----> Website<!----></a><!----> <!----><!----> <!----><a data-slot="button" class="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 cursor-pointer bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5" href="https://github.com/ItsThatOneJack-Dev/BetterRugplay" target="_blank" rel="noopener"><!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-github h-4 w-4"><!----><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><!----><path d="M9 18c-4.51 2-5-2-7-2"></path><!----><!----><!----></svg><!----> GitHub<!----></a><!----> <!----><a data-slot="button" class="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 cursor-pointer bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5" href="https://discordapp.com/users/900821876018929664" target="_blank" rel="noopener"><!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-shield h-4 w-4"><!----><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><!----><!----><!----></svg><!----> Discord<!----></a><!----></div></div><!----></div><!----><!----></div><!----></div></div>`;
    WaitForElement(targetXPath).then(element => {
        element.insertAdjacentHTML('beforeend', htmlContent);;
    });
}

function Toast(message, duration = 3000, link = null) {
    let toastContainer = document.getElementById('tampermonkey-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'tampermonkey-toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0;
        max-width: 300px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
        ${link ? 'cursor: pointer; pointer-events: auto;' : ''}
    `;
    if (link) {
        toast.addEventListener('click', () => {
            window.open(link, '_blank');
        });
    }
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

const URLObserver = new URLChangeDetector({
    pollInterval: 250
});
const UpdateDetector = new UpdateChecker(GM_info.script.version,GM_info.script.updateURL,(currentVersion,newVersion) => {
    Toast(`Version ${newVersion} is now available! Click here to update!`,30000,GM_info.script.updateURL);
},30000);

URLObserver.onChange((newLocation, oldLocation) => {
    if (newLocation.pathname.match(/^\/user\/(.+)$/)) {
        GetBRPTags(newLocation.pathname).then(tags => {
            TagProfile(tags);
        });
    } else if (newLocation.pathname == "/portfolio") {
        let NewHTMLContent1 = `<!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-wallet h-4 w-4"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path></svg>Net Worth`;
        WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[1]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent1});
        let NewHTMLContent2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-dollar-sign h-4 w-4"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>Liquid`;
        WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[2]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent2});
        let NewHTMLContent3 = `<!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-trending-up h-4 w-4"><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg>Illiquid`;
        WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[3]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent3});
    } else if (newLocation.pathname.includes('/coin/')) {
        Log("Setting up comment tagging for coin page");
        const commentObserver = setupCommentWatcher();
        window.addEventListener('beforeunload', () => {
            if (commentObserver) {
                commentObserver.disconnect();
                Log("Comment observer disconnected");
            }
        });
    } else if (newLocation.pathname.includes('about')) {
        InsertBLCAbout();
    }
});

URLObserver.onChange((newLocation,oldLocation) => {
    if (!(newLocation.pathname.includes('about'))) {
        document.getElementById("blc-about")?.remove();
    }
});

if (window.location.pathname.startsWith("/*")) {
    window.location.pathname = `/coin/${window.location.pathname.substring(2)}`;
} else if (window.location.pathname.startsWith("/@")) {
    window.location.pathname = `/user/${window.location.pathname.substring(2)}`;
}

URLObserver.start(); // URLObserver will watch the page for URL changes due to direct assignment (using polling), and History API hooks.
