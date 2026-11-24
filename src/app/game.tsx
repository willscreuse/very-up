import { Redirect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

import { FinalScreen } from '@/components/game/final-screen';
import { PlayingScreen } from '@/components/game/playing-screen';
import { RoundSummaryScreen } from '@/components/game/round-summary-screen';
import { TurnIntroScreen } from '@/components/game/turn-intro-screen';
import { TurnSummaryScreen } from '@/components/game/turn-summary-screen';
import { WritingScreen } from '@/components/game/writing-screen';
import { selectActiveGame, useGameStore } from '@/store/gameStore';

/**
 * Une seule route pour toute la partie : l'écran affiché découle de `game.phase`.
 * La navigation ne peut donc jamais se désynchroniser de l'état du jeu,
 * et une partie restaurée après fermeture de l'app reprend au bon endroit.
 */
export default function Game() {
  useKeepAwake();
  const game = useGameStore(selectActiveGame);

  if (!game) return <Redirect href="/" />;

  switch (game.phase) {
    case 'writing':
      return <WritingScreen key={game.writing?.playerIndex ?? 0} game={game} />;
    case 'turnIntro':
      return <TurnIntroScreen game={game} />;
    case 'playing':
      return <PlayingScreen game={game} />;
    case 'turnSummary':
      return <TurnSummaryScreen game={game} />;
    case 'roundSummary':
      return <RoundSummaryScreen game={game} />;
    case 'finished':
      return <FinalScreen game={game} />;
  }
}
