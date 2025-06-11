// ==UserScript==
// @name         URLChangeDetector
// @namespace    https://itoj.dev
// @version      1.1.0
// @description  Library for detecting URL changes in SPAs.
// @copyright    Copyright (C) 2025 ItsThatOneJack
// @author       ItsThatOneJack
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=itoj.dev
// @grant        none
// @noframes
// @supportURL   https://github.com/ItsThatOneJack-Dev/BetterRugplay/issues
// @updateURL    https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/URLChangeDetector.user.js
// @downloadURL  https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/URLChangeDetector.user.js
// ==/UserScript==

(function(global) {
    'use strict';
    // Prevent multiple initialization
    if (global.URLChangeDetector) {
        return;
    }
    class URLChangeDetector {
        constructor(options = {}) {
            this.callbacks = [];
            this.currentLocation = this._createLocationObject();
            this.isActive = false;
            this.debugMode = options.debug || false;
            this.pollInterval = options.pollInterval || null; // Optional polling fallback
            this.pollTimer = null;
        }
        _createLocationObject() {
            return {
                href: location.href,
                pathname: location.pathname,
                search: location.search,
                hash: location.hash,
                host: location.host,
                hostname: location.hostname,
                port: location.port,
                protocol: location.protocol,
                origin: location.origin
            };
        }
        enableDebug() {
            this.debugMode = true;
            return this;
        }
        _log(message) {
            if (this.debugMode) {
                console.log(`[URLChangeDetector] ${message}`);
            }
        }
        onChange(callback) {
            if (typeof callback === 'function') {
                this.callbacks.push(callback);
                this._log(`Added callback. Total callbacks: ${this.callbacks.length}`);
            } else {
                throw new Error('Callback must be a function');
            }
            return this;
        }
        removeCallback(callback) {
            const index = this.callbacks.indexOf(callback);
            if (index > -1) {
                this.callbacks.splice(index, 1);
                this._log(`Removed callback. Total callbacks: ${this.callbacks.length}`);
            }
            return this;
        }
        clearCallbacks() {
            this.callbacks = [];
            this._log('Cleared all callbacks');
            return this;
        }
        _executeCallbacks(newLocation, oldLocation) {
            this._log(`URL changed from ${oldLocation.href} to ${newLocation.href}`);
            this.callbacks.forEach((callback, index) => {
                try {
                    callback(newLocation, oldLocation);
                } catch (error) {
                    console.error(`URLChangeDetector: Error in callback ${index}:`, error);
                }
            });
        }
        _checkLocationChange() {
            const newLocation = this._createLocationObject();
            if (this.currentLocation.href !== newLocation.href) {
                const oldLocation = { ...this.currentLocation };
                this.currentLocation = newLocation;
                this._executeCallbacks(newLocation, oldLocation);
            }
        }
        start() {
            if (this.isActive) {
                this._log('Already active');
                return this;
            }
            this._log('Starting URL change detection');
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            const originalAssign = location.assign;
            const originalReplace = location.replace;
            const self = this;
            history.pushState = function() {
                originalPushState.apply(history, arguments);
                setTimeout(() => self._checkLocationChange(), 0);
            };
            history.replaceState = function() {
                originalReplaceState.apply(history, arguments);
                setTimeout(() => self._checkLocationChange(), 0);
            };
            location.assign = function() {
                originalAssign.apply(location, arguments);
                setTimeout(() => self._checkLocationChange(), 0);
            };
            location.replace = function() {
                originalReplace.apply(location, arguments);
                setTimeout(() => self._checkLocationChange(), 0);
            };
            window.addEventListener('popstate', () => {
                setTimeout(() => self._checkLocationChange(), 0);
            });
            window.addEventListener('hashchange', () => {
                setTimeout(() => self._checkLocationChange(), 0);
            });
            if (this.pollInterval) {
                this.pollTimer = setInterval(() => {
                    self._checkLocationChange();
                }, this.pollInterval);
                this._log(`Started polling every ${this.pollInterval}ms`);
            }
            this.isActive = true;
            this._log('URL change detection started');
            return this;
        }
        stop() {
            if (!this.isActive) {
                this._log('Already inactive');
                return this;
            }
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
                this._log('Stopped polling');
            }
            this.isActive = false;
            this._log('URL change detection stopped (note: history hooks remain active)');
            return this;
        }
        getCurrentLocation() {
            return { ...this.currentLocation };
        }
        isOnPath(path) {
            return this.currentLocation.pathname === path;
        }
        pathMatches(pattern) {
            if (pattern instanceof RegExp) {
                return pattern.test(this.currentLocation.pathname);
            }
            return this.currentLocation.pathname.includes(pattern);
        }
        getSearchParams() {
            return Object.fromEntries(new URLSearchParams(this.currentLocation.search));
        }
    }
    global.URLChangeDetector = URLChangeDetector;
})(typeof window !== 'undefined' ? window : this);
