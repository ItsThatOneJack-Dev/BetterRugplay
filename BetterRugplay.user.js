// ==UserScript==
// @name         BetterRugplay
// @namespace    https://itoj.dev
// @version      1.1.0
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

(function () {
    'use strict';

    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('🔁 Href changed, reloading...');
            location.reload();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
    };

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'));
    });

    window.addEventListener('locationchange', () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('🔁 locationchange event, reloading...');
            location.reload();
        }
    });
})();

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
    findElementByXPath(xpath, maxAttempts = 50, interval = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkElement = () => {
                const element = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;
                if (element) {
                    resolve(element);
                } else {
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(checkElement, interval);
                    } else {
                        reject(new Error(`Element not found after ${maxAttempts} attempts: ${xpath}`));
                    }
                }
            };
            checkElement();
        });
    }
    findElementBySelector(selector, maxAttempts = 50, interval = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else {
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(checkElement, interval);
                    } else {
                        reject(new Error(`Element not found after ${maxAttempts} attempts: ${selector}`));
                    }
                }
            };
            checkElement();
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
                throw new Error('No valid HTML elements found in provided content');
            }
            if (preventDuplicates && duplicateIdentifier) {
                const existingElement = targetElement.querySelector(duplicateIdentifier);
                if (existingElement) {
                    console.log('Duplicate element found, skipping injection:', duplicateIdentifier);
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
            return { success: true, message: 'Injection completed', elements: elementsToInject };
        } catch (error) {
            console.error('Failed to inject HTML:', error.message);
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
            console.error('Failed to inject HTML by selector:', error.message);
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
            reject(new Error('Element not found within timeout'));
        }, timeout);
    });
}

const Sleep = ms => new Promise(res => setTimeout(res, ms));

function RemoveSidebarItem(XPath) {
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
    const Target = '/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul';
    return DOMInjectorObject.injectHTML(HTMLContent, Target, {
        preventDuplicates: false,
        duplicateIdentifier: ""
    });
}
function MakeLiveSidebarButton() {
    const HTMLContent = `<li data-slot="sidebar-menu-item" data-sidebar="menu-item" class="group/menu-item relative"><a href="/live" class="peer/menu-button outline-hidden ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&amp;>span:last-child]:truncate [&amp;>svg]:size-4 [&amp;>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity-icon lucide-activity"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg><span>Live</span></a></li>`;
    const Target = '/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul';
    return DOMInjectorObject.injectHTML(HTMLContent, Target, {
        preventDuplicates: false,
        duplicateIdentifier: ""
    });
}

