const fields = foundry.data.fields;
const attribute = () =>
    new fields.SchemaField({
        value: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
            min: 0,
        }),
    });
const pool = () =>
    new fields.SchemaField({
        value: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
            min: 0,
        }),
        max: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
            min: 0,
        }),
    });
/** Personagem jogável. Campos espelham o SDD v0.3; fórmulas abertas ficam fora do código. */
export class CharacterData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            attributes: new fields.SchemaField({
                str: attribute(),
                agi: attribute(),
                vit: attribute(),
                mind: attribute(),
            }),
            health: pool(),
            mana: pool(),
            level: new fields.NumberField({
                required: true,
                integer: true,
                initial: 1,
                min: 1,
            }),
            xp: new fields.NumberField({
                required: true,
                integer: true,
                initial: 0,
                min: 0,
            }),
            class: new fields.SchemaField({
                base: new fields.StringField({
                    blank: true,
                    initial: '',
                }),
                subclass: new fields.StringField({
                    blank: true,
                    initial: '',
                }),
            }),
            /** Maestria por tipo de arma/estilo (SDD v0.3, seções 7 e 8). */
            masteries: new fields.ArrayField(
                new fields.SchemaField({
                    type: new fields.StringField({
                        required: true,
                        blank: false,
                    }),
                    value: new fields.NumberField({
                        required: true,
                        integer: true,
                        initial: 0,
                        min: 0,
                    }),
                }),
                {
                    initial: [],
                }
            ),
        };
    }
    /** CA derivada SDD v0.3, seção 7: Agilidade + Maestria + Equipamento. */
    prepareDerivedData() {
        const agi = this.attributes.agi.value;
        const maestria = Math.max(0, ...this.masteries.map((m) => m.value));
        // ponytail: equipamento só entra na F2; até lá a CA é Agilidade + maior Maestria.
        this.ca = agi + maestria;
    }
}
