// ==UserScript==
// @name         UpdateChecker
// @namespace    https://itoj.dev
// @version      1.2
// @description  Library for detecting new versions of a userscript.
// @copyright    Copyright (C) 2025 ItsThatOneJack
// @author       ItsThatOneJack
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=itoj.dev
// @grant        GM_xmlhttpRequest
// @supportURL   https://github.com/ItsThatOneJack-Dev/BetterRugplay/issues
// @updateURL    https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/UpdateChecker.user.js
// @downloadURL  https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/UpdateChecker.user.js
// ==/UserScript==

class UpdateChecker {
    constructor(currentVersion, updateUrl, callback, interval = 30000) {
        this.currentVersion = currentVersion;
        this.updateUrl = updateUrl;
        this.callback = callback;
        this.interval = interval;
        this.intervalId = null;
    }
    
    start() {
        this.check();
        this.intervalId = setInterval(() => this.check(), this.interval);
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    check() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: this.updateUrl,
            headers: { 'Cache-Control': 'no-cache' },
            onload: (response) => {
                if (response.status === 200) {
                    const remoteVersion = this.extractVersion(response.responseText);
                    if (remoteVersion && this.compareVersions(this.currentVersion, remoteVersion) < 0) {
                        this.callback(this.currentVersion, remoteVersion);
                    }
                }
            }
        });
    }
    
    extractVersion(scriptContent) {
        const match = scriptContent.match(/@version\s+(.+)/);
        return match ? match[1].trim() : null;
    }
    
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    }
}
