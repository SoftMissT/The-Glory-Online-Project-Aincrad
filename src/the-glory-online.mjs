import { TGO } from './config.mjs';
import { CharacterData } from './data/character.mjs';
import { CharacterSheet } from './sheets/character-sheet.mjs';
Hooks.once('init', () => {
    console.log('THE GLORY ONLINE | Carregando o sistema');
    CONFIG.TGO = TGO;
    CONFIG.Actor.dataModels.character = CharacterData;
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
        foundry.documents.Actor,
        'the-glory-online',
        CharacterSheet,
        {
            types: ['character'],
            makeDefault: true,
            label: 'TGO.Sheet.character',
        }
    );
});