function AddBRpBadge() {
    const badge = document.createElement('div');
    badge.id = 'bits-c14';
    badge.textContent = 'BetterRugplay v1.0';
    badge.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: grey;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        z-index: 9999;
        font-size: 12px;
        font-family: Arial, sans-serif;
    `;

    document.body.appendChild(badge);
    Log("Floating badge added!");
}

AddBRpBadge();

// Modify sidebar buttons.
MakeTransactionsSidebarButton();
MakeLiveSidebarButton();
RemoveSidebarItem(`/html/body/div/div[1]/div/div[2]/div/div[2]/div[1]/div/ul/li[9]`);

// Modify sidebar text.
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
function IsBetterRugplayDeveloper(Path) {
    const pathMatch = Path.match(/^\/user\/(.+)$/);
    if (!pathMatch) return Promise.resolve(false);
    const currentId = pathMatch[1];
    return fetch('https://raw.githubusercontent.com/ItsThatOneJack-Dev/BetterRugplay-tags/main/devs.json')
        .then(response => response.json())
        .then(developers =>
            Object.entries(developers).some(([username, userId]) =>
                currentId === username || currentId === String(userId)
            )
        )
        .catch(() => false);
}
function IsBetterRugplayMalicious(Path) {
    const pathMatch = Path.match(/^\/user\/(.+)$/);
    if (!pathMatch) return Promise.resolve(false);
    const currentId = pathMatch[1];
    return fetch('https://raw.githubusercontent.com/ItsThatOneJack-Dev/BetterRugplay-tags/main/maliciousaccounts.json')
        .then(response => response.json())
        .then(maliciousaccounts =>
            Object.entries(maliciousaccounts).some(([username, userId]) =>
                currentId === username || currentId === String(userId)
            )
        )
        .catch(() => false);
}

function InsertDeveloperBadge() {
    const buttonHTML = `
        <button data-slot="tooltip-trigger" id="bits-c15" data-state="closed" data-delay-duration="0" data-tooltip-trigger="" tabindex="0" type="button" data-tooltip="BetterRugplay Developer" data-tooltip-custom="" data-side="top">
            <div class="cursor-pointer rounded-full p-1 opacity-80 hover:opacity-100 ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cog-icon lucide-cog">
                    <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path>
                    <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                    <path d="M12 2v2"></path>
                    <path d="M12 22v-2"></path>
                    <path d="m17 20.66-1-1.73"></path>
                    <path d="M11 10.27 7 3.34"></path>
                    <path d="m20.66 17-1.73-1"></path>
                    <path d="m3.34 7 1.73 1"></path>
                    <path d="M14 12h8"></path>
                    <path d="M2 12h2"></path>
                    <path d="m20.66 7-1.73 1"></path>
                    <path d="m3.34 17 1.73-1"></path>
                    <path d="m17 3.34-1 1.73"></path>
                    <path d="m11 13.73-4 6.93"></path>
                </svg>
            </div>
        </button>
    `;
    function _insertbadge(targ) {
        if (!targ) return;
        if (!document.getElementById("bits-c15")) {
            const temp = document.createElement('div');
            temp.innerHTML = buttonHTML.trim();
            const button = temp.firstChild;
            targ.appendChild(button);
            console.log('✅ Badge inserted');
        }
    }
    function _insert() {
        const parent = GetByXPath("/html/body/div[1]/div[1]/main/div/div/div/div/div/div[1]/div/div/div[2]/div[1]/div/div");
        if (parent) _insertbadge(parent);
    }
    setInterval(_insert,500);
}
function InsertMaliciousBadge() {
    const buttonHTML = `
        <button data-slot="tooltip-trigger" id="bits-c15" data-state="closed" data-delay-duration="0" data-tooltip-trigger="" tabindex="0" type="button" data-tooltip="Malicious User" data-tooltip-custom="" data-side="top">
            <div class="cursor-pointer rounded-full p-1 opacity-80 hover:opacity-100 ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag-icon lucide-flag">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" x2="4" y1="22" y2="15"/>
                </svg>
            </div>
        </button>
    `;
    function _insertbadge(targ) {
        if (!targ) return;
        if (!document.getElementById("bits-c15")) {
            const temp = document.createElement('div');
            temp.innerHTML = buttonHTML.trim();
            const button = temp.firstChild;
            targ.appendChild(button);
            console.log('✅ Badge inserted');
        }
    }
    function _insert() {
        const parent = GetByXPath("/html/body/div[1]/div[1]/main/div/div/div/div/div/div[1]/div/div/div[2]/div[1]/div/div");
        if (parent) _insertbadge(parent);
    }
    setInterval(_insert,500);
}

if (window.location.pathname.match(/^\/user\/(.+)$/)) {
    Log("Checking BetterRugplay tags of `"+window.location.pathname+"`...");
    IsBetterRugplayDeveloper(window.location.pathname).then(isDeveloper => {
        Log("Is developer: "+isDeveloper.toString());
        if (isDeveloper) {
            InsertDeveloperBadge();
        }
    });
    IsBetterRugplayMalicious(window.location.pathname).then(isMalicious => {
        Log("Is malicious: "+isMalicious.toString());
        if (isMalicious) {
            InsertMaliciousBadge();
        }
    });
}
