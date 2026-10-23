/** Configuração central do sistema. Só entra aqui o que já é usado pelo código. */
export const TGO = {
    /** Os quatro atributos (SDD v0.3, seção 4). Rótulos em lang/pt-BR.json. */
    attributes: {
        str: 'TGO.Attribute.str',
        agi: 'TGO.Attribute.agi',
        vit: 'TGO.Attribute.vit',
        mind: 'TGO.Attribute.mind',
    },
    /** Tipos de Item da F2 parcial. */
    itemTypes: {
        weapon: 'TGO.Item.type.weapon',
        equipment: 'TGO.Item.type.equipment',
        consumable: 'TGO.Item.type.consumable',
    },
    /** Slots de equipamento; a arma usa system.hand. */
    equipmentSlots: {
        head: 'TGO.EquipmentSlot.head',
        armor: 'TGO.EquipmentSlot.armor',
        feet: 'TGO.EquipmentSlot.feet',
        acc1: 'TGO.EquipmentSlot.acc1',
        acc2: 'TGO.EquipmentSlot.acc2',
    },
};
