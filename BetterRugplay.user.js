// ==UserScript==
// @name         BetterRugplay
// @namespace    https://itoj.dev
// @version      2.0.0
// @description  Take over the virtual crypto exchange!
// @copyright    Copyright (C) 2025 ItsThatOneJack
// @author       ItsThatOneJack
// @match        *://rugplay.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rugplay.com
// @grant        GM_log
// @supportURL   https://github.com/ItsThatOneJack-Dev/BetterRugplay/issues
// @updateURL    https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/BetterRugplay.user.js
// @downloadURL  https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/BetterRugplay.user.js
// @require      https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/TooltipSupport.user.js
// ==/UserScript==

let Log = GM_log;

function GetByXPath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}
function WaitForElement(XPath) {
    return new Promise((resolve) => {
        // Check if element already exists
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
            position = 'append', // 'append', 'prepend', 'before', 'after'
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
RemoveElement(`/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul/li[9]`);
RemoveElement(`/html/body/div[4]/div[2]/div[2]/div[1]/div/ul/li[9]`);

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
// Tag handling.
function GetBRPTags(Path) {
    const pathMatch = Path.match(/^\/user\/(.+)$/);
    if (!pathMatch) return Promise.resolve([]);
    const currentId = pathMatch[1];
    return fetch('https://raw.githubusercontent.com/ItsThatOneJack-Dev/BetterRugplay-tags/main/tags.json')
        .then(response => response.json())
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

    // First, try to tag any existing comments
    const existingContainer = document.querySelector('div.space-y-4');
    if (existingContainer) {
        TagComments(existingContainer);
    }

    // Then watch for new comments being added
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // Check if the added node is a comment div
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if it's a comment container
                    if (node.classList && node.classList.contains('space-y-4')) {
                        Log("Comment container added, tagging all comments");
                        TagComments(node);
                    }
                    // Check if it's an individual comment
                    else if (node.classList && node.classList.contains('border-border')) {
                        Log("Individual comment added, tagging it");
                        TagSingleComment(node);
                    }
                    // Check if it contains comments (in case a parent div was added)
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

    // Start observing the entire document for changes
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

if (window.location.pathname.match(/^\/user\/(.+)$/)) {
    GetBRPTags(window.location.pathname).then(tags => {
        TagProfile(tags);
    });
} else if (window.location.pathname == "/portfolio") {
    let NewHTMLContent1 = `<!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-wallet h-4 w-4"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path></svg>Net Worth`;
    WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[1]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent1});
    let NewHTMLContent2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-dollar-sign h-4 w-4"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>Liquid`;
    WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[2]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent2});
    let NewHTMLContent3 = `<!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-trending-up h-4 w-4"><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg>Illiquid`;
    WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[3]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent3});
} else if (window.location.pathname.includes('/coin/')) {
    Log("Setting up comment tagging for coin page");
    const commentObserver = setupCommentWatcher();
    window.addEventListener('beforeunload', () => {
        if (commentObserver) {
            commentObserver.disconnect();
            Log("Comment observer disconnected");
        }
    });
}
