// ============================================================
// SWORD ART ONLINE  SYSTEM MENU ULTIMATE
// Foundry VTT v14 + the-glory-online (port do conceito; fonte: .concepts/)
// ARQUITETURA: ApplicationV2 (foundry.applications.api)
//
// PLAYER · EQUIPMENT · PARTY · MESSAGES · MAP
// SKILLS · QUESTS · MAIL · ALERTS · OPTIONS
//
// rev.2  TANG-ROU
// - Migrado de overlay DOM cru -> ApplicationV2 (ciclo de vida,
//   frame, resize, z-index e Escape gerenciados pelo Foundry)
// - CSS reescrito como design system escopado (fim do vazamento global)
// - Tipografia legível (piso 10px, body 13px)  antes 5-8px
// - Hooks limpos no close (antes vazavam: updateActor/Scene/activateScene)
// - Dialog V1 -> DialogV2
//
// Persistência: World Settings (partyMembers, partyLeader, quests)
// ============================================================
import { TGO } from '../config.mjs';
const { ApplicationV2, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const MENU_ID = 'sao-system-menu-ultimate';
const STYLE_ID = 'sao-system-style-ultimate';
// Namespace válido para os flags internos dos itens.
const FLAG_SCOPE = 'sao';
// Namespace das configurações persistentes do mundo.
const SETTINGS_NS = 'sao-system-menu';
// ==========================================================
// ACTOR
// ==========================================================
// Preenchido em openSystemMenu(); no load do módulo ainda não há canvas/game.user.
// shortcut: o menu usa id fixo e estado de módulo (uma instância por vez); para
// duas fichas abertas ao mesmo tempo, migrar actor/editMode para a instância.
let actor = null;
let editMode = false;
// ==========================================================
// HELPERS
// ==========================================================
const esc = (value) => {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
};
const getActor = () => canvas.tokens.controlled[0]?.actor ?? game.user.character ?? actor;
const canEditActor = (a = actor) => Boolean(game.user?.isGM || a?.isOwner);
const sys = () => getActor()?.system ?? {};
const modifier = (value) => {
    const n = Number(value ?? 0);
    return n >= 0 ? `+${n}` : `${n}`;
};
const actorName = () => getActor()?.name ?? game.user.name;
const actorImage = () => getActor()?.img ?? 'icons/svg/mystery-man.svg';
const level = (a) => Number(a?.system?.level ?? 1);
const hp = (a) =>
    a?.system?.health ?? {
        value: 0,
        max: 0,
    };
const ac = (a) => Number(a?.system?.ca ?? 0);
// Ponte de leitura: o menu foi escrito no formato dnd5e; o modelo do
// the-glory-online usa health/mana, 4 atributos e ca derivada.
const menuView = (a) => {
    const s = a?.system ?? {};
    const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
    const attr = (key) => {
        const value = num(s.attributes?.[key]?.value);
        return {
            value,
            mod: Math.floor((value - 10) / 2),
        };
    };
    const health = s.health ?? {
        value: 0,
        max: 0,
    };
    const xp = num(s.xp);
    return {
        ...s,
        abilities: {
            str: attr('str'),
            agi: attr('agi'),
            vit: attr('vit'),
            mind: attr('mind'),
        },
        attributes: {
            ...s.attributes,
            hp: {
                value: num(health.value),
                max: num(health.max),
                temp: 0,
            },
            ac: {
                value: num(s.ca),
            },
            prof: 0,
            init: {
                total: 0,
                mod: 0,
            },
        },
        details: {
            level: num(s.level, 1),
            xp: {
                value: xp,
                max: '—',
            },
            class: s.class?.base ?? '',
            subclass: s.class?.subclass ?? '',
            alignment: s.details?.alignment ?? '',
        },
        skills: Object.fromEntries(
            (s.masteries ?? []).map((m) => [
                m.type,
                {
                    label: m.type,
                    total: num(m.value),
                },
            ])
        ),
        currency: {
            gp: 0,
            sp: 0,
            cp: 0,
        },
    };
};
const activeScene = () => game.scenes.active ?? null;
// ==========================================================
// PERSISTÊNCIA
//
// IMPORTANTE:
// Não usamos mais game.world.setFlag("world", ...)
// para Party / Quest.
//
// Usamos World Settings do Foundry.
// ==========================================================
const SETTINGS = {
    partyMembers: 'partyMembers',
    partyLeader: 'partyLeader',
    quests: 'quests',
    messages: 'messages',
    story: 'story',
    events: 'events',
    npcs: 'npcs',
    mapImage: 'mapImage',
    mapPins: 'mapPins',
    rules: 'rules',
};

function registerSettings() {
    const definitions = [
        [SETTINGS.partyMembers, Array, []],
        [SETTINGS.partyLeader, String, ''],
        [SETTINGS.quests, Array, []],
        [SETTINGS.messages, Array, []],
        [SETTINGS.story, Array, []],
        [SETTINGS.events, Array, []],
        [SETTINGS.npcs, Array, []],
        [SETTINGS.mapImage, String, ''],
        [SETTINGS.mapPins, Array, []],
        [SETTINGS.rules, Array, []],
    ];
    for (const [key, type, def] of definitions) {
        try {
            const fullKey = `${SETTINGS_NS}.${key}`;
            if (!game.settings.settings.has(fullKey)) {
                game.settings.register(SETTINGS_NS, key, {
                    name: `SAO ${key}`,
                    hint: 'SAO System Menu internal data.',
                    scope: 'world',
                    config: false,
                    type,
                    default: def,
                });
            }
        } catch (error) {
            console.warn('SAO SETTINGS REGISTER', key, error);
        }
    }
}
Hooks.once('init', registerSettings);
async function getWorldFlag(key, fallback) {
    try {
        const value = game.settings.get(SETTINGS_NS, key);
        return value ?? fallback;
    } catch (error) {
        console.warn('SAO SETTINGS READ', key, error);
        return fallback;
    }
}
async function setWorldFlag(key, value) {
    if (!game.user.isGM) {
        ui.notifications.warn('Somente o GM pode alterar este sistema.');
        return false;
    }
    try {
        await game.settings.set(SETTINGS_NS, key, value);
        return true;
    } catch (error) {
        console.error('SAO SYSTEM SETTINGS', error);
        ui.notifications.error(
            `Não foi possível salvar esta alteração: ${error?.message ?? error}`
        );
        return false;
    }
}
// ==========================================================
// PARTY DATA
// ==========================================================
async function getPartyIds() {
    const ids = await getWorldFlag(SETTINGS.partyMembers, []);
    if (!Array.isArray(ids)) return [];
    return ids.filter((id) => game.actors.has(id));
}
async function savePartyIds(ids) {
    const clean = [...new Set(ids.filter((id) => game.actors.has(id)))];
    return setWorldFlag(SETTINGS.partyMembers, clean);
}
async function getPartyLeader() {
    return await getWorldFlag(SETTINGS.partyLeader, '');
}
async function savePartyLeader(id) {
    return setWorldFlag(SETTINGS.partyLeader, id ?? '');
}
async function getParty() {
    const ids = await getPartyIds();
    return ids.map((id) => game.actors.get(id)).filter(Boolean);
}
// ==========================================================
// QUEST DATA
// ==========================================================
async function getQuests() {
    const defaults = [
        {
            id: 'q-first-floor',
            title: 'THE FIRST FLOOR',
            description: 'Explore a área inicial de Aincrad.',
            objective: 'Descubra a primeira região.',
            reward: '200 XP · 50 COINS',
            progress: 0,
            state: 'active',
        },
        {
            id: 'q-kobold',
            title: 'KOBOLD THREAT',
            description: 'A ameaça dos Kobolds está crescendo.',
            objective: 'Derrote os inimigos da área.',
            reward: '500 XP · UNKNOWN ITEM',
            progress: 0,
            state: 'active',
        },
    ];
    const saved = await getWorldFlag(SETTINGS.quests, null);
    // IMPORTANTE:
    // [] significa realmente nenhuma quest.
    // Não volta para defaults.
    if (Array.isArray(saved)) {
        return saved;
    }
    // Primeira inicialização.
    if (game.user.isGM) {
        await saveQuests(defaults);
    }
    return defaults;
}
async function saveQuests(quests) {
    return setWorldFlag(SETTINGS.quests, quests);
}
// ==========================================================
// ROOT MARKUP
// ==========================================================
function buildRoot() {
    const root = document.createElement('div');
    root.className = 'sao-overlay';
    root.innerHTML = `

      <div class="sao-main">

        <!-- LEFT -->

        <div class="sao-left">

          <div class="sao-player-card">

            <div class="sao-card-header">

              <span>
                PLAYER
              </span>

              <strong>
                ${esc(actorName())}
              </strong>

            </div>

            <div class="sao-avatar-area">

              <div class="sao-avatar-ring"></div>

              <img
                class="sao-avatar"
                src="${esc(actorImage())}"
                data-avatar
                title="Alterar imagem"
                style="cursor:pointer"
                >

              <div
                class="sao-player-name"
                data-name
                title="Alterar nome"
                style="cursor:pointer"
              >
                ${esc(actorName())}
              </div>

              <div class="sao-player-level">
                LEVEL ${level(getActor())}
              </div>

            </div>

          </div>

          <div class="sao-system-info">

            <div>
              <span>
                STATUS
              </span>

              <strong class="sao-online">
                ONLINE
              </strong>
            </div>

            <div>
              <span>
                WORLD
              </span>

              <strong>
                AINCRAD
              </strong>
            </div>

            <div>
              <span>
                FLOOR
              </span>

              <strong id="sao-floor-display">
                --
              </strong>
            </div>

            <div>

              <span>
                HP
              </span>

              <strong>

                <span id="sao-hp-display">
                  ${hp(getActor()).value ?? 0}
                </span>

                /
                ${hp(getActor()).max ?? 0}

              </strong>

            </div>

          </div>

        </div>

        <!-- CENTER -->

        <div
          id="sao-content"
          class="sao-content"
        ></div>

        <!-- RIGHT -->

        <div class="sao-right">

          <button
            class="sao-round-button active"
            data-main="player"
            title="Player System"
          >
            <i class="fas fa-user"></i>
          </button>

          <button
            class="sao-round-button"
            data-main="inventory"
            title="Inventory"
          >
            <i class="fas fa-bag-shopping"></i>
          </button>

          <button
            class="sao-round-button"
            data-main="party"
            title="Party"
          >
            <i class="fas fa-users"></i>
          </button>

          <button
            class="sao-round-button"
            data-main="message"
            title="Messages"
          >
            <i class="fas fa-comment"></i>

            <span
              id="sao-message-count"
              class="sao-message-count"
              style="display:none"
            >
              0
            </span>

          </button>

          <button
            class="sao-round-button"
            data-main="skills"
            title="Skills"
          >
            <i class="fas fa-bolt"></i>
          </button>

          <button
            class="sao-round-button"
            data-main="mail"
            title="Mail"
          >
            <i class="fas fa-envelope"></i>
          </button>

          ${
              canEditActor(actor)
                  ? `
          <button
            class="sao-round-button"
            data-edit-toggle
            title="Editar"
          >
            <i class="fas fa-pen"></i>
          </button>

          <button
            class="
              sao-round-button
              sao-cancel-button
            "
            data-edit-cancel
            title="Cancelar"
            hidden
          >
            <i class="fas fa-xmark"></i>
          </button>
          `
                  : ''
          }

          <button
            class="
              sao-round-button
              sao-close-button
            "
            data-close
          >
            ×
          </button>

        </div>

      </div>

  `;
    return root;
}
// ==========================================================
// STYLE  SAO design system (rev.2)
// Escopado em #${MENU_ID}: nenhum vazamento para o resto do Foundry.
// Tipografia: piso de 10px, corpo de 13px (antes 5-8px).
// ==========================================================
function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `

@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

#${MENU_ID}{
  --sao-void:#05070c;
  --sao-panel:rgba(14,19,28,.90);
  --sao-panel-3:rgba(30,39,54,.92);
  --sao-surface:rgba(255,255,255,.055);
  --sao-surface-2:rgba(255,255,255,.085);
  --sao-line:rgba(232,179,57,.30);
  --sao-line-soft:rgba(233,238,246,.10);
  --sao-gold:#e8b339;
  --sao-gold-lt:#ffd66b;
  --sao-gold-dim:#9a7620;
  --sao-ink:#e9eef6;
  --sao-ink-2:rgba(233,238,246,.70);
  --sao-ink-3:rgba(233,238,246,.44);
  --sao-danger:#d1524a;
  --sao-ok:#4bd68a;
  --sao-fs-2xs:10px;
  --sao-fs-xs:11px;
  --sao-fs-sm:12px;
  --sao-fs-md:13px;
  --sao-fs-lg:15px;
  --sao-fs-xl:18px;
  --sao-fs-2xl:22px;
  --sao-font-display:'Orbitron','Rajdhani','Segoe UI',sans-serif;
  --sao-font-ui:'Rajdhani','Segoe UI','Trebuchet MS',sans-serif;
  --sao-track:.14em;
  --sao-track-wide:.26em;
  --sao-radius:6px;
  --sao-ease:cubic-bezier(.22,.61,.36,1);

  font-family:var(--sao-font-ui);
  font-size:var(--sao-fs-md);
  line-height:1.45;
  letter-spacing:.015em;
  color:var(--sao-ink);
}

/* ----------------------------------------------------------
   FRAME DA APPLICATION V2
   ---------------------------------------------------------- */

#${MENU_ID},
#${MENU_ID} *{box-sizing:border-box;}

#${MENU_ID} .window-content{
  position:relative;
  padding:0;
  overflow:hidden;
  background:var(--sao-void);
  color:var(--sao-ink);
}

#${MENU_ID} .window-header{
  background:linear-gradient(180deg,#121922,#070a10);
  border-bottom:1px solid var(--sao-line);
}

#${MENU_ID} .window-header .window-title{
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-sm);
  font-weight:700;
  letter-spacing:var(--sao-track-wide);
  color:var(--sao-gold);
}

#${MENU_ID} .window-header a,
#${MENU_ID} .window-header button{color:var(--sao-ink-2);}

#${MENU_ID} .window-header a:hover,
#${MENU_ID} .window-header button:hover{color:var(--sao-gold-lt);}

/* ----------------------------------------------------------
   OVERLAY / MAIN
   ---------------------------------------------------------- */

#${MENU_ID} .sao-overlay{
  position:absolute;
  inset:0;
  overflow:hidden;
  background:
    radial-gradient(
      ellipse at 50% 0%,
      rgba(232,179,57,.10),
      transparent 55%
    ),
    linear-gradient(
      180deg,
      #080c14 0%,
      #05070c 60%,
      #04060a 100%
    );
}

#${MENU_ID} .sao-overlay::after{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0 3px,
      rgba(255,255,255,.014) 3px 4px
    );
}

#${MENU_ID} .sao-main{
  position:absolute;
  inset:0;
}

/* ----------------------------------------------------------
   COLUNA ESQUERDA
   ---------------------------------------------------------- */

#${MENU_ID} .sao-left{
  position:absolute;
  left:22px;
  top:20px;
  bottom:74px;
  width:30%;
  min-width:330px;
}

#${MENU_ID} .sao-player-card,
#${MENU_ID} .sao-system-info,
#${MENU_ID} .sao-panel-header{
  background:
    linear-gradient(
      150deg,
      var(--sao-panel-3),
      var(--sao-panel)
    );
  border:1px solid var(--sao-line-soft);
  border-top-color:var(--sao-line);
  border-radius:var(--sao-radius);
  box-shadow:
    0 18px 44px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.04);
}

#${MENU_ID} .sao-player-card{
  height:58%;
  overflow:hidden;
}

#${MENU_ID} .sao-card-header{
  height:58px;
  padding:12px 20px;
  border-bottom:1px solid var(--sao-line-soft);
}

#${MENU_ID} .sao-card-header span{
  display:block;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-2xs);
  font-weight:700;
  letter-spacing:var(--sao-track-wide);
  color:var(--sao-gold);
}

#${MENU_ID} .sao-card-header strong{
  display:block;
  margin-top:5px;
  font-size:var(--sao-fs-lg);
  font-weight:600;
  letter-spacing:.06em;
  color:var(--sao-ink);
}

#${MENU_ID} .sao-avatar-area{
  height:calc(100% - 58px);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  position:relative;
}

#${MENU_ID} .sao-avatar-ring{
  position:absolute;
  width:190px;
  height:190px;
  border-radius:50%;
  border:1px solid var(--sao-line);
  box-shadow:0 0 34px rgba(232,179,57,.16);
  transform:rotateX(65deg);
  pointer-events:none;
}

#${MENU_ID} .sao-avatar{
  position:relative;
  max-width:170px;
  max-height:180px;
  object-fit:contain;
  filter:drop-shadow(0 10px 10px rgba(0,0,0,.55));
  cursor:pointer;
}

#${MENU_ID} .sao-player-name{
  cursor:pointer;
  margin-top:8px;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-xl);
  font-weight:700;
  letter-spacing:.14em;
  color:var(--sao-ink);
}

#${MENU_ID} .sao-player-level{
  margin-top:5px;
  font-size:var(--sao-fs-xs);
  letter-spacing:var(--sao-track-wide);
  color:var(--sao-gold);
}

#${MENU_ID} .sao-system-info{
  position:absolute;
  bottom:0;
  width:100%;
  height:39%;
  padding:18px;
}

#${MENU_ID} .sao-system-info > div{
  height:25%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid var(--sao-line-soft);
}

#${MENU_ID} .sao-system-info > div:last-child{border-bottom:0;}

#${MENU_ID} .sao-system-info span{
  font-size:var(--sao-fs-xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-system-info strong{
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-md);
  font-weight:500;
  letter-spacing:.06em;
  color:var(--sao-ink);
}

#${MENU_ID} .sao-online{color:var(--sao-ok);}

/* ----------------------------------------------------------
   CENTRO  PAINEL
   ---------------------------------------------------------- */

#${MENU_ID} .sao-content{
  position:absolute;
  left:36%;
  right:14.5%;
  top:20px;
  bottom:60px;
}

#${MENU_ID} .sao-panel-header{
  height:76px;
  padding:14px 22px;
  overflow:hidden;
}

#${MENU_ID} .sao-panel-title{
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-2xl);
  font-weight:700;
  letter-spacing:.14em;
  line-height:1.1;
  color:var(--sao-gold);
}

#${MENU_ID} .sao-panel-subtitle{
  margin-top:6px;
  font-size:var(--sao-fs-xs);
  letter-spacing:var(--sao-track-wide);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-tabs{
  height:40px;
  display:flex;
  gap:4px;
  margin-top:7px;
}

#${MENU_ID} .sao-tab{
  flex:1;
  border:1px solid var(--sao-line-soft);
  background:var(--sao-surface);
  color:var(--sao-ink-2);
  cursor:pointer;
  font-family:var(--sao-font-ui);
  font-size:var(--sao-fs-sm);
  font-weight:600;
  letter-spacing:var(--sao-track);
  border-radius:3px;
  transition:
    background .15s var(--sao-ease),
    color .15s var(--sao-ease);
}

#${MENU_ID} .sao-tab:hover{
  background:var(--sao-surface-2);
  color:var(--sao-ink);
}

#${MENU_ID} .sao-tab.active{
  background:var(--sao-gold);
  border-color:var(--sao-gold-lt);
  color:#0a0e16;
}

#${MENU_ID} .sao-panel-body{
  position:absolute;
  top:123px;
  bottom:0;
  width:100%;
  overflow:hidden;
  background:
    linear-gradient(
      160deg,
      rgba(255,255,255,.035),
      rgba(0,0,0,.25)
    );
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
}

#${MENU_ID} .sao-scroll{
  height:100%;
  overflow-y:auto;
  padding:8px;
}

#${MENU_ID} .sao-scroll::-webkit-scrollbar,
#${MENU_ID} .sao-floor-column::-webkit-scrollbar,
#${MENU_ID} .sao-contact-list::-webkit-scrollbar,
#${MENU_ID} .sao-chat-history::-webkit-scrollbar,
#${MENU_ID} .sao-modal-box::-webkit-scrollbar{width:6px;}

#${MENU_ID} .sao-scroll::-webkit-scrollbar-track,
#${MENU_ID} .sao-floor-column::-webkit-scrollbar-track,
#${MENU_ID} .sao-contact-list::-webkit-scrollbar-track,
#${MENU_ID} .sao-chat-history::-webkit-scrollbar-track,
#${MENU_ID} .sao-modal-box::-webkit-scrollbar-track{
  background:rgba(255,255,255,.04);
}

#${MENU_ID} .sao-scroll::-webkit-scrollbar-thumb,
#${MENU_ID} .sao-floor-column::-webkit-scrollbar-thumb,
#${MENU_ID} .sao-contact-list::-webkit-scrollbar-thumb,
#${MENU_ID} .sao-chat-history::-webkit-scrollbar-thumb,
#${MENU_ID} .sao-modal-box::-webkit-scrollbar-thumb{
  background:var(--sao-gold-dim);
  border-radius:3px;
}

/* ----------------------------------------------------------
   STATUS / ABILITIES / SKILLS
   ---------------------------------------------------------- */

#${MENU_ID} .sao-stat-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:6px;
}

#${MENU_ID} .sao-stat{
  padding:12px;
  min-height:78px;
  background:
    linear-gradient(
      150deg,
      rgba(255,255,255,.07),
      rgba(255,255,255,.02)
    );
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
}

#${MENU_ID} .sao-stat-label{
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-stat-value{
  margin-top:8px;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-2xl);
  font-weight:700;
  color:var(--sao-ink);
}

#${MENU_ID} .sao-stat-value small{
  font-size:var(--sao-fs-md);
  font-weight:500;
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-section-title{
  margin:16px 0 8px;
  padding-bottom:6px;
  border-bottom:1px solid var(--sao-line);
  color:var(--sao-gold);
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-xs);
  font-weight:700;
  letter-spacing:var(--sao-track-wide);
}

#${MENU_ID} .sao-abilities{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:6px;
}

#${MENU_ID} .sao-ability{
  padding:10px 6px;
  text-align:center;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
}

#${MENU_ID} .sao-ability-name{
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-ability-value{
  margin-top:6px;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-xl);
  font-weight:700;
  color:var(--sao-ink);
}

#${MENU_ID} .sao-ability-mod{
  margin-top:2px;
  color:var(--sao-gold);
  font-size:var(--sao-fs-sm);
  font-weight:600;
}

#${MENU_ID} .sao-skills{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:6px;
}

#${MENU_ID} .sao-skill-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:9px 11px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
  font-size:var(--sao-fs-sm);
}

#${MENU_ID} .sao-skill-row strong{
  font-family:var(--sao-font-display);
  color:var(--sao-gold);
}

/* ----------------------------------------------------------
   INFO CARDS / ACTIONS
   ---------------------------------------------------------- */

#${MENU_ID} .sao-info-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:6px;
}

#${MENU_ID} .sao-info-card{
  padding:12px;
  min-height:72px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
}

#${MENU_ID} .sao-info-card span{
  display:block;
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-info-card strong{
  display:block;
  margin-top:8px;
  font-size:var(--sao-fs-md);
  font-weight:600;
  color:var(--sao-ink);
  word-break:break-word;
}

#${MENU_ID} .sao-action{
  border:1px solid var(--sao-line-soft);
  min-height:34px;
  padding:8px 14px;
  background:var(--sao-surface);
  color:var(--sao-ink-2);
  cursor:pointer;
  font-family:var(--sao-font-ui);
  font-size:var(--sao-fs-sm);
  font-weight:600;
  letter-spacing:var(--sao-track);
  border-radius:3px;
  transition:
    background .15s var(--sao-ease),
    color .15s var(--sao-ease),
    border-color .15s var(--sao-ease);
}

#${MENU_ID} .sao-action:hover{
  background:var(--sao-gold);
  border-color:var(--sao-gold-lt);
  color:#0a0e16;
}

#${MENU_ID} .sao-action.primary{
  background:var(--sao-gold);
  border-color:var(--sao-gold-lt);
  color:#0a0e16;
}

#${MENU_ID} .sao-action.primary:hover{background:var(--sao-gold-lt);}

#${MENU_ID} .sao-action.danger{
  background:rgba(209,82,74,.18);
  border-color:rgba(209,82,74,.5);
  color:#ffb1ab;
}

#${MENU_ID} .sao-action.danger:hover{
  background:var(--sao-danger);
  color:#fff;
}

#${MENU_ID} .sao-party-toolbar{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-bottom:10px;
}

/* ----------------------------------------------------------
   ITENS
   ---------------------------------------------------------- */

#${MENU_ID} .sao-item{
  display:flex;
  align-items:center;
  min-height:58px;
  margin-bottom:5px;
  padding:8px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
  cursor:pointer;
  transition:
    background .14s var(--sao-ease),
    color .14s var(--sao-ease);
}

#${MENU_ID} .sao-item:hover{
  background:var(--sao-gold);
  color:#0a0e16;
}

#${MENU_ID} .sao-item img{
  width:42px;
  height:42px;
  object-fit:contain;
  margin-right:11px;
  background:rgba(0,0,0,.25);
  border:1px solid var(--sao-line-soft);
  border-radius:3px;
}

#${MENU_ID} .sao-item-main{
  flex:1;
  min-width:0;
}

#${MENU_ID} .sao-item-name{
  font-size:var(--sao-fs-md);
  font-weight:600;
}

#${MENU_ID} .sao-item-type{
  margin-top:4px;
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-item:hover .sao-item-type{color:rgba(10,14,22,.65);}

#${MENU_ID} .sao-item-qty{
  width:46px;
  text-align:center;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-md);
}

#${MENU_ID} .sao-edit-input{
  width:100%;
  padding:2px 6px;
  border:1px solid var(--sao-gold-dim);
  border-radius:3px;
  background:rgba(0,0,0,.45);
  color:var(--sao-ink);
  font-family:var(--sao-font-ui);
  font-size:inherit;
}

#${MENU_ID} .sao-item-delete{
  margin-left:8px;
  border:0;
  background:transparent;
  color:var(--sao-ink-3);
  cursor:pointer;
}

#${MENU_ID} .sao-item-delete:hover{
  color:var(--sao-danger);
}

#${MENU_ID} .sao-inventory-actions{
  display:flex;
  justify-content:flex-end;
  margin-bottom:10px;
}

#${MENU_ID} .sao-equipped{
  display:inline-block;
  margin-left:6px;
  padding:2px 6px;
  background:var(--sao-gold);
  color:#0a0e16;
  font-size:var(--sao-fs-2xs);
  font-weight:700;
  letter-spacing:.08em;
  border-radius:2px;
  vertical-align:middle;
}

#${MENU_ID} .sao-item:hover .sao-equipped{
  background:#0a0e16;
  color:var(--sao-gold-lt);
}

/* ----------------------------------------------------------
   EQUIPMENT / PAPER DOLL
   ---------------------------------------------------------- */

#${MENU_ID} .sao-equip-layout{
  display:grid;
  grid-template-columns:46% 54%;
  min-height:100%;
}

#${MENU_ID} .sao-doll-panel{
  position:relative;
  padding:12px;
  background:
    linear-gradient(
      180deg,
      rgba(232,179,57,.05),
      rgba(0,0,0,.45)
    );
  border-right:1px solid var(--sao-line-soft);
}

#${MENU_ID} .sao-doll-title{
  color:var(--sao-ink);
  text-align:center;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-sm);
  font-weight:700;
  letter-spacing:var(--sao-track-wide);
  margin-bottom:10px;
}

#${MENU_ID} .sao-doll{
  position:relative;
  height:430px;
  min-height:380px;
  background:
    radial-gradient(
      ellipse at center,
      rgba(232,179,57,.12),
      transparent 55%
    );
}

#${MENU_ID} .sao-doll-glow{
  position:absolute;
  left:50%;
  top:50%;
  width:210px;
  height:320px;
  transform:translate(-50%,-50%);
  border-radius:50%;
  border:1px solid rgba(232,179,57,.28);
  box-shadow:0 0 44px rgba(232,179,57,.10);
}

#${MENU_ID} .sao-doll-character{
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  max-width:210px;
  max-height:310px;
  object-fit:contain;
  filter:drop-shadow(0 12px 18px rgba(0,0,0,.6));
}

#${MENU_ID} .sao-equip-slot{
  position:absolute;
  width:92px;
  height:62px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  border:1px dashed rgba(233,238,246,.28);
  background:rgba(10,14,22,.72);
  color:var(--sao-ink-3);
  border-radius:4px;
  cursor:pointer;
  transition:
    border-color .15s var(--sao-ease),
    color .15s var(--sao-ease),
    transform .15s var(--sao-ease);
}

#${MENU_ID} .sao-equip-slot:hover{
  border-color:var(--sao-gold);
  border-style:solid;
  color:var(--sao-ink);
  transform:scale(1.04);
}

#${MENU_ID} .sao-equip-slot.filled{
  border-style:solid;
  border-color:rgba(232,179,57,.8);
  background:rgba(232,179,57,.10);
}

#${MENU_ID} .sao-equip-slot i{font-size:var(--sao-fs-md);}

#${MENU_ID} .sao-equip-slot img{
  width:36px;
  height:36px;
  object-fit:contain;
}

#${MENU_ID} .sao-equip-slot .slot-label{
  max-width:84px;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  font-size:var(--sao-fs-2xs);
  text-align:center;
}

#${MENU_ID} .sao-slot-head{
  left:50%;
  top:8px;
  transform:translateX(-50%);
}

#${MENU_ID} .sao-slot-head:hover{transform:translateX(-50%) scale(1.04);}

#${MENU_ID} .sao-slot-lhand{
  left:0;
  top:180px;
}

#${MENU_ID} .sao-slot-rhand{
  right:0;
  top:180px;
}

#${MENU_ID} .sao-slot-armor{
  left:50%;
  top:245px;
  transform:translateX(-50%);
}

#${MENU_ID} .sao-slot-armor:hover{transform:translateX(-50%) scale(1.04);}

#${MENU_ID} .sao-slot-acc1{
  left:10px;
  bottom:25px;
}

#${MENU_ID} .sao-slot-acc2{
  right:10px;
  bottom:25px;
}

#${MENU_ID} .sao-slot-feet{
  left:50%;
  bottom:25px;
  transform:translateX(-50%);
}

#${MENU_ID} .sao-slot-feet:hover{transform:translateX(-50%) scale(1.04);}

#${MENU_ID} .sao-doll-stats{
  margin-top:8px;
  padding:9px;
  background:rgba(0,0,0,.35);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
  color:var(--sao-ink-2);
}

#${MENU_ID} .sao-mini-stat{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:6px;
}

#${MENU_ID} .sao-mini-stat > div{text-align:center;}

#${MENU_ID} .sao-mini-stat span{
  display:block;
  font-size:var(--sao-fs-2xs);
  letter-spacing:.08em;
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-mini-stat strong{
  display:block;
  margin-top:4px;
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-md);
  color:var(--sao-gold-lt);
}

#${MENU_ID} .sao-inventory-panel{padding:12px;}

#${MENU_ID} .sao-inventory-title{
  color:var(--sao-gold);
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-md);
  font-weight:700;
  letter-spacing:var(--sao-track-wide);
  margin-bottom:8px;
}

#${MENU_ID} .sao-equip-filter{
  display:flex;
  gap:5px;
  margin-bottom:10px;
}

#${MENU_ID} .sao-equip-filter button{
  flex:1;
  border:1px solid var(--sao-line-soft);
  padding:8px 6px;
  background:var(--sao-surface);
  color:var(--sao-ink-2);
  cursor:pointer;
  font-family:var(--sao-font-ui);
  font-size:var(--sao-fs-xs);
  font-weight:600;
  letter-spacing:.06em;
  border-radius:3px;
}

#${MENU_ID} .sao-equip-filter button:hover,
#${MENU_ID} .sao-equip-filter button.active{
  background:var(--sao-gold);
  border-color:var(--sao-gold-lt);
  color:#0a0e16;
}

#${MENU_ID} .sao-inventory-grid{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:6px;
}

#${MENU_ID} .sao-inv-slot{
  position:relative;
  aspect-ratio:1;
  display:flex;
  align-items:center;
  justify-content:center;
  background:
    linear-gradient(
      150deg,
      rgba(255,255,255,.07),
      rgba(255,255,255,.02)
    );
  border:1px solid var(--sao-line-soft);
  border-radius:4px;
  cursor:pointer;
  transition:
    background .14s var(--sao-ease),
    transform .14s var(--sao-ease);
}

#${MENU_ID} .sao-inv-slot:hover{
  background:var(--sao-gold);
  transform:scale(1.03);
}

#${MENU_ID} .sao-inv-slot img{
  width:78%;
  height:78%;
  object-fit:contain;
  filter:drop-shadow(0 3px 4px rgba(0,0,0,.5));
}

#${MENU_ID} .sao-inv-slot .eq-dot{
  position:absolute;
  left:4px;
  top:4px;
  width:8px;
  height:8px;
  border-radius:50%;
  background:var(--sao-gold);
  box-shadow:0 0 6px var(--sao-gold);
}

#${MENU_ID} .sao-inv-slot .qty{
  position:absolute;
  right:3px;
  bottom:2px;
  padding:1px 4px;
  background:#0a0e16;
  color:var(--sao-gold-lt);
  font-size:var(--sao-fs-2xs);
  border-radius:2px;
}

/* ----------------------------------------------------------
   PARTY
   ---------------------------------------------------------- */

#${MENU_ID} .sao-party-member{
  display:flex;
  align-items:center;
  min-height:78px;
  margin-bottom:6px;
  padding:9px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
  cursor:pointer;
  transition:
    background .14s var(--sao-ease),
    color .14s var(--sao-ease);
}

#${MENU_ID} .sao-party-member:hover{
  background:var(--sao-gold);
  color:#0a0e16;
}

#${MENU_ID} .sao-party-avatar{
  width:56px;
  height:56px;
  object-fit:cover;
  margin-right:12px;
  border-radius:4px;
  border:1px solid var(--sao-line);
}

#${MENU_ID} .sao-party-main{
  flex:1;
  min-width:0;
}

#${MENU_ID} .sao-party-name{
  font-size:var(--sao-fs-lg);
  font-weight:600;
}

#${MENU_ID} .sao-party-details{
  margin-top:5px;
  font-size:var(--sao-fs-xs);
  letter-spacing:.04em;
  color:var(--sao-ink-2);
}

#${MENU_ID} .sao-party-member:hover .sao-party-details{color:rgba(10,14,22,.7);}

#${MENU_ID} .sao-party-hp{width:130px;}

#${MENU_ID} .sao-hp-bar{
  height:8px;
  background:rgba(0,0,0,.45);
  border:1px solid var(--sao-line-soft);
  border-radius:4px;
  overflow:hidden;
}

#${MENU_ID} .sao-hp-fill{
  height:100%;
  background:linear-gradient(90deg,#8a6a12,var(--sao-gold),var(--sao-gold-lt));
}

#${MENU_ID} .sao-party-status{
  margin-top:4px;
  text-align:right;
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

/* ----------------------------------------------------------
   MESSAGES
   ---------------------------------------------------------- */

#${MENU_ID} .sao-message-layout{
  display:grid;
  grid-template-columns:180px 1fr;
  height:100%;
}

#${MENU_ID} .sao-contact-list{
  overflow-y:auto;
  padding:6px;
  background:rgba(0,0,0,.28);
  border-right:1px solid var(--sao-line-soft);
}

#${MENU_ID} .sao-contact{
  display:flex;
  align-items:center;
  min-height:50px;
  margin-bottom:3px;
  padding:7px;
  color:var(--sao-ink-2);
  border-radius:3px;
  cursor:pointer;
  transition:
    background .14s var(--sao-ease),
    color .14s var(--sao-ease);
}

#${MENU_ID} .sao-contact:hover,
#${MENU_ID} .sao-contact.active{
  background:var(--sao-gold);
  color:#0a0e16;
}

#${MENU_ID} .sao-contact img{
  width:34px;
  height:34px;
  object-fit:cover;
  margin-right:9px;
  border-radius:50%;
  border:1px solid var(--sao-line);
}

#${MENU_ID} .sao-contact-name{
  font-size:var(--sao-fs-md);
  font-weight:600;
}

#${MENU_ID} .sao-chat{
  display:flex;
  flex-direction:column;
  min-width:0;
  background:rgba(0,0,0,.18);
}

#${MENU_ID} .sao-chat-header{
  height:48px;
  display:flex;
  align-items:center;
  padding:12px 14px;
  background:rgba(255,255,255,.05);
  border-bottom:1px solid var(--sao-line-soft);
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-sm);
  letter-spacing:var(--sao-track);
  color:var(--sao-gold);
}

#${MENU_ID} .sao-chat-history{
  flex:1;
  overflow-y:auto;
  padding:12px;
}

#${MENU_ID} .sao-chat-message{
  max-width:80%;
  margin-bottom:9px;
  padding:9px 12px;
  background:rgba(255,255,255,.07);
  border:1px solid var(--sao-line-soft);
  border-radius:8px;
  font-size:var(--sao-fs-md);
}

#${MENU_ID} .sao-chat-message.mine{
  margin-left:auto;
  background:rgba(232,179,57,.9);
  border-color:var(--sao-gold-lt);
  color:#0a0e16;
}

#${MENU_ID} .sao-chat-author{
  margin-bottom:4px;
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  opacity:.7;
}

#${MENU_ID} .sao-chat-input{
  display:flex;
  gap:5px;
  padding:8px;
  background:rgba(255,255,255,.05);
  border-top:1px solid var(--sao-line-soft);
}

#${MENU_ID} .sao-chat-input input{
  flex:1;
  height:38px;
  border:1px solid var(--sao-line-soft);
  border-radius:3px;
  padding:8px 11px;
  background:rgba(0,0,0,.4);
  color:var(--sao-ink);
  font-family:var(--sao-font-ui);
  font-size:var(--sao-fs-md);
}

#${MENU_ID} .sao-chat-input input:focus{
  outline:none;
  border-color:var(--sao-gold);
  box-shadow:0 0 0 2px rgba(232,179,57,.18);
}

#${MENU_ID} .sao-send{
  width:74px;
  border:1px solid var(--sao-line-soft);
  border-radius:3px;
  background:var(--sao-surface);
  color:var(--sao-ink-2);
  cursor:pointer;
  font-family:var(--sao-font-ui);
  font-size:var(--sao-fs-sm);
  font-weight:700;
  letter-spacing:var(--sao-track);
}

#${MENU_ID} .sao-send:hover{
  background:var(--sao-gold);
  color:#0a0e16;
}

#${MENU_ID} .sao-send:disabled,
#${MENU_ID} .sao-chat-input input:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* ----------------------------------------------------------
   SKILLS / QUEST / MAIL CARDS
   ---------------------------------------------------------- */

#${MENU_ID} .sao-skill-card{
  display:flex;
  align-items:center;
  padding:12px;
  margin-bottom:6px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
}

#${MENU_ID} .sao-skill-icon{
  width:46px;
  height:46px;
  margin-right:12px;
  border-radius:5px;
  object-fit:cover;
  border:1px solid var(--sao-line);
  background:rgba(0,0,0,.4);
}

#${MENU_ID} .sao-skill-main{
  flex:1;
  min-width:0;
}

#${MENU_ID} .sao-skill-name{
  font-size:var(--sao-fs-lg);
  font-weight:600;
}

#${MENU_ID} .sao-skill-sub{
  margin-top:5px;
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-quest{
  padding:14px;
  margin-bottom:6px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
  cursor:pointer;
  transition:
    background .14s var(--sao-ease),
    color .14s var(--sao-ease);
}

#${MENU_ID} .sao-quest:hover{
  background:var(--sao-gold);
  color:#0a0e16;
}

#${MENU_ID} .sao-quest-main{flex:1;}

#${MENU_ID} .sao-quest-title{
  font-size:var(--sao-fs-lg);
  font-weight:600;
}

#${MENU_ID} .sao-quest-sub{
  margin-top:5px;
  font-size:var(--sao-fs-sm);
  color:var(--sao-ink-2);
}

#${MENU_ID} .sao-quest:hover .sao-quest-sub{color:rgba(10,14,22,.72);}

#${MENU_ID} .sao-quest-bar{
  height:8px;
  margin-top:9px;
  background:rgba(0,0,0,.4);
  border-radius:4px;
  overflow:hidden;
}

#${MENU_ID} .sao-quest-fill{
  height:100%;
  background:linear-gradient(90deg,#8a6a12,var(--sao-gold),var(--sao-gold-lt));
}

#${MENU_ID} .sao-mail{
  display:flex;
  align-items:center;
  padding:12px;
  margin-bottom:6px;
  background:var(--sao-surface);
  border:1px solid var(--sao-line-soft);
  border-radius:var(--sao-radius);
  cursor:pointer;
}

#${MENU_ID} .sao-mail:hover{
  background:var(--sao-gold);
  color:#0a0e16;
}

#${MENU_ID} .sao-mail-icon{
  width:46px;
  height:46px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,.4);
  border:1px solid var(--sao-line);
  border-radius:4px;
  color:var(--sao-gold);
  margin-right:11px;
}

#${MENU_ID} .sao-mail.unread{border-left:4px solid var(--sao-gold);}

#${MENU_ID} .sao-mail-title{
  font-size:var(--sao-fs-md);
  font-weight:600;
}

#${MENU_ID} .sao-mail-sub{
  margin-top:4px;
  font-size:var(--sao-fs-2xs);
  letter-spacing:.06em;
  color:var(--sao-ink-3);
}

/* ----------------------------------------------------------
   MAP
   ---------------------------------------------------------- */

#${MENU_ID} .sao-world-map{
  position:relative;
  width:100%;
  height:100%;
  overflow:hidden;
  background:
    radial-gradient(
      ellipse at center,
      rgba(232,179,57,.12),
      transparent 50%
    ),
    #06090f;
}

#${MENU_ID} .sao-world-map::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.5;
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0 40px,
      var(--sao-line-soft) 40px 41px
    );
}

#${MENU_ID} .sao-aincrad-title{
  position:absolute;
  top:14px;
  left:22px;
  z-index:5;
  color:var(--sao-gold);
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-xl);
  font-weight:700;
  letter-spacing:.28em;
}

#${MENU_ID} .sao-aincrad-subtitle{
  position:absolute;
  top:44px;
  left:23px;
  z-index:5;
  color:var(--sao-ink-3);
  font-size:var(--sao-fs-2xs);
  letter-spacing:var(--sao-track-wide);
}

#${MENU_ID} .sao-floor-column{
  position:absolute;
  top:70px;
  bottom:12px;
  left:50%;
  width:230px;
  transform:translateX(-50%);
  overflow-y:auto;
  padding:12px 30px;
}

#${MENU_ID} .sao-floor-node{
  position:relative;
  width:150px;
  min-height:52px;
  margin:0 auto 9px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border:1px solid var(--sao-line-soft);
  background:
    linear-gradient(
      90deg,
      rgba(255,255,255,.06),
      rgba(255,255,255,.015)
    );
  color:var(--sao-ink-2);
  border-radius:4px;
  cursor:pointer;
  font-size:var(--sao-fs-sm);
  letter-spacing:var(--sao-track);
  transition:
    border-color .14s var(--sao-ease),
    color .14s var(--sao-ease),
    transform .14s var(--sao-ease);
}

#${MENU_ID} .sao-floor-node:hover{
  border-color:var(--sao-gold);
  color:var(--sao-ink);
  transform:scale(1.04);
}

#${MENU_ID} .sao-floor-node.current{
  border-color:var(--sao-gold-lt);
  background:
    linear-gradient(
      90deg,
      rgba(232,179,57,.55),
      rgba(232,179,57,.22)
    );
  color:#fff;
  box-shadow:0 0 18px rgba(232,179,57,.25);
}

#${MENU_ID} .sao-floor-node.no-scenes{opacity:.45;}

#${MENU_ID} .sao-floor-number{
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-sm);
  color:var(--sao-gold);
}

/* ----------------------------------------------------------
   MODAL
   ---------------------------------------------------------- */

#${MENU_ID} .sao-modal{
  position:absolute;
  inset:0;
  z-index:100;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:22px;
  background:rgba(2,4,8,.8);
  backdrop-filter:blur(3px);
}

#${MENU_ID} .sao-modal-box{
  width:88%;
  max-width:760px;
  max-height:90%;
  overflow-y:auto;
  padding:22px;
  background:
    linear-gradient(
      150deg,
      #1b2331,
      #0c1119
    );
  border:1px solid var(--sao-line);
  border-radius:var(--sao-radius);
  box-shadow:0 24px 70px rgba(0,0,0,.7);
  color:var(--sao-ink);
}

#${MENU_ID} .sao-modal-title{
  font-family:var(--sao-font-display);
  font-size:var(--sao-fs-xl);
  font-weight:700;
  letter-spacing:.12em;
  color:var(--sao-gold);
}

#${MENU_ID} .sao-modal-sub{
  margin-top:6px;
  font-size:var(--sao-fs-xs);
  letter-spacing:var(--sao-track-wide);
  color:var(--sao-ink-3);
}

#${MENU_ID} .sao-modal-actions{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top:18px;
  justify-content:flex-end;
}

/* ----------------------------------------------------------
   TRILHA DIREITA / FECHAR
   ---------------------------------------------------------- */

#${MENU_ID} .sao-right{
  position:absolute;
  right:18px;
  top:18px;
  display:flex;
  flex-direction:column;
  gap:10px;
}

#${MENU_ID} .sao-round-button{
  position:relative;
  width:72px;
  height:72px;
  border-radius:50%;
  border:1px solid rgba(233,238,246,.22);
  background:rgba(10,14,22,.78);
  color:var(--sao-ink-2);
  cursor:pointer;
  transition:
    color .15s var(--sao-ease),
    transform .15s var(--sao-ease),
    border-color .15s var(--sao-ease),
    background .15s var(--sao-ease);
}

#${MENU_ID} .sao-round-button::before{
  content:"";
  position:absolute;
  inset:5px;
  border-radius:50%;
  border:1px solid rgba(233,238,246,.14);
}

#${MENU_ID} .sao-round-button i{
  position:relative;
  z-index:2;
  font-size:24px;
}

#${MENU_ID} .sao-round-button:hover{
  color:var(--sao-ink);
  border-color:var(--sao-gold);
  transform:scale(1.04);
}

#${MENU_ID} .sao-round-button.active{
  background:var(--sao-gold);
  border-color:var(--sao-gold-lt);
  color:#0a0e16;
  box-shadow:0 0 22px rgba(232,179,57,.4);
}

#${MENU_ID} .sao-round-button.active::after{
  content:"";
  position:absolute;
  left:-20px;
  top:50%;
  transform:translateY(-50%);
  border-top:9px solid transparent;
  border-bottom:9px solid transparent;
  border-right:16px solid var(--sao-gold);
}

#${MENU_ID} .sao-close-button{
  width:56px;
  height:56px;
  margin-top:16px;
  font-size:30px;
  line-height:1;
}

#${MENU_ID} .sao-cancel-button{
  width:56px;
  height:56px;
  font-size:22px;
}

#${MENU_ID} .sao-message-count{
  position:absolute;
  top:-4px;
  right:-4px;
  min-width:22px;
  height:22px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  background:var(--sao-danger);
  border:2px solid #0a0e16;
  color:#fff;
  font-size:var(--sao-fs-2xs);
  font-weight:700;
  z-index:5;
}

#${MENU_ID} .sao-empty{
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
  color:var(--sao-ink-3);
  text-align:center;
  font-size:var(--sao-fs-sm);
  letter-spacing:var(--sao-track-wide);
}

  `;
    document.head.appendChild(style);
}
// ==========================================================
// FLOOR
// ==========================================================
function detectFloor(scene) {
    const name = scene?.name ?? '';
    let match = name.match(/(?:floor|andar|piso|camada)[\s\-_]*(\d+)/i);
    if (match) return Number(match[1]);
    match = name.match(/(\d+)\s*(?:º|°|o)?\s*(?:andar|floor|piso)/i);
    if (match) return Number(match[1]);
    match = name.match(/\bF[\s\-_]*(\d+)\b/i);
    if (match) return Number(match[1]);
    return 0;
}

