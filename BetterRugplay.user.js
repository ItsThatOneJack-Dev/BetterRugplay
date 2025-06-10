// ==UserScript==
// @name         BetterRugplay
// @namespace    https://itoj.dev
// @version      1.5.1
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
} else if (window.location.pathname=="/portfolio") {
    let NewHTMLContent1 = `<!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-wallet h-4 w-4"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path></svg>Net Worth`;
    WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[1]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent1});
    let NewHTMLContent2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-dollar-sign h-4 w-4"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>Liquid`;
    WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[2]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent2});
    let NewHTMLContent3 = `<!----><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-trending-up h-4 w-4"><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg>Illiquid`;
    WaitForElement("/html/body/div[1]/div[1]/main/div/div/div/div/div/div/div[2]/div[3]/div[1]/div").then(element => {element.innerHTML = NewHTMLContent3});
}
