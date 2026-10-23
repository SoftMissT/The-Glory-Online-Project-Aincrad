import { TGO } from './config.mjs';
import { CharacterData } from './data/character.mjs';
import { TGOItemModels } from './data/item.mjs';
import { CharacterSheet } from './sheets/character-sheet.mjs';
import { TGOItemSheet } from './sheets/item-sheet.mjs';
import { SAOSystemMenu } from './apps/system-menu.mjs';
import './apps/journal-hud.mjs';
import './apps/gm-hud.mjs';
Hooks.once('init', () => {
    console.log('THE GLORY ONLINE | Carregando o sistema');
    CONFIG.TGO = TGO;
    CONFIG.Actor.dataModels.character = CharacterData;
    Object.assign(CONFIG.Item.dataModels, TGOItemModels);
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
        foundry.documents.Item,
        'the-glory-online',
        TGOItemSheet,
        {
            types: ['weapon', 'equipment', 'consumable'],
            makeDefault: true,
            label: 'TGO.Sheet.item',
        }
    );
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
        foundry.documents.Actor,
        'the-glory-online',
        CharacterSheet,
        {
            types: ['character'],
            makeDefault: false,
            label: 'TGO.Sheet.character',
        }
    );
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
        foundry.documents.Actor,
        'the-glory-online',
        SAOSystemMenu,
        {
            types: ['character'],
            makeDefault: true,
            label: 'TGO.Sheet.menu',
        }
    );
});
