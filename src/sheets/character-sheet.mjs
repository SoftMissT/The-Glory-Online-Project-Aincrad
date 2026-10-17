import { TGO } from '../config.mjs';
const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;
/** Ficha nativa do personagem. F1: cabeçalho + STATUS; abas entram com a segunda aba. */
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ['the-glory-online', 'sheet', 'actor', 'character'],
        position: {
            width: 780,
            height: 620,
        },
        form: {
            submitOnChange: true,
        },
    };
    static PARTS = {
        header: {
            template: 'systems/the-glory-online/templates/actor/parts/character-header.hbs',
        },
        status: {
            template: 'systems/the-glory-online/templates/actor/parts/character-status.hbs',
        },
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.system = this.document.system;
        context.attributes = Object.entries(TGO.attributes).map(([key, label]) => ({
            key,
            label,
            value: this.document.system.attributes[key].value,
        }));
        return context;
    }
}
