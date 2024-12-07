import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { Sortable } from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';

const extensionName = "rearrange-hamburger";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

let preferredOrder = [
    "option_toggle_AN",
    "option_toggle_CFG",
    "option_toggle_logprobs",
    "option_new_bookmark",
    "option_convert_to_group",
    "separator_1",
    "option_close_chat",
    "option_select_chat",
    "option_start_new_chat",
    "option_delete_mes",
    "separator_2",
    "option_regenerate",
    "separator_3",
    "option_impersonate",
    "option_continue"
];

function initializeOrder() {
    const savedOrder = localStorage.getItem('ST_menuOrder');
    if (savedOrder) {
        try {
            const parsed = JSON.parse(savedOrder);
            if (Array.isArray(parsed)) {
                preferredOrder = parsed;
            }
        } catch (e) {
            console.error('Failed to parse saved menu order');
        }
    }
}

function createReorderButton() {
    const button = document.createElement('a');
    button.id = 'option_reorder';
    button.className = 'interactable';
    button.tabIndex = '0';
    button.innerHTML = `
        <i class="fa-lg fa-solid fa-sort"></i>
        <span>Rearrange Menu</span>
    `;

    button.onclick = () => {
        const dialog = document.createElement('dialog');
        dialog.style.cssText = 'padding: 0; border: none; background: transparent;';
        const menu = document.querySelector(".options-content");
        const items = Array.from(menu.children).filter(el => el.tagName === "A");
        const itemMap = new Map();

        items.forEach(item => {
            const span = item.querySelector('span[data-i18n]');
            if (span) {
                itemMap.set(item.id, span.textContent);
            }
        });

        dialog.innerHTML = `
            <div style="min-width: 300px; background: #0f0f0f; border-radius: 10px; border: 1px solid #2b2b2b;">
                <h3 style="color: #fff; margin: 0; padding: 15px; border-bottom: 1px solid #2b2b2b;">Rearrange Menu Items</h3>
                <div id="reorderList" style="margin: 10px; max-height: 70vh; overflow-y: auto;">
                    ${preferredOrder.map((item, index) => `
                        <div class="reorder-item" draggable="true" style="display: flex; align-items: center; margin: 5px 0; cursor: move; background: #1a1a1a; padding: 8px; border-radius: 4px; color: #ccc;">
                            <i class="fa-solid fa-grip-vertical" style="margin-right: 10px; color: #666;"></i>
                            <span style="margin-right: 10px;">${index + 1}.</span>
                            <input type="hidden" value="${item}">
                            <span style="flex: 1;">${item.startsWith('separator_') ? '--- Separator ---' : (itemMap.get(item) || item)}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 15px; border-top: 1px solid #2b2b2b;">
                    <button style="padding: 5px 15px; border-radius: 4px; border: 1px solid #2b2b2b; background: #1a1a1a; color: #ccc; cursor: pointer;" id="cancelBtn">Cancel</button>
                    <button style="padding: 5px 15px; border-radius: 4px; border: 1px solid #2b2b2b; background: #1a1a1a; color: #ccc; cursor: pointer;" id="saveBtn">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        dialog.showModal();

        const reorderList = dialog.querySelector('#reorderList');
        new Sortable(reorderList, {
            animation: 150,
            handle: '.fa-grip-vertical',
            ghostClass: 'sortable-ghost'
        });

        dialog.querySelector('#cancelBtn').onclick = () => {
            dialog.remove();
        };

        dialog.querySelector('#saveBtn').onclick = () => {
            try {
                localStorage.setItem('ST_menuOrder', '[]');
                const newOrder = Array.from(dialog.querySelectorAll('input')).map(i => i.value);
                localStorage.setItem('ST_menuOrder', JSON.stringify(newOrder));
                preferredOrder = [...newOrder];
                dialog.remove();
            } catch (error) {
                console.error('Failed to save menu order:', error);
                alert('Failed to save menu order. Check console for details.');
            }
        };
    };
    return button;
}

function rearrangeMenu() {
    const menu = document.querySelector(".options-content");
    if (!menu) return;

    const items = Array.from(menu.children).filter(el => el.tagName === "A");
    const extraItems = [];
    const orderedItems = [];

    const existingReorderBtn = items.find(item => item.id === 'option_reorder');
    if (existingReorderBtn) {
        orderedItems.push(existingReorderBtn);
        orderedItems.push(document.createElement('hr'));
    } else {
        orderedItems.push(createReorderButton());
        orderedItems.push(document.createElement('hr'));
    }

    preferredOrder.forEach(id => {
        if (id.startsWith("separator_")) {
            orderedItems.push(document.createElement('hr'));
        } else {
            const item = items.find(el => el.id === id);
            if (item) {
                orderedItems.push(item);
            }
        }
    });

    items.forEach(item => {
        if (!preferredOrder.includes(item.id) && item.id !== 'option_reorder') {
            extraItems.push(item);
        }
    });

    if (extraItems.length) {
        orderedItems.unshift(document.createElement('hr'));
        orderedItems.unshift(...extraItems);
    }

    menu.innerHTML = '';
    orderedItems.forEach(item => menu.appendChild(item));
}

jQuery(async () => {
    const style = document.createElement('style');
    style.textContent = `
        .options-content a { cursor: pointer; }
        .sortable-ghost { opacity: 0.4; }
    `;
    document.head.appendChild(style);

    const menuContainer = document.querySelector("#options_button");
    let currentObserver = null;

    menuContainer.addEventListener("click", () => {
        setTimeout(() => {
            try {
                const menu = document.querySelector(".options-content");
                if (menu) {
                    if (currentObserver) {
                        currentObserver.disconnect();
                        currentObserver = null;
                    }
                    initializeOrder();
                    rearrangeMenu();
                    currentObserver = new MutationObserver(() => {
                        try {
                            rearrangeMenu();
                        } catch (error) {
                            console.error('Observer rearrange error:', error);
                        }
                    });
                    currentObserver.observe(menu, { childList: true });
                }
            } catch (error) {
                console.error('Menu click handler error:', error);
            }
        }, 50);
    });
});
