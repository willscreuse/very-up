// Types du moteur de jeu Very Up.
// Le moteur est pur (aucune dépendance React / Expo) : il peut être testé seul
// et réutilisé tel quel quand on ajoutera swipe, sons, stats, etc.

export interface Card {
  id: string;
  text: string;
  category?: string;
  /** Joueur qui a écrit la carte (cartes perso uniquement). */
  authorId?: string;
}

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  players: Player[];
}

export interface Settings {
  /** Durée d'un tour en secondes. */
  turnSeconds: number;
  /** Nombre de cartes dans le paquet de la partie. */
  cardCount: number;
  /** Points retirés par carte passée (0 = pas de pénalité). */
  skipPenalty: number;
  /** Paquets thématiques utilisés (absent dans les parties créées avant la V3). */
  packIds?: string[];
  /** Période (plage d'époques) choisie pour les paquets datés. Absent = toutes. */
  packEras?: Record<string, [number, number]>;
  /** Cartes écrites par chaque joueur avant la partie (0 ou absent = désactivé). */
  customCardsPerPlayer?: number;
}

export type Phase =
  | 'writing' // chaque joueur écrit ses cartes en secret
  | 'turnIntro' // « Passe le téléphone à … »
  | 'playing' // chrono en cours
  | 'turnSummary' // récap du tour (modifiable)
  | 'roundSummary' // fin de manche
  | 'finished'; // podium

export type CardResult = 'found' | 'skipped';

export interface TurnEvent {
  cardId: string;
  result: CardResult;
}

export interface TurnRecord {
  round: number;
  teamId: string;
  playerId: string;
  events: TurnEvent[];
}

export interface GameState {
  phase: Phase;
  settings: Settings;
  teams: Team[];
  /** Toutes les cartes de la partie (identiques pour les 3 manches). */
  deck: Card[];
  /** Manche en cours : 0, 1 ou 2. */
  round: number;
  /** Cartes restant à faire deviner dans la manche ; pile[0] = carte affichée. */
  pile: string[];
  /** Index de l'équipe qui joue. */
  teamIndex: number;
  /** Pour chaque équipe, index du prochain joueur qui fait deviner. */
  playerCursor: number[];
  /** Tour en cours (pas encore validé). */
  currentTurn: TurnEvent[];
  /** Horodatage (ms) de fin du tour en cours, null hors phase « playing ». */
  turnEndsAt: number | null;
  /**
   * Temps restant (ms) quand une équipe vide le paquet avant la fin du chrono :
   * elle le conserve pour commencer la manche suivante.
   */
  carryOverMs: number | null;
  /**
   * Étape d'écriture des cartes perso (null si désactivée ou terminée).
   * Pendant cette étape, `deck` contient les cartes des paquets qui serviront
   * à compléter le jeu.
   */
  writing?: WritingState | null;
  /** Tours validés. Les scores sont dérivés de cet historique. */
  history: TurnRecord[];
  /** État du générateur aléatoire (déterministe, donc testable). */
  rng: number;
}

export interface WritingState {
  /** Index (dans l'ordre des équipes puis des joueurs) du joueur qui écrit. */
  playerIndex: number;
  cards: { authorId: string; text: string }[];
}

export type GameAction =
  | { type: 'SUBMIT_CUSTOM_CARDS'; texts: string[] }
  | { type: 'START_TURN'; now: number }
  | { type: 'FOUND'; now: number }
  | { type: 'SKIP' }
  | { type: 'UNDO' }
  | { type: 'TIME_UP' }
  | { type: 'TOGGLE_EVENT'; index: number }
  | { type: 'CONFIRM_TURN' }
  | { type: 'NEXT_ROUND' };

export const ROUND_COUNT = 3;

export const CUSTOM_CATEGORY = '✍️ Cartes des joueurs';
export const CUSTOM_CARD_MAX_LENGTH = 40;

/** En dessous de ce reliquat, on ne garde pas le temps pour la manche suivante. */
export const MIN_CARRY_OVER_MS = 1000;