function getFloorScenes(floor) {
    return game.scenes.contents.filter((scene) => detectFloor(scene) === floor);
}

function updateWorldInfo() {
    const scene = activeScene();
    const floor = detectFloor(scene);
    const floorElement = document.getElementById('sao-floor-display');
    if (floorElement) {
        floorElement.textContent = floor ? String(floor).padStart(2, '0') : '--';
    }
    const hpElement = document.getElementById('sao-hp-display');
    if (hpElement) {
        hpElement.textContent = hp(getActor()).value ?? 0;
    }
}
// ==========================================================
// PLAYER
// ==========================================================
const castEdit = (value, type) =>
    type === 'text' ? value.trim() : Number.isFinite(Number(value)) ? Number(value) : 0;

const escAttr = (value) => foundry.utils.escapeHTML(String(value ?? ''));

function editInput(path, value, type = 'number') {
    const inputType = type === 'text' ? 'text' : 'number';
    return `<input class="sao-edit-input" data-edit data-path="${path}" data-type="${type}" type="${inputType}" value="${escAttr(value)}">`;
}

function syncEditButtons(root) {
    const toggle = root?.querySelector('[data-edit-toggle]');
    if (toggle) {
        toggle.innerHTML = `<i class="fas ${editMode ? 'fa-check' : 'fa-pen'}"></i>`;
        toggle.classList.toggle('active', editMode);
        toggle.title = editMode ? 'Salvar' : 'Editar';
    }
    const cancel = root?.querySelector('[data-edit-cancel]');
    if (cancel) cancel.hidden = !editMode;
}
/** Re-renderiza o tab atual do player (ou o equipamento). */
function rerenderPlayer() {
    const content = document.getElementById('sao-content');
    const tab = content?.querySelector('[data-player-tab].active')?.dataset.playerTab;
    return tab ? renderPlayer(tab) : renderEquipment();
}
async function savePlayerEdits(content, target = actor ?? getActor()) {
    if (!canEditActor(target))
        return ui.notifications.warn('SAO SYSTEM | Sem permissão para editar.');
    const updates = {};
    content.querySelectorAll('[data-edit][data-path]').forEach((input) => {
        updates[input.dataset.path] = castEdit(input.value, input.dataset.type);
    });
    try {
        await target.update(updates);
    } catch (error) {
        console.error('SAO PLAYER SAVE', error);
        ui.notifications.error(`Não foi possível salvar as alterações: ${error?.message ?? error}`);
        return;
    }
    editMode = false;
    rerenderPlayer();
}
async function deleteActorItem(itemId) {
    const target = actor ?? getActor();
    if (!canEditActor(target))
        return ui.notifications.warn('SAO SYSTEM | Sem permissão para editar.');
    const item = target.items.get(itemId);
    if (!item) return;
    const confirmed = await DialogV2.confirm({
        window: {
            title: 'EXCLUIR ITEM',
        },
        content: `<p>Excluir <strong>${esc(item.name)}</strong>?</p>`,
    }).catch(() => false);
    if (!confirmed) return;
    try {
        await item.delete();
    } catch (error) {
        console.error('SAO ITEM DELETE', error);
        ui.notifications.error(`Não foi possível excluir o item: ${error?.message ?? error}`);
        return;
    }
    renderPlayer('inventory');
}
const ITEM_DEFAULTS = {
    weapon: { name: 'Nova arma', img: 'icons/svg/sword.svg' },
    equipment: { name: 'Novo equipamento', img: 'icons/svg/chest.svg' },
    consumable: { name: 'Novo consumível', img: 'icons/svg/potion.svg' },
};
async function createActorItem() {
    const target = actor ?? getActor();
    if (!canEditActor(target))
        return ui.notifications.warn('SAO SYSTEM | Sem permissão para editar.');
    const type = await DialogV2.prompt({
        window: { title: 'NOVO ITEM' },
        content: `
            <select name="type" style="width:100%">
                ${Object.entries(TGO.itemTypes)
                    .map(
                        ([id, label]) =>
                            `<option value="${id}">${game.i18n.localize(label)}</option>`
                    )
                    .join('')}
            </select>`,
        ok: {
            label: 'CRIAR',
            callback: (event, button) => button.form.elements.type.value,
        },
    }).catch(() => null);
    if (!type) return;
    try {
        const defaults = ITEM_DEFAULTS[type] ?? ITEM_DEFAULTS.equipment;
        const [item] = await target.createEmbeddedDocuments('Item', [
            {
                name: defaults.name,
                type,
                img: defaults.img,
            },
        ]);
        item?.sheet?.render({
            force: true,
        });
        renderPlayer('inventory');
    } catch (error) {
        console.error('SAO ITEM CREATE', error);
        ui.notifications.error(`Não foi possível criar o item: ${error?.message ?? error}`);
    }
}

