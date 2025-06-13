// ==UserScript==
// @name         Rugplay Custom Popover Support
// @namespace    https://itoj.dev
// @version      1.0.0
// @description  BitsUI-style popover system for custom content
// @copyright    Copyright (C) 2025 ItsThatOneJack
// @author       ItsThatOneJack
// @match        *://rugplay.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=itoj.dev
// @grant        none
// @supportURL   https://github.com/ItsThatOneJack-Dev/BetterRugplay/issues
// @updateURL    https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/PopoverSupport.user.js
// @downloadURL  https://github.com/ItsThatOneJack-Dev/BetterRugplay/raw/refs/heads/main/PopoverSupport.user.js
// ==/UserScript==

(function() {
    'use strict';

    class BitsUIPopoverSystem {
        constructor() {
            this.popovers = new Map();
            this.activePopover = null;
            this.initStyles();
            this.initGlobalEvents();
        }

        initStyles() {
            if (!document.querySelector('#bits-ui-popover-styles')) {
                const style = document.createElement('style');
                style.id = 'bits-ui-popover-styles';
                style.textContent = `
                    /* Bits UI Popover System Styles */

                    /* Popover overlay for modal behavior */
                    [data-bits-popover-overlay] {
                        position: fixed;
                        inset: 0;
                        z-index: 40;
                        background-color: transparent;
                    }

                    /* Floating content wrapper */
                    [data-bits-popover-wrapper] {
                        position: fixed;
                        left: 0px;
                        top: 0px;
                        min-width: max-content;
                        z-index: 50;
                        pointer-events: auto;
                    }

                    /* Base popover content styling */
                    [data-popover-content] {
                        z-index: 50;
                        min-width: 200px;
                        max-width: 320px;
                        border-radius: 0.5rem;
                        padding: 1rem;
                        font-size: 0.875rem;
                        line-height: 1.25rem;
                        pointer-events: auto;
                        background-color: var(--secondary, hsl(240 3.7% 15.9%));
                        color: var(--color-text, var(--foreground, hsl(0 0% 98%)));
                        border: 1px solid var(--color-border, var(--border, hsl(240 3.7% 15.9%)));
                        box-shadow: var(--shadow-popover, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
                        outline: none;
                    }

                    /* Custom dark theme styling matching the image */
                    .bits-popover-dark {
                        background-color: hsl(240 10% 3.9%);
                        color: hsl(0 0% 98%);
                        border: 1px solid hsl(240 3.7% 15.9%);
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
                    }

                    /* Form elements in popover */
                    .bits-popover-content input[type="text"],
                    .bits-popover-content input[type="email"],
                    .bits-popover-content textarea,
                    .bits-popover-content select {
                        width: 100%;
                        padding: 0.5rem 0.75rem;
                        border-radius: 0.375rem;
                        border: 1px solid hsl(240 3.7% 15.9%);
                        background-color: hsl(240 10% 3.9%);
                        color: hsl(0 0% 98%);
                        font-size: 0.875rem;
                        outline: none;
                        transition: border-color 0.2s;
                    }

                    .bits-popover-content input:focus,
                    .bits-popover-content textarea:focus,
                    .bits-popover-content select:focus {
                        border-color: hsl(346.8 77.2% 49.8%);
                        box-shadow: 0 0 0 2px hsla(346.8, 77.2%, 49.8%, 0.2);
                    }

                    .bits-popover-content textarea {
                        resize: vertical;
                        min-height: 80px;
                    }

                    /* Button styling */
                    .bits-popover-button {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                        padding: 0.5rem 1rem;
                        border: none;
                        cursor: pointer;
                        transition: all 0.2s;
                        outline: none;
                    }

                    .bits-popover-button-primary {
                        background-color: hsl(346.8 77.2% 49.8%);
                        color: hsl(355.7 100% 97.3%);
                    }

                    .bits-popover-button-primary:hover {
                        background-color: hsl(346.8 77.2% 45%);
                    }

                    .bits-popover-button-secondary {
                        background-color: hsl(240 3.7% 15.9%);
                        color: hsl(0 0% 98%);
                        border: 1px solid hsl(240 3.7% 15.9%);
                    }

                    .bits-popover-button-secondary:hover {
                        background-color: hsl(240 6% 25%);
                    }

                    /* Form groups */
                    .bits-popover-form-group {
                        margin-bottom: 1rem;
                    }

                    .bits-popover-form-group:last-child {
                        margin-bottom: 0;
                    }

                    .bits-popover-label {
                        display: block;
                        font-size: 0.875rem;
                        font-weight: 500;
                        margin-bottom: 0.5rem;
                        color: hsl(0 0% 98%);
                    }

                    .bits-popover-button-group {
                        display: flex;
                        gap: 0.5rem;
                        justify-content: flex-end;
                        margin-top: 1rem;
                    }

                    /* Animation classes */
                    .animate-in {
                        animation-duration: 200ms;
                        animation-fill-mode: both;
                        animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .fade-in {
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

                    .slide-in-from-left-2 {
                        animation-name: slideInFromLeft;
                    }

                    .slide-in-from-right-2 {
                        animation-name: slideInFromRight;
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

                    @keyframes slideInFromLeft {
                        from {
                            opacity: 0;
                            transform: translateX(-0.5rem);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    @keyframes slideInFromRight {
                        from {
                            opacity: 0;
                            transform: translateX(0.5rem);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    /* Popover arrow */
                    .bits-popover-arrow {
                        position: absolute;
                        width: 0.75rem;
                        height: 0.75rem;
                        transform: rotate(45deg);
                        border-radius: 2px;
                        z-index: 50;
                        background-color: hsl(240 10% 3.9%);
                        border: 1px solid hsl(240 3.7% 15.9%);
                    }

                    [data-side="top"] .bits-popover-arrow {
                        border-top: none;
                        border-left: none;
                        bottom: 0px;
                        transform: translateY(100%) rotate(45deg);
                    }

                    [data-side="bottom"] .bits-popover-arrow {
                        border-bottom: none;
                        border-right: none;
                        top: 0px;
                        transform: translateY(-100%) rotate(45deg);
                    }

                    [data-side="left"] .bits-popover-arrow {
                        border-left: none;
                        border-bottom: none;
                        right: 0px;
                        transform: translateX(100%) rotate(45deg);
                    }

                    [data-side="right"] .bits-popover-arrow {
                        border-right: none;
                        border-top: none;
                        left: 0px;
                        transform: translateX(-100%) rotate(45deg);
                    }

                    /* State classes */
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

        initGlobalEvents() {
            // Close popover on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.activePopover) {
                    this.hidePopover(this.activePopover);
                }
            });
        }

        generateId() {
            return `bits-popover-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        calculatePosition(trigger, content, options = {}) {
            const { side = 'auto', align = 'center', sideOffset = 8, alignOffset = 0 } = options;

            const triggerRect = trigger.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();

            let finalSide = side;
            let x, y, arrowX, arrowY;

            // Auto-determine side if needed
            if (side === 'auto') {
                const spaceAbove = triggerRect.top;
                const spaceBelow = window.innerHeight - triggerRect.bottom;
                const spaceLeft = triggerRect.left;
                const spaceRight = window.innerWidth - triggerRect.right;

                if (spaceBelow >= contentRect.height + sideOffset) {
                    finalSide = 'bottom';
                } else if (spaceAbove >= contentRect.height + sideOffset) {
                    finalSide = 'top';
                } else if (spaceRight >= contentRect.width + sideOffset) {
                    finalSide = 'right';
                } else {
                    finalSide = 'left';
                }
            }

            // Calculate position based on side
            switch (finalSide) {
                case 'top':
                    y = triggerRect.top - contentRect.height - sideOffset;
                    x = this.calculateAlignPosition(triggerRect, contentRect, align, alignOffset, 'horizontal');
                    arrowX = triggerRect.left + triggerRect.width / 2 - x;
                    arrowY = null;
                    break;
                case 'bottom':
                    y = triggerRect.bottom + sideOffset;
                    x = this.calculateAlignPosition(triggerRect, contentRect, align, alignOffset, 'horizontal');
                    arrowX = triggerRect.left + triggerRect.width / 2 - x;
                    arrowY = null;
                    break;
                case 'left':
                    x = triggerRect.left - contentRect.width - sideOffset;
                    y = this.calculateAlignPosition(triggerRect, contentRect, align, alignOffset, 'vertical');
                    arrowX = null;
                    arrowY = triggerRect.top + triggerRect.height / 2 - y;
                    break;
                case 'right':
                    x = triggerRect.right + sideOffset;
                    y = this.calculateAlignPosition(triggerRect, contentRect, align, alignOffset, 'vertical');
                    arrowX = null;
                    arrowY = triggerRect.top + triggerRect.height / 2 - y;
                    break;
            }

            // Keep within viewport
            const padding = 8;
            x = Math.max(padding, Math.min(x, window.innerWidth - contentRect.width - padding));
            y = Math.max(padding, Math.min(y, window.innerHeight - contentRect.height - padding));

            // Clamp arrow positions
            if (arrowX !== null) {
                arrowX = Math.max(10, Math.min(arrowX, contentRect.width - 10));
            }
            if (arrowY !== null) {
                arrowY = Math.max(10, Math.min(arrowY, contentRect.height - 10));
            }

            return {
                x: Math.round(x),
                y: Math.round(y),
                side: finalSide,
                arrowX: arrowX ? Math.round(arrowX) : null,
                arrowY: arrowY ? Math.round(arrowY) : null,
                anchorRect: triggerRect
            };
        }

        calculateAlignPosition(triggerRect, contentRect, align, alignOffset, direction) {
            if (direction === 'horizontal') {
                switch (align) {
                    case 'start':
                        return triggerRect.left + alignOffset;
                    case 'end':
                        return triggerRect.right - contentRect.width - alignOffset;
                    case 'center':
                    default:
                        return triggerRect.left + triggerRect.width / 2 - contentRect.width / 2 + alignOffset;
                }
            } else {
                switch (align) {
                    case 'start':
                        return triggerRect.top + alignOffset;
                    case 'end':
                        return triggerRect.bottom - contentRect.height - alignOffset;
                    case 'center':
                    default:
                        return triggerRect.top + triggerRect.height / 2 - contentRect.height / 2 + alignOffset;
                }
            }
        }

        createPopover(trigger, content, options = {}) {
            const {
                side = 'auto',
                align = 'center',
                sideOffset = 8,
                alignOffset = 0,
                modal = false,
                closeOnClickOutside = true,
                showArrow = true,
                className = '',
                onOpenChange = null
            } = options;

            const popoverId = this.generateId();

            const popover = {
                id: popoverId,
                trigger,
                content,
                options: {
                    side,
                    align,
                    sideOffset,
                    alignOffset,
                    modal,
                    closeOnClickOutside,
                    showArrow,
                    className,
                    onOpenChange
                },
                isVisible: false,
                element: null,
                overlay: null
            };

            this.popovers.set(trigger, popover);
            return popover;
        }

        showPopover(popover) {
            if (popover.isVisible) return;

            // Hide any active popover if not modal
            if (this.activePopover && this.activePopover !== popover) {
                this.hidePopover(this.activePopover);
            }

            const { options } = popover;
            const wrapperId = this.generateId();
            const contentId = this.generateId();

            // Create overlay if modal
            if (options.modal) {
                const overlay = document.createElement('div');
                overlay.setAttribute('data-bits-popover-overlay', '');
                overlay.style.cssText = `
                    position: fixed;
                    inset: 0;
                    z-index: 40;
                    background-color: rgba(0, 0, 0, 0.5);
                `;

                if (options.closeOnClickOutside) {
                    overlay.addEventListener('click', () => this.hidePopover(popover));
                }

                document.body.appendChild(overlay);
                popover.overlay = overlay;
            }

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.id = wrapperId;
            wrapper.setAttribute('data-bits-popover-wrapper', '');
            wrapper.setAttribute('dir', 'ltr');

            // Create content element
            const content = document.createElement('div');
            content.id = contentId;
            content.setAttribute('data-popover-content', '');
            content.setAttribute('data-state', 'open');
            content.setAttribute('tabindex', '-1');
            content.className = `bits-popover-content bits-popover-dark animate-in fade-in zoom-in-95 ${options.className}`.trim();

            // Add content
            if (typeof popover.content === 'string') {
                content.innerHTML = popover.content;
            } else if (popover.content instanceof HTMLElement) {
                content.appendChild(popover.content.cloneNode(true));
            } else if (typeof popover.content === 'function') {
                const contentResult = popover.content();
                if (typeof contentResult === 'string') {
                    content.innerHTML = contentResult;
                } else {
                    content.appendChild(contentResult);
                }
            }

            wrapper.appendChild(content);
            document.body.appendChild(wrapper);

            // Calculate position
            const position = this.calculatePosition(popover.trigger, content, {
                side: options.side,
                align: options.align,
                sideOffset: options.sideOffset,
                alignOffset: options.alignOffset
            });

            // Apply positioning
            wrapper.style.cssText = `
                position: fixed;
                left: ${position.x}px;
                top: ${position.y}px;
                min-width: max-content;
                z-index: 50;
                pointer-events: auto;
            `;

            // Add arrow if enabled
            if (options.showArrow) {
                const arrow = document.createElement('div');
                arrow.className = 'bits-popover-arrow';
                arrow.setAttribute('data-side', position.side);

                if (position.arrowX !== null) {
                    arrow.style.left = `${position.arrowX - 6}px`;
                }
                if (position.arrowY !== null) {
                    arrow.style.top = `${position.arrowY - 6}px`;
                }

                content.appendChild(arrow);
            }

            // Set side attribute and animation
            content.setAttribute('data-side', position.side);

            // Add side-specific animation
            const animationClass = position.side === 'top' ? 'slide-in-from-bottom-2' :
                                 position.side === 'bottom' ? 'slide-in-from-top-2' :
                                 position.side === 'left' ? 'slide-in-from-right-2' :
                                 'slide-in-from-left-2';

            content.classList.add(animationClass);

            // Handle outside clicks
            if (options.closeOnClickOutside && !options.modal) {
                setTimeout(() => {
                    const handleClickOutside = (e) => {
                        if (!content.contains(e.target) && !popover.trigger.contains(e.target)) {
                            this.hidePopover(popover);
                            document.removeEventListener('click', handleClickOutside);
                        }
                    };
                    document.addEventListener('click', handleClickOutside);
                    popover.clickOutsideHandler = handleClickOutside;
                }, 10);
            }

            popover.element = wrapper;
            popover.isVisible = true;
            this.activePopover = popover;

            // Focus the content
            content.focus();

            // Call onOpenChange callback
            if (options.onOpenChange) {
                options.onOpenChange(true);
            }
        }

        hidePopover(popover) {
            if (!popover.isVisible || !popover.element) return;

            // Remove click outside handler
            if (popover.clickOutsideHandler) {
                document.removeEventListener('click', popover.clickOutsideHandler);
                delete popover.clickOutsideHandler;
            }

            // Remove overlay
            if (popover.overlay) {
                popover.overlay.remove();
                popover.overlay = null;
            }

            // Remove content
            popover.element.remove();
            popover.element = null;
            popover.isVisible = false;

            if (this.activePopover === popover) {
                this.activePopover = null;
            }

            // Call onOpenChange callback
            if (popover.options.onOpenChange) {
                popover.options.onOpenChange(false);
            }
        }

        togglePopover(popover) {
            if (popover.isVisible) {
                this.hidePopover(popover);
            } else {
                this.showPopover(popover);
            }
        }

        removePopover(trigger) {
            const popover = this.popovers.get(trigger);
            if (!popover) return;

            if (popover.isVisible) {
                this.hidePopover(popover);
            }

            this.popovers.delete(trigger);
        }
    }

    // Initialize the popover system
    const popoverSystem = new BitsUIPopoverSystem();

    // Public API
    window.BitsPopover = {
        // Create a popover
        create: (trigger, content, options = {}) => {
            return popoverSystem.createPopover(trigger, content, options);
        },

        // Show a popover
        show: (popover) => {
            popoverSystem.showPopover(popover);
        },

        // Hide a popover
        hide: (popover) => {
            popoverSystem.hidePopover(popover);
        },

        // Toggle a popover
        toggle: (popover) => {
            popoverSystem.togglePopover(popover);
        },

        // Remove a popover
        remove: (trigger) => {
            popoverSystem.removePopover(trigger);
        },

        // Helper to create and show a popover immediately
        showAt: (trigger, content, options = {}) => {
            const popover = popoverSystem.createPopover(trigger, content, options);
            popoverSystem.showPopover(popover);
            return popover;
        },

        // Helper to create a form-based popover (useful for report functionality)
        createForm: (trigger, formConfig, options = {}) => {
            const content = () => {
                const form = document.createElement('div');
                form.className = 'bits-popover-form';

                // Add title if provided
                if (formConfig.title) {
                    const title = document.createElement('h3');
                    title.textContent = formConfig.title;
                    title.style.cssText = 'margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600;';
                    form.appendChild(title);
                }

                // Add fields
                formConfig.fields?.forEach(field => {
                    const group = document.createElement('div');
                    group.className = 'bits-popover-form-group';

                    if (field.label) {
                        const label = document.createElement('label');
                        label.className = 'bits-popover-label';
                        label.textContent = field.label;
                        group.appendChild(label);
                    }

                    let input;
                    switch (field.type) {
                        case 'textarea':
                            input = document.createElement('textarea');
                            if (field.placeholder) input.placeholder = field.placeholder;
                            if (field.rows) input.rows = field.rows;
                            break;
                        case 'select':
                            input = document.createElement('select');
                            field.options?.forEach(option => {
                                const opt = document.createElement('option');
                                opt.value = option.value || option;
                                opt.textContent = option.label || option;
                                input.appendChild(opt);
                            });
                            break;
                        default:
                            input = document.createElement('input');
                            input.type = field.type || 'text';
                            if (field.placeholder) input.placeholder = field.placeholder;
                    }

                    if (field.name) input.name = field.name;
                    if (field.required) input.required = true;

                    group.appendChild(input);
                    form.appendChild(group);
                });

                // Add buttons
                if (formConfig.buttons) {
                    const buttonGroup = document.createElement('div');
                    buttonGroup.className = 'bits-popover-button-group';

                    formConfig.buttons.forEach(btn => {
                        const button = document.createElement('button');
                        button.className = `bits-popover-button ${btn.variant === 'primary' ? 'bits-popover-button-primary' : 'bits-popover-button-secondary'}`;
                        button.textContent = btn.text;
                        button.type = btn.type || 'button';

                        button.addEventListener('click', (e) => {
                            if (btn.onClick) {
                                const formData = new FormData();
                                const inputs = form.querySelectorAll('input, textarea, select');
                                inputs.forEach(input => {
                                    if (input.name) {
                                        formData.append(input.name, input.value);
                                    }
                                });
                                btn.onClick(e, formData, form);
                            }
                        });

                        buttonGroup.appendChild(button);
                    });

                    form.appendChild(buttonGroup);
                }

                return form;
            };

            return popoverSystem.createPopover(trigger, content, options);
        }
    };

})();