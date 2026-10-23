const fields = foundry.data.fields;
/** Campos comuns a todos os itens (F2 parcial). */
class TGOItemBase extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new fields.StringField({
                required: false,
                blank: true,
                initial: '',
            }),
            quantity: new fields.NumberField({
                required: true,
                integer: true,
                initial: 1,
                min: 0,
            }),
            equipped: new fields.BooleanField({
                required: true,
                initial: false,
            }),
        };
    }
}
/** Arma: mãos e mão equipada (SDD v0.3, seção 8). */
export class TGOWeaponData extends TGOItemBase {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            hands: new fields.NumberField({
                required: true,
                integer: true,
                initial: 1,
                choices: [1, 2],
            }),
            hand: new fields.StringField({
                required: true,
                blank: true,
                initial: '',
                choices: ['', 'left', 'right'],
            }),
        };
    }
}
/** Equipamento: slot explícito; bônus de CA fica com o GM. */
export class TGOEquipmentData extends TGOItemBase {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            slot: new fields.StringField({
                required: true,
                blank: true,
                initial: '',
                choices: ['', 'head', 'armor', 'feet', 'acc1', 'acc2'],
            }),
            armor: new fields.NumberField({
                required: true,
                integer: true,
                initial: 0,
            }),
        };
    }
}
/** Consumível: só os campos base nesta entrega. */
export class TGOConsumableData extends TGOItemBase {}
export const TGOItemModels = {
    weapon: TGOWeaponData,
    equipment: TGOEquipmentData,
    consumable: TGOConsumableData,
};
