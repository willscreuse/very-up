import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ChipGroup, Muted, Screen, Title } from '@/components/ui';
import { PackPicker } from '@/components/pack-picker';
import { buildPool, DEFAULT_PACK_IDS, packById } from '@/data/packs';
import type { Settings, Team } from '@/game/types';
import { useCustomCards } from '@/store/customCardsStore';
import { DEFAULT_SETTINGS, useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing, teamPalette } from '@/theme/tokens';

const MAX_TEAMS = teamPalette.length;
const DEFAULT_TEAM_NAMES = ['Les Fusées', 'Les Tornades', 'Les Comètes', 'Les Volcans', 'Les Ouragans', 'Les Étoiles'];

let idCounter = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

function makeTeam(index: number): Team {
  return {
    id: uid('t'),
    name: DEFAULT_TEAM_NAMES[index],
    color: teamPalette[index],
    players: [
      { id: uid('p'), name: '' },
      { id: uid('p'), name: '' },
    ],
  };
}

export default function Setup() {
  const lastSetup = useGameStore((s) => s.lastSetup);
  const newGame = useGameStore((s) => s.newGame);
  const playerCards = useCustomCards((s) => s.cards);

  const [teams, setTeams] = useState<Team[]>(() => lastSetup?.teams ?? [makeTeam(0), makeTeam(1)]);
  const [settings, setSettings] = useState<Settings>(() => {
    const prev = lastSetup?.settings ?? DEFAULT_SETTINGS;
    // Parties d'avant la V3 : pas de paquets mémorisés. On ignore aussi un paquet supprimé.
    const packIds = (prev.packIds ?? DEFAULT_PACK_IDS).filter((id) => packById(id));
    return { ...prev, packIds };
  });
  const updateTeam = (teamId: string, fn: (t: Team) => Team) =>
    setTeams((ts) => ts.map((t) => (t.id === teamId ? fn(t) : t)));

  const cleanedTeams = teams.map((t) => ({
    ...t,
    name: t.name.trim() || 'Équipe sans nom',
    players: t.players.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim() })),
  }));
  const playerCount = cleanedTeams.reduce((n, t) => n + t.players.length, 0);

  const perPlayer = settings.customCardsPerPlayer ?? 0;
  const customTotal = perPlayer * playerCount;
  const packIds = settings.packIds ?? [];
  const packEras = settings.packEras ?? {};
  const available = buildPool(packIds, packEras, playerCards).length;
  const playerCardsInPacks = playerCards.filter((c) => packIds.includes(c.packId)).length;
  const countOptions = [20, 30, 40, 60].filter((n) => n <= available + customTotal);
  if (available > 0 && countOptions.length === 0) countOptions.push(available + customTotal);
  // Si le nombre choisi dépasse ce que les paquets offrent, on prend la plus grande option possible.
  const cardCount =
    [...countOptions].reverse().find((n) => n <= settings.cardCount) ?? countOptions[0] ?? 0;
  const fromPacks = Math.min(available, Math.max(0, cardCount - customTotal));

  const emptyTeam = cleanedTeams.find((t) => t.players.length === 0);
  const problem = emptyTeam
    ? `Ajoute au moins un joueur dans « ${emptyTeam.name} ».`
    : packIds.length === 0 && perPlayer === 0
      ? 'Choisis au moins un paquet, ou active les cartes des joueurs.'
      : null;

  const start = () => {
    if (problem) return;
    newGame(cleanedTeams, { ...settings, cardCount });
    router.replace('/game');
  };

  return (
    <Screen scroll>
      <Title>Nouvelle partie</Title>

      {teams.map((team, ti) => (
        <Card key={team.id} style={{ borderColor: team.color, borderWidth: 2 }}>
          <View style={styles.teamHeader}>
            <View style={[styles.dot, { backgroundColor: team.color }]} />
            <TextInput
              value={team.name}
              onChangeText={(name) => updateTeam(team.id, (t) => ({ ...t, name }))}
              style={styles.teamName}
              placeholder={`Équipe ${ti + 1}`}
              placeholderTextColor={colors.textMuted}
              maxLength={24}
            />
            {teams.length > 2 && (
              <Pressable
                accessibilityLabel={`Supprimer ${team.name}`}
                hitSlop={12}
                onPress={() => setTeams((ts) => ts.filter((t) => t.id !== team.id))}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            )}
          </View>

          {team.players.map((player, pi) => (
            <View key={player.id} style={styles.playerRow}>
              <TextInput
                value={player.name}
                onChangeText={(name) =>
                  updateTeam(team.id, (t) => ({
                    ...t,
                    players: t.players.map((p) => (p.id === player.id ? { ...p, name } : p)),
                  }))
                }
                style={styles.input}
                placeholder={`Joueur ${pi + 1}`}
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                returnKeyType="next"
              />
              {team.players.length > 1 && (
                <Pressable
                  accessibilityLabel="Retirer ce joueur"
                  hitSlop={12}
                  onPress={() =>
                    updateTeam(team.id, (t) => ({
                      ...t,
                      players: t.players.filter((p) => p.id !== player.id),
                    }))
                  }>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}

          <Pressable
            onPress={() =>
              updateTeam(team.id, (t) => ({
                ...t,
                players: [...t.players, { id: uid('p'), name: '' }],
              }))
            }>
            <Text style={[styles.add, { color: team.color }]}>+ Ajouter un joueur</Text>
          </Pressable>
        </Card>
      ))}

      {teams.length < MAX_TEAMS && (
        <Button
          label="+ Ajouter une équipe"
          variant="secondary"
          onPress={() => {
            const used = new Set(teams.map((t) => t.color));
            const index = teamPalette.findIndex((c) => !used.has(c));
            setTeams((ts) => [...ts, makeTeam(index)]);
          }}
        />
      )}

      <Card>
        <PackPicker
          selected={packIds}
          onChange={(ids) => setSettings((s) => ({ ...s, packIds: ids }))}
          eras={packEras}
          onErasChange={(e) => setSettings((s) => ({ ...s, packEras: e }))}
        />
        <Muted>
          {available} carte{available > 1 ? 's' : ''} disponible{available > 1 ? 's' : ''}
          {playerCardsInPacks > 0
            ? `, dont ${playerCardsInPacks} créée${playerCardsInPacks > 1 ? 's' : ''} par les joueurs`
            : ''}
        </Muted>
      </Card>

      <Card>
        <Text style={styles.label}>✍️ Cartes écrites par les joueurs</Text>
        <Muted>
          Avant la partie, chacun écrit quelques cartes en secret. Elles sont gardées pour les
          parties suivantes.
        </Muted>
        <ChipGroup
          options={[0, 2, 3, 4, 5]}
          value={perPlayer}
          onChange={(customCardsPerPlayer) => setSettings((s) => ({ ...s, customCardsPerPlayer }))}
          format={(v) => (v === 0 ? 'Non' : `${v} / joueur`)}
        />
        {perPlayer > 0 && (
          <Muted>
            {packIds.length === 0
              ? `Uniquement les ${customTotal} cartes des joueurs.`
              : `${customTotal} cartes des joueurs + ${fromPacks} des paquets.`}
          </Muted>
        )}
      </Card>

      <Card>
        <Text style={styles.label}>Durée d’un tour</Text>
        <ChipGroup
          options={[20, 30, 45, 60]}
          value={settings.turnSeconds}
          onChange={(turnSeconds) => setSettings((s) => ({ ...s, turnSeconds }))}
          format={(v) => `${v} s`}
        />
        {countOptions.length > 0 && (
          <>
            <Text style={styles.label}>Nombre de cartes</Text>
            <ChipGroup
              options={countOptions}
              value={cardCount}
              onChange={(cardCount) => setSettings((s) => ({ ...s, cardCount }))}
            />
          </>
        )}
        <Text style={styles.label}>Pénalité par carte passée</Text>
        <ChipGroup
          options={[0, 1]}
          value={settings.skipPenalty}
          onChange={(skipPenalty) => setSettings((s) => ({ ...s, skipPenalty }))}
          format={(v) => (v === 0 ? 'Aucune' : '−1 point')}
        />
      </Card>

      {problem && <Muted>{problem}</Muted>}
      <Button label="C’est parti !" size="lg" disabled={!!problem} onPress={start} />
      <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 16, height: 16, borderRadius: 8 },
  teamName: { flex: 1, color: colors.text, fontSize: font.title, fontWeight: '800', paddingVertical: spacing.xs },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.body,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  remove: { color: colors.textMuted, fontSize: font.title, paddingHorizontal: spacing.xs },
  add: { fontWeight: '800', fontSize: font.body, paddingVertical: spacing.sm },
  label: { color: colors.text, fontWeight: '800', fontSize: font.body, marginTop: spacing.xs },
});
