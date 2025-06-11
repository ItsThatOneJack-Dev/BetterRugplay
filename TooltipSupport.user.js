// ==UserScript==
// @name         Rugplay Custom Tooltip Support
// @namespace    https://itoj.dev
// @version      1.1.0
// @description  Take over the virtual crypto exchange!
// @copyright    Copyright (C) 2025 ItsThatOneJack
// @author       ItsThatOneJack
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=itoj.dev
// @grant        none
// @supportURL   https://github.com/ItsThatOneJack-Dev/BetterRugplay/issues
// @updateURL    https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/TooltipSupport.user.js
// @downloadURL  https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/TooltipSupport.user.js
// ==/UserScript==

(function() {
    'use strict';

    class BitsUITooltipSystem {
        constructor() {
            this.tooltips = new Map();
            this.activeTooltip = null;
            this.delayTimeout = null;
            this.hideTimeout = null;
            this.initStyles();
        }

        initStyles() {
            if (!document.querySelector('#bits-ui-custom-styles')) {
                const style = document.createElement('style');
                style.id = 'bits-ui-custom-styles';
                style.textContent = `
                    /* Bits UI Tooltip System Styles */

                    /* Root tooltip container */
                    [data-bits-tooltip-root] {
                        position: relative;
                        display: inline-flex;
                    }

                    /* Floating content wrapper - matches your DOM structure */
                    [data-bits-floating-content-wrapper] {
                        position: fixed;
                        left: 0px;
                        top: 0px;
                        min-width: max-content;
                        z-index: 50;
                        pointer-events: auto;
                    }

                    /* Tooltip content styling */
                    [data-tooltip-content] {
                        z-index: 50;
                        width: fit-content;
                        text-balance: balance;
                        border-radius: 0.375rem;
                        padding: 0.375rem 0.75rem;
                        font-size: 0.75rem;
                        line-height: 1rem;
                        pointer-events: auto;
                        /* Try to use existing CSS variables from the site */
                        background-color: var(--secondary);
                        color: var(--color-text, var(--foreground, hsl(0 0% 98%)));
                        border: 1px solid var(--color-border, var(--border, hsl(240 3.7% 15.9%)));
                        box-shadow: var(--shadow-popover, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
                    }

                    /* Custom content styling matching the Svelte example */
                    .bits-tooltip-custom-content {
                        z-index: 50;
                        width: fit-content;
                        text-balance: balance;
                        border-radius: 0.375rem;
                        padding: 0.375rem 0.75rem;
                        font-size: 0.75rem;
                        line-height: 1rem;
                        pointer-events: auto;
                        /* Try to use existing CSS variables from the site */
                        background-color: var(--secondary);
                        color: var(--color-text, var(--foreground, hsl(0 0% 98%)));
                        border: 1px solid var(--color-border, var(--border, hsl(240 3.7% 15.9%)));
                        box-shadow: var(--shadow-popover, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
                    }

                    /* Animation classes */
                    .animate-in {
                        animation-duration: 150ms;
                        animation-fill-mode: both;
                        animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .fade-in-0 {
                        animation-name: fadeIn;
                    }

                    .zoom-in-95 {
                        animation-name: zoomIn;
                    }

                    .slide-in-from-top-2 {
                        animation-name: slideInFromTop;
                    }

                    .slide-in-from-bottom-2 {
                        animation-name: slideInFromBottom;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes zoomIn {
                        from {
                            opacity: 0;
                            transform: scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }

                    @keyframes slideInFromTop {
                        from {
                            opacity: 0;
                            transform: translateY(-0.5rem);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    @keyframes slideInFromBottom {
                        from {
                            opacity: 0;
                            transform: translateY(0.5rem);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    /* Tooltip arrow */
                    .bits-tooltip-arrow {
                        position: absolute;
                        width: 0.625rem;
                        height: 0.625rem;
                        transform: rotate(45deg);
                        border-radius: 2px;
                        z-index: 50;
                        background-color: var(--secondary);
                        border: 1px solid var(--color-border, var(--border, hsl(240 3.7% 15.9%)));
                    }

                    [data-side="top"] .bits-tooltip-arrow {
                        border-top: none;
                        border-left: none;
                        bottom: 0px;
                        transform: translateY(100%) rotate(45deg);
                    }

                    [data-side="bottom"] .bits-tooltip-arrow {
                        border-bottom: none;
                        border-right: none;
                        top: 0px;
                        transform: translateY(-100%) rotate(45deg);
                    }

                    /* State classes for smooth transitions */
                    [data-state="closed"] {
                        animation-name: fadeOut;
                        animation-duration: 150ms;
                    }

                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        generateId() {
            return `bits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        calculatePosition(trigger, content, sideOffset = 8) {
            const triggerRect = trigger.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();

            const triggerCenterX = triggerRect.left + triggerRect.width / 2;
            const spaceAbove = triggerRect.top;
            const spaceBelow = window.innerHeight - triggerRect.bottom;

            let x = triggerCenterX - contentRect.width / 2;
            let y, side, arrowX;

            // Determine optimal side (matches Bits UI logic)
            if (spaceAbove > spaceBelow && spaceAbove > contentRect.height + sideOffset + 20) {
                y = triggerRect.top - contentRect.height - sideOffset;
                side = 'top';
            } else {
                y = triggerRect.bottom + sideOffset;
                side = 'bottom';
            }

            // Keep tooltip within viewport horizontally
            const padding = 8;
            const maxX = window.innerWidth - contentRect.width - padding;
            const minX = padding;

            if (x < minX) {
                arrowX = triggerCenterX - minX;
                x = minX;
            } else if (x > maxX) {
                arrowX = triggerCenterX - maxX;
                x = maxX;
            } else {
                arrowX = contentRect.width / 2;
            }

            // Clamp arrow position
            arrowX = Math.max(10, Math.min(arrowX, contentRect.width - 10));

            return {
                x: Math.round(x),
                y: Math.round(y),
                side,
                arrowX: Math.round(arrowX),
                anchorRect: triggerRect
            };
        }

        createTooltip(trigger, content, options = {}) {
            const {
                delayDuration = 200,
                sideOffset = 8,
                useCustomStyling = false
            } = options;

            const tooltipId = this.generateId();

            const tooltip = {
                id: tooltipId,
                trigger,
                content,
                delayDuration,
                sideOffset,
                useCustomStyling,
                isVisible: false,
                element: null
            };

            this.tooltips.set(trigger, tooltip);
            this.attachEvents(tooltip);

            return tooltip;
        }

        attachEvents(tooltip) {
            const { trigger } = tooltip;

            const handleMouseEnter = () => {
                this.clearTimeouts();
                this.delayTimeout = setTimeout(() => {
                    this.showTooltip(tooltip);
                }, tooltip.delayDuration);
            };

            const handleMouseLeave = () => {
                this.clearTimeouts();
                this.hideTooltip(tooltip);
            };

            const handleFocus = () => {
                this.clearTimeouts();
                this.showTooltip(tooltip);
            };

            const handleBlur = () => {
                this.clearTimeouts();
                this.hideTooltip(tooltip);
            };

            trigger.addEventListener('mouseenter', handleMouseEnter);
            trigger.addEventListener('mouseleave', handleMouseLeave);
            trigger.addEventListener('focus', handleFocus);
            trigger.addEventListener('blur', handleBlur);

            // Store event handlers for cleanup
            tooltip.eventHandlers = {
                mouseenter: handleMouseEnter,
                mouseleave: handleMouseLeave,
                focus: handleFocus,
                blur: handleBlur
            };
        }

        showTooltip(tooltip) {
            if (tooltip.isVisible) return;

            // Hide any active tooltip
            if (this.activeTooltip && this.activeTooltip !== tooltip) {
                this.hideTooltip(this.activeTooltip);
            }

            const wrapperId = this.generateId();
            const contentId = this.generateId();
            const arrowId = this.generateId();

            // Create wrapper (matches your DOM structure exactly)
            const wrapper = document.createElement('div');
            wrapper.id = wrapperId;
            wrapper.setAttribute('data-bits-floating-content-wrapper', '');
            wrapper.setAttribute('dir', 'ltr');
            wrapper.style.cssText = `
                position: fixed;
                left: 0px;
                top: 0px;
                min-width: max-content;
                z-index: 50;
                pointer-events: auto;
            `;

            // Create content element
            const content = document.createElement('div');
            content.id = contentId;
            content.setAttribute('forcemount', 'false');
            content.setAttribute('data-slot', 'tooltip-content');
            content.setAttribute('data-state', 'instant-open');
            content.setAttribute('data-tooltip-content', '');
            content.setAttribute('data-align', 'center');
            content.setAttribute('tabindex', '-1');
            content.style.cssText = `
                pointer-events: auto;
                transform-origin: var(--bits-tooltip-content-transform-origin);
                --bits-tooltip-content-available-width: var(--bits-floating-available-width);
                --bits-tooltip-content-available-height: var(--bits-floating-available-height);
                --bits-tooltip-anchor-width: var(--bits-floating-anchor-width);
                --bits-tooltip-anchor-height: var(--bits-floating-anchor-height);
            `;

            // Apply styling based on options
            if (tooltip.useCustomStyling) {
                content.className = 'bits-tooltip-custom-content animate-in fade-in-0 zoom-in-95';
            } else {
                content.className = 'animate-in fade-in-0 zoom-in-95';
                content.setAttribute('data-tooltip-content', '');
            }

            // Add content text
            if (typeof tooltip.content === 'string') {
                if (tooltip.useCustomStyling) {
                    content.textContent = tooltip.content;
                } else {
                    const textElement = document.createElement('p');
                    textElement.textContent = tooltip.content;
                    textElement.style.margin = '0';
                    content.appendChild(textElement);
                }
            } else {
                content.appendChild(tooltip.content.cloneNode(true));
            }

            // Create arrow
            const arrow = document.createElement('div');
            arrow.id = arrowId;
            arrow.className = 'bits-tooltip-arrow';

            content.appendChild(arrow);
            wrapper.appendChild(content);
            document.body.appendChild(wrapper);

            // Calculate position
            const position = this.calculatePosition(tooltip.trigger, content, tooltip.sideOffset);

            // Apply positioning
            wrapper.style.transform = `translate(${position.x}px, ${position.y}px)`;

            // Set CSS custom properties (matching your DOM structure)
            wrapper.style.setProperty('--bits-floating-transform-origin', `${position.arrowX}px 38px`);
            wrapper.style.setProperty('--bits-floating-available-width', `${window.innerWidth}px`);
            wrapper.style.setProperty('--bits-floating-available-height', `${position.y}px`);
            wrapper.style.setProperty('--bits-floating-anchor-width', `${position.anchorRect.width}px`);
            wrapper.style.setProperty('--bits-floating-anchor-height', `${position.anchorRect.height}px`);

            // Set side and arrow position
            content.setAttribute('data-side', position.side);
            arrow.setAttribute('data-side', position.side);
            arrow.style.left = `${position.arrowX - 5}px`;

            // Update animation class based on side
            if (position.side === 'top') {
                content.className = content.className.replace('slide-in-from-top-2', 'slide-in-from-bottom-2');
            } else {
                content.className = content.className.replace('slide-in-from-bottom-2', 'slide-in-from-top-2');
            }

            tooltip.element = wrapper;
            tooltip.isVisible = true;
            this.activeTooltip = tooltip;
        }

        hideTooltip(tooltip, immediate = false) {
            if (!tooltip.isVisible || !tooltip.element) return;

            if (immediate) {
                tooltip.element.remove();
                tooltip.element = null;
                tooltip.isVisible = false;
                if (this.activeTooltip === tooltip) {
                    this.activeTooltip = null;
                }
            } else {
                this.hideTimeout = setTimeout(() => {
                    if (tooltip.element) {
                        tooltip.element.remove();
                        tooltip.element = null;
                        tooltip.isVisible = false;
                        if (this.activeTooltip === tooltip) {
                            this.activeTooltip = null;
                        }
                    }
                }, 100);
            }
        }

        clearTimeouts() {
            if (this.delayTimeout) {
                clearTimeout(this.delayTimeout);
                this.delayTimeout = null;
            }
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }

        removeTooltip(trigger) {
            const tooltip = this.tooltips.get(trigger);
            if (!tooltip) return;

            if (tooltip.isVisible) {
                this.hideTooltip(tooltip, true);
            }

            // Remove event listeners
            Object.entries(tooltip.eventHandlers).forEach(([event, handler]) => {
                trigger.removeEventListener(event, handler);
            });

            this.tooltips.delete(trigger);
        }
    }

    // Initialize the tooltip system
    const tooltipSystem = new BitsUITooltipSystem();

    // Public API functions
    window.BitsTooltip = {
        // Create a tooltip (matches Bits UI API style)
        create: (trigger, content, options = {}) => {
            return tooltipSystem.createTooltip(trigger, content, options);
        },

        // Remove a tooltip
        remove: (trigger) => {
            tooltipSystem.removeTooltip(trigger);
        },

        // Helper to create simple text tooltip
        addTo: (element, text, options = {}) => {
            return tooltipSystem.createTooltip(element, text, options);
        }
    };

    // Auto-initialize tooltips on elements with data attributes
    function initAutoTooltips() {
        const elements = document.querySelectorAll('[data-tooltip], [data-bits-tooltip]');

        elements.forEach(el => {
            if (tooltipSystem.tooltips.has(el)) return; // Skip if already initialized

            const content = el.getAttribute('data-tooltip') || el.getAttribute('data-bits-tooltip');
            const delayDuration = parseInt(el.getAttribute('data-tooltip-delay')) || 200;
            const sideOffset = parseInt(el.getAttribute('data-tooltip-offset')) || 8;
            const useCustomStyling = el.hasAttribute('data-tooltip-custom');

            if (content) {
                // Remove title to prevent native tooltips
                if (el.hasAttribute('title')) {
                    el.removeAttribute('title');
                }

                tooltipSystem.createTooltip(el, content, {
                    delayDuration,
                    sideOffset,
                    useCustomStyling
                });
            }
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoTooltips);
    } else {
        initAutoTooltips();
    }

    // Watch for dynamically added elements
    const observer = new MutationObserver((mutations) => {
        let shouldReinit = false;

        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.hasAttribute('data-tooltip') ||
                        node.hasAttribute('data-bits-tooltip') ||
                        node.querySelector('[data-tooltip], [data-bits-tooltip]')) {
                        shouldReinit = true;
                    }
                }
            });
        });

        if (shouldReinit) {
            setTimeout(initAutoTooltips, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
