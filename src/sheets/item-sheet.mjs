import { TGO } from '../config.mjs';
const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;
/** Ficha de Item (F2 parcial): campos condicionais por tipo, submitOnChange. */
export class TGOItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ['the-glory-online', 'sheet', 'item'],
        position: {
            width: 540,
            height: 560,
        },
        form: {
            submitOnChange: true,
        },
    };
    static PARTS = {
        body: {
            template: 'systems/the-glory-online/templates/item/item-sheet.hbs',
        },
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.system = this.document.system;
        context.isWeapon = this.document.type === 'weapon';
        context.isEquipment = this.document.type === 'equipment';
        context.slotOptions = Object.entries(TGO.equipmentSlots).map(([value, label]) => ({
            value,
            label: game.i18n.localize(label),
        }));
        return context;
    }
}