function renderPlayer(tab = 'status') {
    actor ??= getActor();
    const s = menuView(actor);
    const editable = editMode && canEditActor(actor);
    const content = document.getElementById('sao-content');
    const abilities = [
        ['str', 'FOR'],
        ['agi', 'AGI'],
        ['vit', 'VIT'],
        ['mind', 'MEN'],
    ];
    const abilityHTML = abilities
        .map(([key, label]) => {
            const a = s.abilities?.[key] ?? {};
            const value = a.value ?? 10;
            const mod = a.mod ?? Math.floor((value - 10) / 2);
            return `

            <div
              class="sao-ability"
              data-ability="${key}"
              data-ability-label="${label}"
              title="Rolar ${label}"
              style="cursor:pointer"
            >

              <div class="sao-ability-name">
                ${label}
              </div>

              <div class="sao-ability-value">
                ${editable ? editInput(`system.attributes.${key}.value`, value) : value}
              </div>

              <div class="sao-ability-mod">
                ${modifier(mod)}
              </div>

            </div>

          `;
        })
        .join('');
    let body = '';
    // STATUS
    if (tab === 'status') {
        const skills = Object.entries(s.skills ?? {})
            .map(
                ([key, skill]) => `

              <div class="sao-skill-row">

                <span>
                  ${esc(skill.label ?? key)}
                </span>

                <strong>
                  ${modifier(skill.total ?? skill.mod ?? 0)}
                </strong>

              </div>

            `
            )
            .join('');
        body = `

        <div class="sao-stat-grid">

          <div class="sao-stat">

            <div class="sao-stat-label">
              HP
            </div>

            <div class="sao-stat-value">
              ${editable ? editInput('system.health.value', s.attributes?.hp?.value ?? 0, 'pool') : (s.attributes?.hp?.value ?? 0)}

              <small>
                /
                ${editable ? editInput('system.health.max', s.attributes?.hp?.max ?? 0, 'pool') : (s.attributes?.hp?.max ?? 0)}
              </small>
            </div>

          </div>

          <div class="sao-stat">

            <div class="sao-stat-label">
              ARMOR
            </div>

            <div class="sao-stat-value">
              ${s.attributes?.ac?.value ?? 10}
            </div>

          </div>

          <div class="sao-stat">

            <div class="sao-stat-label">
              LEVEL
            </div>

            <div class="sao-stat-value">
              ${editable ? editInput('system.level', level(actor)) : level(actor)}
            </div>

          </div>

          <div class="sao-stat">

            <div class="sao-stat-label">
              PROFICIENCY
            </div>

            <div class="sao-stat-value">
              ${modifier(s.attributes?.prof ?? 0)}
            </div>

          </div>

          <div class="sao-stat">

            <div class="sao-stat-label">
              SPEED
            </div>

            <div class="sao-stat-value">
              ${s.attributes?.movement?.walk ?? 30}
            </div>

          </div>

          <div class="sao-stat">

            <div class="sao-stat-label">
              INITIATIVE
            </div>

            <div class="sao-stat-value">
              ${modifier(s.attributes?.init?.total ?? s.abilities?.dex?.mod ?? 0)}
            </div>

          </div>

        </div>

        <div class="sao-section-title">
          ABILITIES
        </div>

        <div class="sao-abilities">
          ${abilityHTML}
        </div>

        <div class="sao-section-title">
          SKILLS
        </div>

        <div class="sao-skills">
          ${skills}
        </div>

      `;
    }
    // INFORMATION
    if (tab === 'information') {
        body = `

        <div class="sao-info-grid">

          <div class="sao-info-card">
            <span>NAME</span>
            <strong>
              ${esc(actor.name)}
            </strong>
          </div>

          <div class="sao-info-card">
            <span>CLASS</span>
            <strong>
              ${editable ? editInput('system.class.base', s.details?.class ?? '', 'text') : esc(s.details?.class ?? '')}
            </strong>
          </div>

          <div class="sao-info-card">
            <span>SUBCLASS</span>
            <strong>
              ${editable ? editInput('system.class.subclass', s.details?.subclass ?? '', 'text') : esc(s.details?.subclass ?? '')}
            </strong>
          </div>

          <div class="sao-info-card">
            <span>LEVEL</span>
            <strong>
              ${editable ? editInput('system.level', level(actor)) : level(actor)}
            </strong>
          </div>

          <div class="sao-info-card">
            <span>XP</span>
            <strong>
              ${editable ? editInput('system.xp', s.details?.xp?.value ?? 0) : (s.details?.xp?.value ?? 0)}
            </strong>
          </div>

          <div class="sao-info-card">
            <span>ALIGNMENT</span>
            <strong>
              ${editable ? editInput('system.details.alignment', s.details?.alignment ?? '', 'text') : esc(s.details?.alignment ?? '')}
            </strong>
          </div>

        </div>

      `;
    }
    // INVENTORY
    if (tab === 'inventory') {
        const items = actor.items.contents;
        body = `

        <div class="sao-inventory-actions">

          ${
              canEditActor(actor)
                  ? `
                <button
                  class="sao-action primary"
                  data-create-item
                >
                  <i class="fas fa-plus"></i>
                  NOVO ITEM
                </button>
              `
                  : ''
          }

        </div>

        ${
            items.length
                ? items
                      .map(
                          (i) => `

                <div
                  class="sao-item"
                  data-item-id="${i.id}"
                >

                  <img
                    src="${esc(i.img)}"
                  >

                  <div class="sao-item-main">

                    <div class="sao-item-name">

                      ${esc(i.name)}

                      ${
                          i.system?.equipped
                              ? `
                          <span class="sao-equipped">
                            EQUIPPED
                          </span>
                        `
                              : ''
                      }

                    </div>

                    <div class="sao-item-type">
                      ${esc(i.type.toUpperCase())}
                    </div>

                  </div>

                  <div class="sao-item-qty">
                    ×${i.system?.quantity ?? 1}
                  </div>

                  ${
                      canEditActor(actor)
                          ? `
                        <button
                          class="sao-item-delete"
                          data-delete-item="${i.id}"
                          title="Excluir"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      `
                          : ''
                  }

                </div>

              `
                      )
                      .join('')
                : `
          <div class="sao-empty">
            INVENTORY EMPTY
          </div>
        `
        }
      `;
    }
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          PLAYER SYSTEM
        </div>

        <div class="sao-panel-subtitle">
          ${esc(actor.name)}
        </div>

      </div>

      <div class="sao-tabs">

        ${[
            ['status', 'STATUS'],
            ['information', 'INFORMATION'],
            ['inventory', 'INVENTORY'],
            ['equipment', 'EQUIPMENT'],
        ]
            .map(
                ([id, label]) =>
                    `

              <button
                class="
                  sao-tab
                  ${tab === id ? 'active' : ''}
                "
                data-player-tab="${id}"
              >
                ${label}
              </button>

            `
            )
            .join('')}

      </div>

      <div class="sao-panel-body">

        <div class="sao-scroll">
          ${body}
        </div>

      </div>

    `;
    content.querySelectorAll('[data-player-tab]').forEach((button) => {
        button.onclick = () => {
            const target = button.dataset.playerTab;
            if (target === 'equipment') {
                renderEquipment();
            } else {
                renderPlayer(target);
            }
        };
    });
    content.querySelectorAll('[data-item-id]').forEach((element) => {
        element.onclick = () => {
            const item = actor.items.get(element.dataset.itemId);
            if (item) openItem(item, () => renderPlayer(tab));
        };
    });
    content.querySelectorAll('[data-create-item]').forEach((button) => {
        button.onclick = () => createActorItem();
    });
    content.querySelectorAll('[data-delete-item]').forEach((button) => {
        button.onclick = async (event) => {
            event.stopPropagation();
            await deleteActorItem(button.dataset.deleteItem);
        };
    });
}
// ==========================================================
// WEAPON HAND SYSTEM
// ==========================================================
const isTwoHanded = (item) => item?.type === 'weapon' && Number(item.system?.hands ?? 1) === 2;
const getWeaponHand = (item) => (item?.type === 'weapon' ? item.system?.hand || 'right' : null);
async function equipWeapon(item, hand = 'right') {
    if (!item || item.type !== 'weapon') return false;
    const target = item.actor;
    if (!target) return false;
    const targetHand = isTwoHanded(item) ? '' : hand === 'left' ? 'left' : 'right';
    const updates = target.items.contents
        .filter(
            (other) =>
                other.type === 'weapon' &&
                other.id !== item.id &&
                other.system?.equipped &&
                (!targetHand || isTwoHanded(other) || getWeaponHand(other) === targetHand)
        )
        .map((other) => ({
            _id: other.id,
            'system.equipped': false,
        }));
    if (updates.length) await target.updateEmbeddedDocuments('Item', updates);
    await item.update({
        'system.equipped': true,
        'system.hand': targetHand,
    });
    return true;
}
async function unequipItem(item) {
    if (!item) return;
    await item.update({
        'system.equipped': false,
    });
}
// ==========================================================
// EQUIPMENT SLOT DETECTION
// ==========================================================
function equippedForSlot(slot, items) {
    const eq = items.filter(
        (i) => i.system?.equipped && (i.type === 'weapon' || i.type === 'equipment')
    );
    if (slot === 'lhand' || slot === 'rhand') {
        const wanted = slot === 'lhand' ? 'left' : 'right';
        return (
            eq.find(
                (item) =>
                    item.type === 'weapon' && (isTwoHanded(item) || getWeaponHand(item) === wanted)
            ) ?? null
        );
    }
    return eq.find((item) => item.type === 'equipment' && item.system?.slot === slot) ?? null;
}
// ==========================================================
// EQUIPMENT SCREEN
// ==========================================================
function renderEquipment(filter = 'all') {
    actor ??= getActor();
    const content = document.getElementById('sao-content');
    const items = actor.items.contents.filter(
        (i) => !['class', 'race', 'species', 'background'].includes(i.type)
    );
    const eqItems = items.filter((i) => i.type === 'weapon' || i.type === 'equipment');
    const visible =
        filter === 'all'
            ? items
            : filter === 'equipped'
              ? eqItems.filter((i) => i.system?.equipped)
              : eqItems.filter((i) => i.type === filter);
    const slots = [
        ['head', 'HEAD', 'sao-slot-head'],
        ['lhand', 'LEFT HAND', 'sao-slot-lhand'],
        ['rhand', 'RIGHT HAND', 'sao-slot-rhand'],
        ['armor', 'ARMOR', 'sao-slot-armor'],
        ['acc1', 'ACCESSORY', 'sao-slot-acc1'],
        ['acc2', 'ACCESSORY', 'sao-slot-acc2'],
        ['feet', 'FEET', 'sao-slot-feet'],
    ];
    const slotHTML = slots
        .map(([id, label, cls]) => {
            const item = equippedForSlot(id, items);
            return `

            <div
              class="
                sao-equip-slot
                ${cls}
                ${item ? 'filled' : ''}
              "
              data-equip-slot="${id}"
              title="${label}"
            >

              ${
                  item
                      ? `
                    <img
                      src="${esc(item.img)}"
                    >

                    <span class="slot-label">
                      ${esc(item.name)}
                    </span>
                  `
                      : `
                    <i class="fas fa-plus"></i>

                    <span class="slot-label">
                      ${label}
                    </span>
                  `
              }

            </div>

          `;
        })
        .join('');
    const invHTML = visible.length
        ? visible
              .map(
                  (i) => `

                <div
                  class="sao-inv-slot"
                  data-equip-item="${i.id}"
                  title="${esc(i.name)}"
                >

                  ${
                      i.img
                          ? `
                        <img
                          src="${esc(i.img)}"
                        >
                      `
                          : ''
                  }

                  ${
                      i.system?.equipped
                          ? `
                        <span
                          class="eq-dot"
                        ></span>
                      `
                          : ''
                  }

                  ${
                      Number(i.system?.quantity ?? 1) > 1
                          ? `
                        <span class="qty">
                          ${i.system.quantity}
                        </span>
                      `
                          : ''
                  }

                </div>

              `
              )
              .join('')
        : `
          <div
            style="
              grid-column:1/-1;
              text-align:center;
              padding:30px;
              font-size:var(--sao-fs-md);
              opacity:.5
            "
          >
            NO ITEMS
          </div>
        `;
    const s = menuView(actor);
    const xp = s.details?.xp?.value ?? s.attributes?.xp?.value ?? 0;
    const xpMax = s.details?.xp?.max ?? s.attributes?.xp?.max ?? 100;
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          EQUIPMENT
        </div>

        <div class="sao-panel-subtitle">
          EQUIPMENT & ITEM SYSTEM
        </div>

      </div>

      <div
          class="sao-panel-body"
          style="top:82px"
      >

        <div
          class="sao-scroll"
          style="padding:0"
        >

          <div class="sao-equip-layout">

            <!-- PAPER DOLL -->

            <div class="sao-doll-panel">

              <div class="sao-doll-title">
                ${esc(actor.name)}
              </div>

              <div class="sao-doll">

                <div class="sao-doll-glow"></div>

                <img
                  class="sao-doll-character"
                  src="${esc(actorImage())}"
                >

                ${slotHTML}

              </div>

              <div class="sao-doll-stats">

                <div class="sao-mini-stat">

                  <div>
                    <span>LV</span>
                    <strong>
                      ${level(actor)}
                    </strong>
                  </div>

                  <div>
                    <span>AC</span>
                    <strong>
                      ${ac(actor)}
                    </strong>
                  </div>

                  <div>
                    <span>HP</span>
                    <strong>
                      ${s.attributes?.hp?.value ?? 0}/${s.attributes?.hp?.max ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span>ATK</span>
                    <strong>
                      ${s.attributes?.atk?.value ?? s.attributes?.attack?.value ?? ''}
                    </strong>
                  </div>

                  <div>
                    <span>DEF</span>
                    <strong>
                      ${s.attributes?.def?.value ?? ''}
                    </strong>
                  </div>

                  <div>
                    <span>XP</span>
                    <strong>
                      ${xp}/${xpMax}
                    </strong>
                  </div>

                </div>

              </div>

            </div>

            <!-- INVENTORY -->

            <div class="sao-inventory-panel">

              <div class="sao-inventory-title">
                ITEMS
              </div>

              <div class="sao-equip-filter">

                ${[
                    ['all', 'ALL'],
                    ['weapon', 'WEAPONS'],
                    ['equipment', 'ARMOR'],
                    ['equipped', 'EQUIPPED'],
                ]
                    .map(
                        ([id, label]) =>
                            `

                      <button
                        class="
                          ${filter === id ? 'active' : ''}
                        "
                        data-equip-filter="${id}"
                      >
                        ${label}
                      </button>

                    `
                    )
                    .join('')}

              </div>

              <div
                class="sao-inventory-grid"
              >

                ${invHTML}

              </div>

            </div>

          </div>

        </div>

      </div>

    `;
    content.querySelectorAll('[data-equip-filter]').forEach((button) => {
        button.onclick = () => renderEquipment(button.dataset.equipFilter);
    });
    content.querySelectorAll('[data-equip-item]').forEach((element) => {
        element.onclick = () => {
            const item = actor.items.get(element.dataset.equipItem);
            if (item) openItem(item, () => renderEquipment(filter));
        };
    });
    content.querySelectorAll('[data-equip-slot]').forEach((element) => {
        element.onclick = () => openEquipSlot(element.dataset.equipSlot);
    });
}
// ==========================================================
// EQUIPMENT SLOT WINDOW
// ==========================================================
function openEquipSlot(slot) {
    actor ??= getActor();
    const content = document.getElementById('sao-content');
    const names = {
        head: 'HEAD',
        lhand: 'LEFT HAND',
        rhand: 'RIGHT HAND',
        armor: 'ARMOR',
        acc1: 'ACCESSORY',
        acc2: 'ACCESSORY',
        feet: 'FEET',
    };
    let items = actor.items.contents.filter((i) => i.type === 'weapon' || i.type === 'equipment');
    if (slot === 'lhand' || slot === 'rhand') {
        items = items.filter((i) => i.type === 'weapon');
    } else {
        items = items.filter(
            (i) => i.type === 'equipment' && (!i.system?.slot || i.system.slot === slot)
        );
    }
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    overlay.innerHTML = `

      <div class="sao-modal-box">

        <div class="sao-modal-title">
          SELECT ${names[slot]}
        </div>

        <div class="sao-modal-sub">
          EQUIP AN ITEM INTO THIS SLOT
        </div>

        <div
          style="
            margin-top:12px
          "
        >

          ${
              items.length
                  ? items
                        .map(
                            (item) =>
                                `

                      <div
                        class="sao-item"
                        data-slot-item="${item.id}"
                      >

                        <img
                          src="${esc(item.img)}"
                        >

                        <div
                          class="sao-item-main"
                        >

                          <div
                            class="sao-item-name"
                          >
                            ${esc(item.name)}
                          </div>

                          <div
                            class="sao-item-type"
                          >

                            ${
                                item.type === 'weapon'
                                    ? isTwoHanded(item)
                                        ? 'TWO-HANDED'
                                        : getWeaponHand(item).toUpperCase()
                                    : 'EQUIPMENT'
                            }

                          </div>

                        </div>

                      </div>

                    `
                        )
                        .join('')
                  : `
                <div
                  style="
                    padding:30px;
                    text-align:center;
                    font-size:var(--sao-fs-md)
                  "
                >
                  NO COMPATIBLE ITEMS
                </div>
              `
          }

        </div>

        <div
          class="sao-modal-actions"
        >

          <button
            class="sao-action"
            data-slot-close
          >
            CLOSE
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelectorAll('[data-slot-item]').forEach((element) => {
        element.onclick = async () => {
            const item = actor.items.get(element.dataset.slotItem);
            if (!item) return;
            try {
                if (item.type === 'weapon') {
                    await equipWeapon(item, slot === 'lhand' ? 'left' : 'right');
                } else {
                    const conflict = item.actor.items.contents
                        .filter(
                            (other) =>
                                other.type === 'equipment' &&
                                other.id !== item.id &&
                                other.system?.equipped &&
                                other.system?.slot === slot
                        )
                        .map((other) => ({ _id: other.id, 'system.equipped': false }));
                    if (conflict.length)
                        await item.actor.updateEmbeddedDocuments('Item', conflict);
                    await item.update({
                        'system.equipped': true,
                        'system.slot': slot,
                    });
                }
                overlay.remove();
                renderEquipment();
            } catch (error) {
                console.error('SAO EQUIPMENT SLOT', error);
                ui.notifications.error(
                    `Não foi possível equipar este item: ${error?.message ?? error}`
                );
            }
        };
    });
    overlay.querySelector('[data-slot-close]').onclick = () => overlay.remove();
}
// ==========================================================
// ITEM WINDOW
// ==========================================================
function openItem(item, returnFunction) {
    const content = document.getElementById('sao-content');
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    const equipped = item.system?.equipped ?? false;
    const quantity = Number(item.system?.quantity ?? 1);
    const description = item.system?.description || 'NO DESCRIPTION';
    const equipable = item.type === 'weapon' || item.type === 'equipment';
    const weapon = item.type === 'weapon';
    const twoHanded = isTwoHanded(item);
    overlay.innerHTML = `

      <div class="sao-modal-box">

        <div
          style="
            display:flex;
            align-items:center;
          "
        >

          <img
            src="${esc(item.img)}"
            style="
              width:80px;
              height:80px;
              object-fit:contain;
              margin-right:15px;
            "
          >

          <div>

            <div class="sao-modal-title">
              ${esc(item.name)}
            </div>

            <div class="sao-modal-sub">
              ${esc(item.type.toUpperCase())}
            </div>

          </div>

        </div>

        <div
          style="
            margin-top:12px;
            padding:12px;
            background:var(--sao-surface);
            border:1px solid var(--sao-line-soft);
            border-radius:4px;
            font-size:var(--sao-fs-md);
            line-height:1.6;
          "
        >

          <b>QUANTITY:</b>
          ${quantity}

          ${
              weapon
                  ? `

                <br>

                <b>HAND:</b>

                ${twoHanded ? 'TWO HANDS' : getWeaponHand(item).toUpperCase()}

              `
                  : ''
          }

          ${
              item.type === 'equipment'
                  ? `

                <br>

                <b>SLOT:</b>

                ${esc(item.system?.slot ? game.i18n.localize(TGO.equipmentSlots[item.system.slot]) : '—')}

                <br>

                <b>CA:</b>

                ${Number(item.system?.armor ?? 0)}

              `
                  : ''
          }

          <br><br>

          ${esc(description)}

        </div>

        ${
            weapon && !twoHanded && equipped
                ? `

              <div
                style="
                  display:flex;
                  gap:4px;
                  margin-top:10px;
                "
              >

                <button
                  class="sao-action"
                  data-action="left"
                  style="flex:1"
                >
                  LEFT HAND
                </button>

                <button
                  class="sao-action"
                  data-action="right"
                  style="flex:1"
                >
                  RIGHT HAND
                </button>

              </div>

            `
                : ''
        }

        <div
          class="sao-modal-actions"
        >

          ${
              equipable
                  ? `
                <button
                  class="sao-action primary"
                  data-action="equip"
                >
                  ${equipped ? 'UNEQUIP' : 'EQUIP'}
                </button>
              `
                  : ''
          }

          ${
              typeof item.use === 'function'
                  ? `
                <button
                  class="sao-action"
                  data-action="use"
                >
                  USE
                </button>
              `
                  : ''
          }

          <button
            class="sao-action danger"
            data-action="drop"
          >
            DROP
          </button>

          <button
            class="sao-action"
            data-action="close"
          >
            CLOSE
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelectorAll('[data-action]').forEach((button) => {
        button.onclick = async () => {
            const action = button.dataset.action;
            try {
                if (action === 'close') {
                    overlay.remove();
                    return;
                }
                if (action === 'left') {
                    await equipWeapon(item, 'left');
                    overlay.remove();
                    returnFunction();
                    return;
                }
                if (action === 'right') {
                    await equipWeapon(item, 'right');
                    overlay.remove();
                    returnFunction();
                    return;
                }
                if (action === 'equip') {
                    if (item.system?.equipped) {
                        await unequipItem(item);
                    } else if (item.type === 'weapon') {
                        await equipWeapon(item, 'right');
                    } else if (item.system?.slot) {
                        const conflict = item.actor.items.contents
                            .filter(
                                (other) =>
                                    other.type === 'equipment' &&
                                    other.id !== item.id &&
                                    other.system?.equipped &&
                                    other.system?.slot === item.system.slot
                            )
                            .map((other) => ({ _id: other.id, 'system.equipped': false }));
                        if (conflict.length)
                            await item.actor.updateEmbeddedDocuments('Item', conflict);
                        await item.update({
                            'system.equipped': true,
                        });
                    } else {
                        ui.notifications.warn('Defina o slot do equipamento na ficha do item.');
                        return;
                    }
                    overlay.remove();
                    returnFunction();
                    return;
                }
                if (action === 'use') {
                    if (typeof item.use === 'function') {
                        await item.use();
                    }
                    return;
                }
                if (action === 'drop') {
                    if (quantity > 1) {
                        await item.update({
                            'system.quantity': quantity - 1,
                        });
                    } else {
                        await item.delete();
                    }
                    overlay.remove();
                    returnFunction();
                }
            } catch (error) {
                console.error('SAO ITEM ACTION', error);
                ui.notifications.error(
                    `Não foi possível realizar esta ação: ${error?.message ?? error}`
                );
            }
        };
    });
}
// ==========================================================
// PARTY
// ==========================================================
async function renderParty() {
    const content = document.getElementById('sao-content');
    const party = await getParty();
    const leader = await getPartyLeader();
    const html = party.length
        ? party
              .map((a) => {
                  const h = hp(a);
                  const value = Number(h.value ?? 0);
                  const max = Number(h.max ?? 1);
                  const percent = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
                  const user = game.users.find((u) => u.character?.id === a.id);
                  const classes =
                      a.items
                          .filter((i) => i.type === 'class')
                          .map((i) => i.name)
                          .join(', ') || 'Adventurer';
                  return `

                  <div
                    class="sao-party-member"
                    data-party-actor="${a.id}"
                  >

                    <img
                      class="sao-party-avatar"
                      src="${esc(a.img)}"
                    >

                    <div class="sao-party-main">

                      <div class="sao-party-name">

                        ${esc(a.name)}

                        ${
                            leader === a.id
                                ? `
                              <span class="sao-equipped">
                                LEADER
                              </span>
                            `
                                : ''
                        }

                      </div>

                      <div
                        class="sao-party-details"
                      >

                        LEVEL
                        ${level(a)}

                        ·

                        AC
                        ${ac(a)}

                        ·

                        ${esc(classes)}

                      </div>

                      <div
                        class="sao-party-status"
                      >

                        ${user?.active ? 'ONLINE' : 'OFFLINE'}

                      </div>

                    </div>

                    <div
                      class="sao-party-hp"
                    >

                      <div
                        class="sao-hp-bar"
                      >

                        <div
                          class="sao-hp-fill"
                          style="
                            width:${percent}%
                          "
                        ></div>

                      </div>

                      <div
                        style="
                          text-align:right;
                          margin-top:4px;
                          font-size:var(--sao-fs-xs);
                        "
                      >
                        ${value} / ${max}
                      </div>

                    </div>

                  </div>

                `;
              })
              .join('')
        : `

          <div
            class="sao-empty"
          >
            PARTY EMPTY
          </div>

        `;
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          PARTY
        </div>

        <div class="sao-panel-subtitle">
          PARTY MEMBER SYSTEM
        </div>

      </div>

      <div
        class="sao-panel-body"
      >

        <div
          class="sao-scroll"
        >

          ${
              game.user.isGM
                  ? `

                <div
                  class="sao-party-toolbar"
                >

                  <button
                    class="sao-action primary"
                    data-party-add
                  >
                    + ADD MEMBER
                  </button>

                  <button
                    class="sao-action"
                    data-party-reset
                  >
                    CLEAR PARTY
                  </button>

                </div>

              `
                  : ''
          }

          ${html}

        </div>

      </div>

    `;
    content.querySelector('[data-party-add]')?.addEventListener('click', openPartyAdd);
    content.querySelector('[data-party-reset]')?.addEventListener('click', async () => {
        if (!game.user.isGM) return;
        const confirmed = await DialogV2.confirm({
            window: {
                title: 'CLEAR PARTY',
            },
            content: '<p>Remove every member from the party?</p>',
        });
        if (!confirmed) return;
        const saved = await savePartyIds([]);
        if (saved) {
            await savePartyLeader('');
            renderParty();
        }
    });
    content.querySelectorAll('[data-party-actor]').forEach((element) => {
        element.onclick = () => {
            openPartyMember(element.dataset.partyActor);
        };
    });
}
// ==========================================================
// ADD PARTY MEMBER
// ==========================================================
async function openPartyAdd() {
    if (!game.user.isGM) return;
    const content = document.getElementById('sao-content');
    const ids = await getPartyIds();
    const available = game.actors.contents.filter(
        (a) => !ids.includes(a.id) && (a.type === 'character' || a.type === 'npc')
    );
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    overlay.innerHTML = `

      <div class="sao-modal-box">

        <div class="sao-modal-title">
          ADD PARTY MEMBER
        </div>

        <div class="sao-modal-sub">
          SELECT A CHARACTER
        </div>

        <div
          style="
            margin-top:12px
          "
        >

          ${
              available.length
                  ? available
                        .map(
                            (a) =>
                                `

                      <div
                        class="sao-item"
                        data-add-actor="${a.id}"
                      >

                        <img
                          src="${esc(a.img)}"
                        >

                        <div class="sao-item-main">

                          <div
                            class="sao-item-name"
                          >
                            ${esc(a.name)}
                          </div>

                          <div
                            class="sao-item-type"
                          >
                            LEVEL ${level(a)}
                          </div>

                        </div>

                      </div>

                    `
                        )
                        .join('')
                  : `
                <div
                  class="sao-empty"
                  style="
                    height:150px;
                    color:#555
                  "
                >
                  NO AVAILABLE ACTORS
                </div>
              `
          }

        </div>

        <div
          class="sao-modal-actions"
        >

          <button
            class="sao-action"
            data-add-close
          >
            CLOSE
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelectorAll('[data-add-actor]').forEach((element) => {
        element.onclick = async () => {
            const current = await getPartyIds();
            const id = element.dataset.addActor;
            if (!current.includes(id)) {
                current.push(id);
                const saved = await savePartyIds(current);
                if (saved) {
                    const leader = await getPartyLeader();
                    if (!leader) {
                        await savePartyLeader(id);
                    }
                    const a = game.actors.get(id);
                    ui.notifications.info(`${a?.name ?? 'Player'} entrou na party.`);
                    overlay.remove();
                    renderParty();
                }
            }
        };
    });
    overlay.querySelector('[data-add-close]').onclick = () => overlay.remove();
}
// ==========================================================
// PARTY MEMBER
// ==========================================================
async function openPartyMember(actorId) {
    const a = game.actors.get(actorId);
    if (!a) return;
    const content = document.getElementById('sao-content');
    const user = game.users.find((u) => u.character?.id === a.id);
    const h = hp(a);
    const leader = await getPartyLeader();
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          ${esc(a.name)}
        </div>

        <div class="sao-panel-subtitle">
          PARTY MEMBER
        </div>

      </div>

      <div class="sao-panel-body">

        <div class="sao-scroll">

          <div class="sao-info-grid">

            <div class="sao-info-card">

              <span>
                PLAYER
              </span>

              <strong>
                ${esc(user?.name ?? 'Unknown')}
              </strong>

            </div>

            <div class="sao-info-card">

              <span>
                LEVEL
              </span>

              <strong>
                ${level(a)}
              </strong>

            </div>

            <div class="sao-info-card">

              <span>
                HP
              </span>

              <strong>
                ${h.value ?? 0}
                /
                ${h.max ?? 0}
              </strong>

            </div>

            <div class="sao-info-card">

              <span>
                ARMOR
              </span>

              <strong>
                ${ac(a)}
              </strong>

            </div>

          </div>

          <div
            class="sao-section-title"
          >
            ACTIONS
          </div>

          <div
            class="sao-party-toolbar"
          >

            <button
              class="sao-action primary"
              data-member-message
            >
              MESSAGE
            </button>

            <button
              class="sao-action"
              data-member-select
            >
              SELECT TOKEN
            </button>

            ${
                game.user.isGM
                    ? `
                  <button
                    class="sao-action"
                    data-member-leader
                  >
                    ${leader === a.id ? 'REMOVE LEADER' : 'SET LEADER'}
                  </button>

                  <button
                    class="sao-action danger"
                    data-member-remove
                  >
                    REMOVE FROM PARTY
                  </button>
                `
                    : ''
            }

            <button
              class="sao-action"
              data-member-back
            >
              BACK
            </button>

          </div>

        </div>

      </div>

    `;
    content.querySelector('[data-member-message]').onclick = () => {
        if (a) renderMessages(a.id);
    };
    content.querySelector('[data-member-select]').onclick = () => {
        const token = canvas.tokens.placeables.find((t) => t.actor?.id === a.id);
        if (token) {
            canvas.tokens.releaseAll();
            token.control({
                releaseOthers: true,
            });
            ui.notifications.info(`Token de ${a.name} selecionado.`);
        } else {
            ui.notifications.warn('Esse personagem não possui token na Scene atual.');
        }
    };
    content.querySelector('[data-member-leader]')?.addEventListener('click', async () => {
        const current = await getPartyLeader();
        if (current === a.id) {
            await savePartyLeader('');
        } else {
            await savePartyLeader(a.id);
        }
        openPartyMember(a.id);
    });
    content.querySelector('[data-member-remove]')?.addEventListener('click', async () => {
        const confirmed = await DialogV2.confirm({
            window: {
                title: 'REMOVE PARTY MEMBER',
            },
            content: `<p>Remove <b>${esc(a.name)}</b> from the party?</p>`,
        });
        if (!confirmed) return;
        const ids = await getPartyIds();
        const next = ids.filter((id) => id !== a.id);
        const saved = await savePartyIds(next);
        if (saved) {
            if ((await getPartyLeader()) === a.id) {
                await savePartyLeader(next[0] ?? '');
            }
            ui.notifications.info(`${a.name} foi removido da party.`);
            renderParty();
        }
    });
    content.querySelector('[data-member-back]').onclick = renderParty;
}
// ==========================================================
// MESSAGES
// ==========================================================
let selectedMessageUser = null;

function getMessageActors() {
    return game.actors.contents.filter(
        (candidate) => candidate.type === 'character' && candidate.id !== actor?.id
    );
}

function getStoredMessages() {
    try {
        return game.settings.get(SETTINGS_NS, SETTINGS.messages) ?? [];
    } catch {
        return [];
    }
}

function getPrivateMessages(targetActorId) {
    const me = actor?.id;
    if (!me) return [];
    return getStoredMessages()
        .filter(
            (message) =>
                (message.from === me && message.to === targetActorId) ||
                (message.from === targetActorId && message.to === me)
        )
        .sort((a, b) => a.time - b.time);
}
async function appendStoredMessage(message) {
    if (getStoredMessages().some((existing) => existing.id === message.id)) return;
    await game.settings.set(SETTINGS_NS, SETTINGS.messages, [...getStoredMessages(), message]);
}
async function sendPrivateMessage(targetActor, text) {
    if (!targetActor || !text.trim() || !actor) return;
    const message = {
        id: foundry.utils.randomID(),
        from: actor.id,
        fromName: actor.name,
        to: targetActor.id,
        text: text.trim(),
        time: Date.now(),
    };
    if (game.user.isGM) return appendStoredMessage(message);
    game.socket.emit('system.the-glory-online', {
        type: 'message',
        message,
    });
}

function renderMessages(targetActorId = null) {
    const content = document.getElementById('sao-content');
    if (!content) return;
    if (targetActorId) selectedMessageUser = targetActorId;
    const contacts = getMessageActors();
    const target = selectedMessageUser ? game.actors.get(selectedMessageUser) : null;
    const messages = target ? getPrivateMessages(target.id) : [];
    const contactsHTML = contacts
        .map(
            (candidate) => `
              <div class="sao-contact ${target?.id === candidate.id ? 'active' : ''}" data-message-user="${candidate.id}">
                <img src="${esc(candidate.img)}">
                <div class="sao-contact-name">${esc(candidate.name)}</div>
              </div>
            `
        )
        .join('');
    const messagesHTML = messages.length
        ? messages
              .map((message) => {
                  const mine = message.from === actor?.id;
                  return `
                    <div class="sao-chat-message ${mine ? 'mine' : ''}">
                      <div class="sao-chat-author">${esc(mine ? message.fromName : (target?.name ?? ''))}</div>
                      <div>${esc(message.text)}</div>
                    </div>
                  `;
              })
              .join('')
        : `<div class="sao-empty">${target ? 'NO MESSAGES' : 'SELECT A CHARACTER'}</div>`;
    content.innerHTML = `
      <div class="sao-panel-header">
        <div class="sao-panel-title">MESSAGE</div>
        <div class="sao-panel-subtitle">PRIVATE COMMUNICATION SYSTEM</div>
      </div>
      <div class="sao-panel-body" style="padding:0">
        <div class="sao-message-layout">
          <div class="sao-contact-list">${contactsHTML}</div>
          <div class="sao-chat">
            <div class="sao-chat-header">PRIVATE CHANNEL${target ? ` · ${esc(target.name)}` : ''}</div>
            <div class="sao-chat-history" id="sao-chat-history">${messagesHTML}</div>
            <div class="sao-chat-input">
              <input id="sao-message-input" placeholder="${target ? 'Digite uma mensagem...' : 'Selecione um personagem...'}" ${target ? '' : 'disabled'}>
              <button id="sao-send-message" class="sao-send" ${target ? '' : 'disabled'}>SEND</button>
            </div>
          </div>
        </div>
      </div>
    `;
    content.querySelectorAll('[data-message-user]').forEach((element) => {
        element.onclick = () => renderMessages(element.dataset.messageUser);
    });
    const input = document.getElementById('sao-message-input');
    const send = async () => {
        if (!target || !input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        await sendPrivateMessage(target, text);
        renderMessages(target.id);
    };
    document.getElementById('sao-send-message')?.addEventListener('click', send);
    if (input) {
        input.onkeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                send();
            }
        };
    }
    const history = document.getElementById('sao-chat-history');
    if (history) history.scrollTop = history.scrollHeight;
    if (target) markMessagesRead();
    updateMessageBadge();
}
async function markMessagesRead() {
    if (!actor) return;
    try {
        await game.user.update({
            [`flags.${FLAG_SCOPE}.lastMessageRead.${actor.id}`]: Date.now(),
        });
    } catch {
        // usuário sem permissão de escrita no próprio documento: badge só zera no próximo render
    }
}
// ==========================================================
// MESSAGE BADGE
// ==========================================================
function updateMessageBadge() {
    if (!actor) return;
    const lastRead = Number(game.user.flags?.[FLAG_SCOPE]?.lastMessageRead?.[actor.id] ?? 0);
    const count = getStoredMessages().filter(
        (message) => message.to === actor.id && message.time > lastRead
    ).length;
    const badge = document.getElementById('sao-message-count');
    if (!badge) return;
    if (count > 0) {
        badge.style.display = 'flex';
        badge.textContent = count > 99 ? '99+' : count;
    } else {
        badge.style.display = 'none';
    }
}
// ==========================================================
// SKILLS
// ==========================================================
function renderSkills() {
    actor ??= getActor();
    const content = document.getElementById('sao-content');
    const skills = actor.items.contents.filter((i) => ['feat', 'spell', 'weapon'].includes(i.type));
    const html = skills.length
        ? skills
              .map(
                  (i) => `

                <div
                  class="sao-skill-card"
                  data-skill-id="${i.id}"
                >

                  <img
                    class="sao-skill-icon"
                    src="${esc(i.img)}"
                  >

                  <div
                    class="sao-skill-main"
                  >

                    <div
                      class="sao-skill-name"
                    >
                      ${esc(i.name)}
                    </div>

                    <div
                      class="sao-skill-sub"
                    >
                      ${esc(i.type.toUpperCase())}

                      ·

                      ${i.system?.activation?.type ?? 'ACTIVE'}

                    </div>

                  </div>

                  <button
                    class="sao-action primary"
                    data-skill-use="${i.id}"
                  >
                    USE
                  </button>

                </div>

              `
              )
              .join('')
        : `
          <div class="sao-empty">
            NO SKILLS FOUND
          </div>
        `;
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          SKILLS
        </div>

        <div class="sao-panel-subtitle">
          SWORD SKILLS · PASSIVES · ABILITIES
        </div>

      </div>

      <div class="sao-panel-body">

        <div class="sao-scroll">
          ${html}
        </div>

      </div>

    `;
    content.querySelectorAll('[data-skill-use]').forEach((button) => {
        button.onclick = async (event) => {
            event.stopPropagation();
            const item = actor.items.get(button.dataset.skillUse);
            if (item?.use) {
                try {
                    await item.use();
                } catch (error) {
                    console.error('SAO SKILL', error);
                    ui.notifications.error('Não foi possível usar esta skill.');
                }
            }
        };
    });
    content.querySelectorAll('[data-skill-id]').forEach((element) => {
        element.onclick = () => {
            const item = actor.items.get(element.dataset.skillId);
            if (item?.sheet?.render) {
                item.sheet.render(true);
            }
        };
    });
}
// ==========================================================
// QUESTS
// ==========================================================
async function renderQuests() {
    const content = document.getElementById('sao-content');
    const quests = await getQuests();
    const html = quests.length
        ? quests
              .map(
                  (q) => `

                <div
                  class="sao-quest"
                  data-quest="${q.id}"
                >

                  <div
                    class="sao-quest-main"
                  >

                    <div
                      class="sao-quest-title"
                    >

                      ${esc(q.title)}

                      <span
                        class="sao-equipped"
                      >
                        ${esc((q.state ?? 'active').toUpperCase())}
                      </span>

                    </div>

                    <div
                      class="sao-quest-sub"
                    >
                      ${esc(q.description)}
                    </div>

                    <div
                      style="
                        margin-top:6px;
                        font-size:var(--sao-fs-xs)
                      "
                    >
                      ${esc(q.objective)}
                    </div>

                    <div
                      class="sao-quest-bar"
                    >

                      <div
                        class="sao-quest-fill"
                        style="
                          width:${Math.max(0, Math.min(100, q.progress ?? 0))}%
                        "
                      ></div>

                    </div>

                    <div
                      style="
                        margin-top:4px;
                        font-size:var(--sao-fs-2xs);
                        opacity:.55
                      "
                    >

                      ${q.progress ?? 0}%

                      · REWARD:

                      ${esc(q.reward)}

                    </div>

                  </div>

                </div>

              `
              )
              .join('')
        : `
          <div class="sao-empty">
            NO QUESTS
          </div>
        `;
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          QUEST
        </div>

        <div class="sao-panel-subtitle">
          AINCRAD QUEST SYSTEM
        </div>

      </div>

      <div class="sao-panel-body">

        <div class="sao-scroll">

          ${
              game.user.isGM
                  ? `

                <div
                  class="sao-party-toolbar"
                >

                  <button
                    class="sao-action primary"
                    data-new-quest
                  >
                    NEW QUEST
                  </button>

                  <button
                    class="sao-action danger"
                    data-delete-all-quests
                  >
                    DELETE ALL
                  </button>

                </div>

              `
                  : ''
          }

          ${html}

        </div>

      </div>

    `;
    content.querySelectorAll('[data-quest]').forEach((element) => {
        element.onclick = () => openQuest(element.dataset.quest);
    });
    content.querySelector('[data-new-quest]')?.addEventListener('click', createQuest);
    content.querySelector('[data-delete-all-quests]')?.addEventListener('click', async () => {
        if (!game.user.isGM) return;
        const confirmed = await DialogV2.confirm({
            window: {
                title: 'DELETE ALL QUESTS',
            },
            content: '<p>Delete <b>ALL</b> quests permanently?</p>',
        });
        if (!confirmed) return;
        if (await saveQuests([])) {
            ui.notifications.info('All quests deleted.');
            renderQuests();
        }
    });
}
async function openQuest(id) {
    const quests = await getQuests();
    const q = quests.find((x) => x.id === id);
    if (!q) return;
    const content = document.getElementById('sao-content');
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    overlay.innerHTML = `

      <div
        class="sao-modal-box"
      >

        <div
          class="sao-modal-title"
        >
          ${esc(q.title)}
        </div>

        <div
          class="sao-modal-sub"
        >
          ${esc((q.state ?? 'active').toUpperCase())}
        </div>

        <div
          style="
            margin-top:12px;
            font-size:var(--sao-fs-md);
            line-height:1.6
          "
        >

          <b>
            DESCRIPTION
          </b>

          <br>

          ${esc(q.description)}

          <br><br>

          <b>
            OBJECTIVE
          </b>

          <br>

          ${esc(q.objective)}

          <br><br>

          <b>
            REWARD
          </b>

          <br>

          ${esc(q.reward)}

        </div>

        <div
          class="sao-modal-actions"
        >

          ${
              game.user.isGM
                  ? `

                <button
                  class="sao-action primary"
                  data-q-progress
                >
                  +25%
                </button>

                <button
                  class="sao-action"
                  data-q-complete
                >
                  COMPLETE
                </button>

                <button
                  class="sao-action danger"
                  data-q-delete
                >
                  DELETE
                </button>

              `
                  : ''
          }

          <button
            class="sao-action"
            data-q-close
          >
            CLOSE
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelector('[data-q-close]').onclick = () => overlay.remove();
    overlay.querySelector('[data-q-progress]')?.addEventListener('click', async () => {
        q.progress = Math.min(100, Number(q.progress ?? 0) + 25);
        if (q.progress >= 100) {
            q.state = 'complete';
        }
        if (await saveQuests(quests)) {
            overlay.remove();
            renderQuests();
        }
    });
    overlay.querySelector('[data-q-complete]')?.addEventListener('click', async () => {
        q.progress = 100;
        q.state = 'complete';
        if (await saveQuests(quests)) {
            overlay.remove();
            renderQuests();
            alertSAO('QUEST COMPLETE', `${q.title} has been completed!`);
        }
    });
    overlay.querySelector('[data-q-delete]')?.addEventListener('click', async () => {
        const confirmed = await DialogV2.confirm({
            window: {
                title: 'DELETE QUEST',
            },
            content: `<p>Delete <b>${esc(q.title)}</b> permanently?</p>`,
        });
        if (!confirmed) return;
        const next = quests.filter((x) => x.id !== q.id);
        if (await saveQuests(next)) {
            ui.notifications.info(`${q.title} deleted.`);
            overlay.remove();
            renderQuests();
        }
    });
}
async function createQuest() {
    if (!game.user.isGM) return;
    const title = await promptSAO('NEW QUEST', 'Quest name:', 'NEW QUEST');
    if (!title) return;
    const desc = await promptSAO('QUEST DESCRIPTION', 'Description:', 'Explore Aincrad');
    const objective = await promptSAO('OBJECTIVE', 'Objective:', 'Complete the mission');
    const reward = await promptSAO('REWARD', 'Reward:', '500 XP · 100 COINS');
    const quests = await getQuests();
    quests.push({
        id: foundry.utils.randomID(),
        title,
        description: desc ?? '',
        objective: objective ?? '',
        reward: reward ?? 'CUSTOM REWARD',
        progress: 0,
        state: 'active',
    });
    if (await saveQuests(quests)) {
        renderQuests();
    }
}
// ==========================================================
// MAIL
// ==========================================================
function renderMail() {
    try {
        const content = document.getElementById('sao-content');
        if (!content) {
            console.error('SAO MAIL: #sao-content não encontrado.');
            ui.notifications.error('SAO MAIL | Área da Mail Box não encontrada.');
            return;
        }
        const currentActor = actor ?? getActor();
        if (!currentActor) {
            content.innerHTML = `
          <div class="sao-panel-header">
            <div class="sao-panel-title">MAIL BOX</div>
            <div class="sao-panel-subtitle">NO CHARACTER SELECTED</div>
          </div>
          <div class="sao-panel-body">
            <div class="sao-empty">
              <i class="fas fa-user-slash"></i>
              <div>SELECT A CHARACTER</div>
            </div>
          </div>
        `;
            return;
        }
        let mails = currentActor.getFlag('world', 'saoMailbox');
        if (!Array.isArray(mails)) mails = [];
        mails = mails
            .filter((m) => m && !m.deleted)
            .sort((a, b) => Number(b.created || 0) - Number(a.created || 0));
        const unread = mails.filter((m) => !m.read).length;
        content.innerHTML = `
        <div class="sao-panel-header">
          <div class="sao-panel-title">MAIL BOX</div>
          <div class="sao-panel-subtitle">
            SYSTEM MESSAGES & REWARDS${unread ? ` · ${unread} NEW` : ''}
          </div>
        </div>

        <div class="sao-panel-body">
          <div class="sao-scroll" id="sao-mail-list">
            ${
                mails.length
                    ? mails
                          .map(
                              (m) => `
              <div
                class="sao-mail-row ${m.read ? '' : 'unread'}"
                data-sao-mail-id="${esc(m.id)}"
                style="
                  display:flex;
                  align-items:center;
                  min-height:64px;
                  margin-bottom:5px;
                  padding:9px;
                  cursor:pointer;
                  border-left:4px solid ${m.read ? 'transparent' : 'var(--sao-gold)'};
                  background:${m.read ? 'var(--sao-surface)' : 'rgba(232,179,57,.18)'};
                  color:${m.read ? 'var(--sao-ink)' : 'var(--sao-gold-lt)'};
                  position:relative;
                "
              >
                <div style="
                  width:42px;height:42px;display:flex;align-items:center;justify-content:center;
                  margin-right:10px;background:var(--sao-surface-2);color:var(--sao-gold);flex-shrink:0;
                ">
                  <i class="fas ${m.reward ? 'fa-gift' : 'fa-envelope'}"></i>
                </div>

                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--sao-fs-md);font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${esc(m.title || 'UNTITLED')}
                  </div>
                  <div style="margin-top:5px;font-size:var(--sao-fs-xs);letter-spacing:.5px;opacity:.7;">
                    FROM ${esc(m.from || 'SYSTEM')} · ${m.read ? 'READ' : 'NEW'}
                    ${m.reward ? ' · 🎁 REWARD' : ''}
                  </div>
                </div>

                ${!m.read ? `<div style="padding:4px 7px;background:var(--sao-gold);color:#0a0e16;font-size:var(--sao-fs-xs);font-weight:bold;">NEW</div>` : ''}
              </div>
            `
                          )
                          .join('')
                    : `
              <div class="sao-empty" style="min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:.6;">
                <i class="fas fa-envelope-open" style="font-size:32px;margin-bottom:12px;"></i>
                <div>YOUR MAIL BOX IS EMPTY</div>
                <small style="margin-top:7px;font-size:var(--sao-fs-xs);letter-spacing:1px;">NO NEW CORRESPONDENCE</small>
              </div>
            `
            }
          </div>
        </div>
      `;
        const rows = content.querySelectorAll('[data-sao-mail-id]');
        rows.forEach((row) => {
            row.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const id = row.dataset.saoMailId;
                const actorNow = getActor();
                if (!actorNow) return;
                let stored = actorNow.getFlag('world', 'saoMailbox');
                if (!Array.isArray(stored)) stored = [];
                const mail = stored.find((m) => m && m.id === id);
                if (!mail) {
                    ui.notifications.warn('SAO MAIL | Mensagem não encontrada.');
                    renderMail();
                    return;
                }
                if (!mail.read) {
                    mail.read = true;
                    await actorNow.setFlag('world', 'saoMailbox', stored);
                }
                renderMailMessage(mail, actorNow);
            });
        });
    } catch (error) {
        console.error('SAO MAIL | ERRO AO ABRIR MAIL BOX', error);
        ui.notifications.error(`SAO MAIL | Erro: ${error?.message ?? error}`);
    }
}
async function renderMailMessage(mail, currentActor) {
    const content = document.getElementById('sao-content');
    if (!content) return;
    let rewardHTML = '';
    if (mail.reward?.type === 'item') {
        rewardHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-top:15px;padding:10px;background:var(--sao-surface);border:1px solid var(--sao-line-soft);">
          <img src="${esc(mail.reward.img || 'icons/svg/item-bag.svg')}" style="width:55px;height:55px;object-fit:contain;">
          <div style="flex:1;">
            <div style="font-weight:bold;font-size:var(--sao-fs-lg);">${esc(mail.reward.name || 'ITEM')}</div>
            <div style="margin-top:5px;font-size:var(--sao-fs-sm);opacity:.65;">QUANTITY: ${Number(mail.reward.quantity || 1)}</div>
          </div>
          ${mail.claimed ? `<div style="font-size:var(--sao-fs-xs);opacity:.6;">CLAIMED</div>` : `<button class="sao-action primary" data-mail-receive><i class="fas fa-gift"></i> RECEIVE</button>`}
        </div>
      `;
    }
    if (mail.reward?.type === 'gold') {
        rewardHTML = `
        <div style="margin-top:15px;padding:15px;background:rgba(0,0,0,.12);text-align:center;">
          <i class="fas fa-coins" style="font-size:28px;color:var(--sao-gold);"></i>
          <div style="margin-top:8px;font-size:var(--sao-fs-xl);font-weight:bold;">${Number(mail.reward.amount || 0).toLocaleString()} GOLD</div>
          ${mail.claimed ? `<div style="margin-top:8px;font-size:var(--sao-fs-xs);opacity:.6;">CLAIMED</div>` : `<button class="sao-action primary" data-mail-receive style="margin-top:10px;"><i class="fas fa-coins"></i> RECEIVE</button>`}
        </div>
      `;
    }
    if (mail.reward?.type === 'xp') {
        rewardHTML = `
        <div style="margin-top:15px;padding:15px;background:rgba(0,0,0,.12);text-align:center;">
          <i class="fas fa-star" style="font-size:28px;color:var(--sao-gold);"></i>
          <div style="margin-top:8px;font-size:var(--sao-fs-xl);font-weight:bold;">${Number(mail.reward.amount || 0).toLocaleString()} XP</div>
          ${mail.claimed ? `<div style="margin-top:8px;font-size:var(--sao-fs-xs);opacity:.6;">CLAIMED</div>` : `<button class="sao-action primary" data-mail-receive style="margin-top:10px;"><i class="fas fa-star"></i> RECEIVE</button>`}
        </div>
      `;
    }
    content.innerHTML = `
      <div class="sao-panel-header">
        <div class="sao-panel-title">${esc(mail.title || 'MAIL')}</div>
        <div class="sao-panel-subtitle">FROM ${esc(mail.from || 'SYSTEM')}</div>
      </div>

      <div class="sao-panel-body">
        <div class="sao-scroll">
          <div style="padding:15px;background:var(--sao-surface);border-left:3px solid var(--sao-gold);line-height:1.7;white-space:pre-wrap;font-size:var(--sao-fs-lg);">
            ${esc(mail.text || '')}
          </div>

          ${
              mail.reward
                  ? `
            <div style="margin-top:15px;font-size:var(--sao-fs-sm);letter-spacing:2px;">ATTACHMENT</div>
            ${rewardHTML}
          `
                  : ''
          }

          <div style="display:flex;justify-content:space-between;margin-top:20px;">
            <button class="sao-action" data-mail-back><i class="fas fa-arrow-left"></i> BACK</button>
            <button class="sao-action danger" data-mail-delete><i class="fas fa-trash"></i> DELETE</button>
          </div>
        </div>
      </div>
    `;
    content.querySelector('[data-mail-back]')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderMail();
    });
    content.querySelector('[data-mail-delete]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const stored = currentActor.getFlag('world', 'saoMailbox') || [];
        const updated = stored.filter((m) => m?.id !== mail.id);
        await currentActor.setFlag('world', 'saoMailbox', updated);
        ui.notifications.info('SAO MAIL | Mensagem apagada.');
        renderMail();
    });
    content.querySelector('[data-mail-receive]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (mail.claimed) {
            ui.notifications.warn('SAO MAIL | Recompensa já recebida.');
            return;
        }
        try {
            if (mail.reward?.type === 'item') {
                const data = foundry.utils.deepClone(mail.reward.itemData);
                if (!data) throw new Error('Dados do item não encontrados.');
                delete data._id;
                const quantity = Number(mail.reward.quantity || 1);
                if (data.system && Object.prototype.hasOwnProperty.call(data.system, 'quantity')) {
                    data.system.quantity = quantity;
                }
                await currentActor.createEmbeddedDocuments('Item', [data]);
            }
            if (mail.reward?.type === 'gold') {
                // F2 ainda não tem moeda no modelo; não grava campo inexistente.
                ui.notifications.info(
                    'SAO SYSTEM | Recompensa em ouro ignorada: o sistema ainda não tem moeda.'
                );
            }
            if (mail.reward?.type === 'xp') {
                const amount = Number(mail.reward.amount || 0);
                const current = Number(currentActor.system?.xp || 0);
                await currentActor.update({
                    'system.xp': current + amount,
                });
            }
            const stored = currentActor.getFlag('world', 'saoMailbox') || [];
            const target = stored.find((m) => m?.id === mail.id);
            if (target) {
                target.claimed = true;
                target.read = true;
            }
            await currentActor.setFlag('world', 'saoMailbox', stored);
            ui.notifications.info('SAO MAIL | Recompensa recebida!');
            renderMailMessage(target || mail, currentActor);
        } catch (error) {
            console.error('SAO MAIL | Erro ao receber recompensa', error);
            ui.notifications.error(`SAO MAIL | ${error?.message ?? error}`);
        }
    });
}
// ==========================================================
// ALERT
// ==========================================================
function alertSAO(title, text) {
    const content = document.getElementById('sao-content');
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    overlay.innerHTML = `

      <div
        class="sao-modal-box"
        style="
          max-width:480px;
          text-align:center
        "
      >

        <div
          class="sao-modal-title"
        >
          ${esc(title)}
        </div>

        <div
          style="
            margin-top:18px;
            font-size:var(--sao-fs-md);
            line-height:1.7
          "
        >
          ${esc(text)}
        </div>

        <div
          class="sao-modal-actions"
          style="
            justify-content:center
          "
        >

          <button
            class="sao-action primary"
            data-alert-close
          >
            OK
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelector('[data-alert-close]').onclick = () => overlay.remove();
}
// ==========================================================
// PROMPT
// ==========================================================
async function promptSAO(title, label, placeholder = '') {
    return new Promise((resolve) => {
        const content = document.getElementById('sao-content');
        const overlay = document.createElement('div');
        overlay.className = 'sao-modal';
        overlay.innerHTML = `

          <div
            class="sao-modal-box"
            style="
              max-width:480px
            "
          >

            <div
              class="sao-modal-title"
            >
              ${esc(title)}
            </div>

            <div
              style="
                margin-top:15px;
                font-size:var(--sao-fs-sm)
              "
            >
              ${esc(label)}
            </div>

            <input
              id="sao-prompt"
              style="
                width:100%;
                height:36px;
                margin-top:6px;
                border:0;
                padding:8px
              "
              placeholder="${esc(placeholder)}"
            >

            <div
              class="sao-modal-actions"
            >

              <button
                class="sao-action primary"
                data-ok
              >
                OK
              </button>

              <button
                class="sao-action"
                data-cancel
              >
                CANCEL
              </button>

            </div>

          </div>

        `;
        content.appendChild(overlay);
        const input = overlay.querySelector('#sao-prompt');
        input.focus();
        const finish = (value) => {
            overlay.remove();
            resolve(value);
        };
        overlay.querySelector('[data-ok]').onclick = () => finish(input.value.trim());
        overlay.querySelector('[data-cancel]').onclick = () => finish(null);
        input.onkeydown = (event) => {
            if (event.key === 'Enter') {
                finish(input.value.trim());
            }
            if (event.key === 'Escape') {
                finish(null);
            }
        };
    });
}
// ==========================================================
// MAP
// ==========================================================
function renderMap() {
    const content = document.getElementById('sao-content');
    const activeFloor = detectFloor(activeScene());
    let floors = '';
    for (let floor = 100; floor >= 1; floor--) {
        const scenes = getFloorScenes(floor);
        floors += `

        <div
          class="
            sao-floor-node
            ${floor === activeFloor ? 'current' : ''}
            ${scenes.length ? '' : 'no-scenes'}
          "
          data-floor="${floor}"
        >

          <span
            class="sao-floor-number"
          >
            ${String(floor).padStart(3, '0')}
          </span>

          FLOOR ${floor}

        </div>

      `;
    }
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          MAP
        </div>

        <div class="sao-panel-subtitle">
          AINCRAD WORLD MAP  100 FLOORS
        </div>

      </div>

      <div class="sao-panel-body">

        <div class="sao-world-map">

          <div
            class="sao-aincrad-title"
          >
            AINCRAD
          </div>

          <div
            class="sao-aincrad-subtitle"
          >
            WORLD NAVIGATION SYSTEM
          </div>

          <div
            id="sao-floor-column"
            class="sao-floor-column"
          >
            ${floors}
          </div>

        </div>

      </div>

    `;
    const column = document.getElementById('sao-floor-column');
    setTimeout(() => {
        column?.querySelector('.current')?.scrollIntoView({
            block: 'center',
        });
    }, 30);
    content.querySelectorAll('[data-floor]').forEach((element) => {
        element.onclick = () => openFloor(Number(element.dataset.floor));
    });
}

function openFloor(floor) {
    const content = document.getElementById('sao-content');
    const scenes = getFloorScenes(floor);
    const sceneHTML = scenes.length
        ? scenes
              .map(
                  (scene) => `

                <div
                  class="sao-item"
                >

                  ${
                      scene.img
                          ? `
                        <img
                          src="${esc(scene.img)}"
                        >
                      `
                          : ''
                  }

                  <div
                    class="sao-item-main"
                  >

                    <div
                      class="sao-item-name"
                    >
                      ${esc(scene.name)}
                    </div>

                    <div
                      class="sao-item-type"
                    >
                      ${game.scenes.active?.id === scene.id ? 'CURRENT LOCATION' : 'SCENE'}
                    </div>

                  </div>

                  <button
                    class="sao-action"
                    data-scene-view="${scene.id}"
                  >
                    VIEW
                  </button>

                  ${
                      game.user.isGM
                          ? `
                        <button
                          class="sao-action"
                          data-scene-activate="${scene.id}"
                        >
                          ACTIVATE
                        </button>
                      `
                          : ''
                  }

                </div>

              `
              )
              .join('')
        : `

          <div
            class="sao-empty"
            style="
              height:160px;
              color:#555
            "
          >

            NO SCENES REGISTERED

          </div>

        `;
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    overlay.innerHTML = `

      <div
        class="sao-modal-box"
      >

        <div
          class="sao-modal-title"
        >
          FLOOR ${floor}
        </div>

        <div
          class="sao-modal-sub"
        >
          AINCRAD FLOOR
        </div>

        <div
          class="sao-section-title"
        >
          LOCATIONS
        </div>

        ${sceneHTML}

        <div
          class="sao-modal-actions"
        >

          <button
            class="sao-action"
            data-floor-close
          >
            RETURN
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelector('[data-floor-close]').onclick = () => overlay.remove();
    overlay.querySelectorAll('[data-scene-view]').forEach((button) => {
        button.onclick = () => {
            const scene = game.scenes.get(button.dataset.sceneView);
            if (scene) {
                showSceneImage(scene);
            }
        };
    });
    overlay.querySelectorAll('[data-scene-activate]').forEach((button) => {
        button.onclick = async () => {
            const scene = game.scenes.get(button.dataset.sceneActivate);
            if (!scene) return;
            await scene.activate();
            updateWorldInfo();
        };
    });
}

function showSceneImage(scene) {
    const content = document.getElementById('sao-content');
    const overlay = document.createElement('div');
    overlay.className = 'sao-modal';
    overlay.innerHTML = `

      <div
        class="sao-modal-box"
        style="
          display:flex;
          flex-direction:column;
          height:90%;
        "
      >

        <div
          class="sao-modal-title"
        >
          ${esc(scene.name)}
        </div>

        <div
          class="sao-modal-sub"
        >
          SCENE PREVIEW
        </div>

        <div
          style="
            flex:1;
            margin-top:12px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#111;
            overflow:hidden;
          "
        >

          <img
            src="${esc(scene.img)}"
            style="
              max-width:100%;
              max-height:100%;
              object-fit:contain;
            "
          >

        </div>

        <div
          class="sao-modal-actions"
        >

          <button
            class="sao-action"
            data-close-preview
          >
            CLOSE
          </button>

        </div>

      </div>

    `;
    content.appendChild(overlay);
    overlay.querySelector('[data-close-preview]').onclick = () => overlay.remove();
}
// ==========================================================
// OPTIONS
// ==========================================================
function renderOptions() {
    const content = document.getElementById('sao-content');
    content.innerHTML = `

      <div class="sao-panel-header">

        <div class="sao-panel-title">
          OPTIONS
        </div>

        <div class="sao-panel-subtitle">
          SYSTEM SETTINGS
        </div>

      </div>

      <div class="sao-panel-body">

        <div class="sao-scroll">

          <div class="sao-info-grid">

            <div class="sao-info-card">

              <span>
                SYSTEM
              </span>

              <strong>
                Sword Art Online
              </strong>

            </div>

            <div class="sao-info-card">

              <span>
                GAME SYSTEM
              </span>

              <strong>
                The Glory Online
              </strong>

            </div>

            <div class="sao-info-card">

              <span>
                WORLD
              </span>

              <strong>
                AINCRAD
              </strong>

            </div>

            <div class="sao-info-card">

              <span>
                FLOORS
              </span>

              <strong>
                100
              </strong>

            </div>

          </div>

          <div
            class="sao-section-title"
          >
            SYSTEM INFORMATION
          </div>

          <div
            class="sao-info-card"
          >

            <span>
              FOUNDRY
            </span>

            <strong>
              ${game.version ?? 'Unknown'}
            </strong>

          </div>

        </div>

      </div>

    `;
}
// ==========================================================
// APPLICATION V2
// ==========================================================
class SAOSystemMenu extends ActorSheetV2 {
    static DEFAULT_OPTIONS = {
        id: MENU_ID,
        classes: ['sao-menu-app'],
        tag: 'div',
        window: {
            title: 'SAO SYSTEM · AINCRAD',
            icon: 'fa-solid fa-shield-halved',
            resizable: true,
            minimizable: true,
        },
        position: {
            width: Math.min(1400, window.innerWidth - 40),
            height: Math.min(840, window.innerHeight - 40),
        },
    };
    // ----------------------------------------
    // ESTADO
    // ----------------------------------------
    _hooks = [];
    _keyHandler = null;
    _section = 'player';
    // ----------------------------------------
    // CICLO DE VIDA
    // ----------------------------------------
    async _renderHTML() {
        actor = this.actor ?? getActor();
        return buildRoot();
    }
    _replaceHTML(result, content) {
        content.replaceChildren(result);
    }
    async _pickImage() {
        if (!actor?.isOwner) return;
        new foundry.applications.apps.FilePicker.implementation({
            type: 'image',
            current: actor.img,
            callback: (path) =>
                actor.update({
                    img: path,
                }),
        }).browse();
    }
    async _editName() {
        if (!actor?.isOwner) return;
        const name = await foundry.applications.api.DialogV2.prompt({
            window: {
                title: 'ALTERAR NOME',
            },
            content: `<input type="text" name="name" value="${escAttr(actor.name)}" autofocus>`,
            ok: {
                label: 'SALVAR',
                callback: (event, button) => button.form.elements.name.value.trim(),
            },
        });
        if (name)
            await actor.update({
                name,
            });
    }
    async _rollAbility(key, label) {
        if (!actor) return;
        const value = Number(actor.system?.attributes?.[key]?.value ?? 0);
        const mod = Math.floor((value - 10) / 2);
        const roll = new Roll('1d20 + @mod', {
            mod,
        });
        await roll.evaluate();
        // Dice So Nice anima o Roll do toMessage; showForRoll duplicaria a animação.
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({
                actor,
            }),
            flavor: `TESTE DE ${label}`,
        });
    }
    async _onRender() {
        actor = this.actor ?? actor;
        injectStyle();
        const root = this.element;
        root.querySelectorAll('[data-close]').forEach((button) => {
            button.onclick = () => this.close();
        });
        root.querySelectorAll('[data-main]').forEach((button) => {
            button.onclick = () => {
                root.querySelectorAll('[data-main]').forEach((b) => b.classList.remove('active'));
                button.classList.add('active');
                this._mount(button.dataset.main);
            };
        });
        root.querySelectorAll('[data-avatar]').forEach((element) => {
            element.onclick = () => this._pickImage();
        });
        root.querySelectorAll('[data-name]').forEach((element) => {
            element.onclick = () => this._editName();
        });
        root.querySelectorAll('[data-edit-toggle]').forEach((button) => {
            button.onclick = () => {
                if (!editMode) {
                    editMode = true;
                    syncEditButtons(root);
                    rerenderPlayer();
                    return;
                }
                savePlayerEdits(root, this.actor ?? getActor()).then(() =>
                    syncEditButtons(root)
                );
            };
        });
        root.querySelectorAll('[data-edit-cancel]').forEach((button) => {
            button.onclick = () => {
                editMode = false;
                syncEditButtons(root);
                rerenderPlayer();
            };
        });
        syncEditButtons(root);
        if (!this._abilityBound) {
            this._abilityBound = true;
            root.addEventListener('click', (event) => {
                if (event.target.closest?.('input, select, textarea, button')) return;
                const element = event.target.closest?.('[data-ability]');
                if (element)
                    this._rollAbility(element.dataset.ability, element.dataset.abilityLabel);
            });
        }
        root.querySelector(`[data-main="${this._section}"]`)?.classList.add('active');
        this._mount(this._section);
        updateWorldInfo();
        updateMessageBadge();
        this._bindHooks();
    }
    _onClose() {
        editMode = false;
        this._unbindHooks();
        document.getElementById(STYLE_ID)?.remove();
    }
    // ----------------------------------------
    // NAVEGAÇÃO
    // ----------------------------------------
    _mount(section) {
        this._section = section;
        if (section === 'inventory') return renderPlayer('inventory');
        if (section === 'party') return renderParty();
        if (section === 'message') return renderMessages();
        if (section === 'map') return renderMap();
        if (section === 'skills') return renderSkills();
        if (section === 'quests') return renderQuests();
        if (section === 'options') return renderOptions();
        if (section === 'mail') {
            try {
                return renderMail();
            } catch (error) {
                console.error('SAO MAIL NAVIGATION ERROR', error);
                ui.notifications.error(`SAO MAIL | ${error?.message ?? error}`);
            }
        }
        return renderPlayer('status');
    }
    // ----------------------------------------
    // HOOKS  registrados aqui e limpos no close
    // ----------------------------------------
    _bindHooks() {
        this._unbindHooks();
        this._hooks = [
            Hooks.on('updateSetting', (setting) => {
                if (setting.key !== `${SETTINGS_NS}.${SETTINGS.messages}`) return;
                updateMessageBadge();
                if (this._section !== 'message') return;
                if (!document.getElementById('sao-content')) return;
                renderMessages(selectedMessageUser);
            }),
            Hooks.on('updateActor', (updatedActor) => {
                if (updatedActor.id === getActor()?.id) updateWorldInfo();
            }),
            Hooks.on('updateScene', () => updateWorldInfo()),
            Hooks.on('activateScene', () => updateWorldInfo()),
        ];
        this._keyHandler = (event) => {
            if (event.key !== 'Escape') return;
            if (event.target?.closest?.('input, textarea')) return;
            this.close();
        };
        document.addEventListener('keydown', this._keyHandler);
    }
    _unbindHooks() {
        for (const id of this._hooks) Hooks.off(id);
        this._hooks = [];
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    }
}
// ==========================================================
// TOGGLE / LAUNCH
// ==========================================================
function openSystemMenu() {
    const target = getActor();
    if (!target) {
        ui.notifications.warn(
            'SAO SYSTEM | Selecione um personagem ou defina seu Actor como personagem.'
        );
        return;
    }
    return target.sheet.render({
        force: true,
    });
}
Hooks.once('init', () => {
    game.keybindings.register('the-glory-online', 'systemMenu', {
        name: 'Abrir Menu do Sistema',
        hint: 'Abre o menu SAO do personagem controlado.',
        editable: [
            {
                key: 'KeyM',
            },
        ],
        onDown: () => {
            openSystemMenu();
            return true;
        },
    });
});
Hooks.once('ready', () => {
    game.theGloryOnline ??= {};
    game.theGloryOnline.openMenu = openSystemMenu;
    // mensagens entre fichas: o GM grava no world setting; jogadores só emitem
    game.socket.on('system.the-glory-online', async (data) => {
        if (data?.type !== 'message' || !game.user.isGM) return;
        await appendStoredMessage(data.message);
    });
});
export { SAOSystemMenu, openSystemMenu, getQuests, SETTINGS, getWorldFlag, setWorldFlag };
