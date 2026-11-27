import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { ROUNDS } from '@/game/rounds';
import { colors, font, spacing } from '@/theme/tokens';

export default function Rules() {
  return (
    <Screen scroll>
      <Title>Règles</Title>
      <Muted>
        Formez au moins 2 équipes. À tour de rôle, un joueur fait deviner un maximum de cartes à
        son équipe avant la fin du chrono. On utilise le même paquet pendant les 3 manches : une
        fois qu’il est vide, on passe à la manche suivante.
      </Muted>

      {ROUNDS.map((r) => (
        <Card key={r.title}>
          <View style={styles.row}>
            <Text style={styles.emoji}>{r.emoji}</Text>
            <View style={styles.flex}>
              <Text style={styles.roundTitle}>
                {r.title} · {r.short}
              </Text>
              <Muted>{r.description}</Muted>
            </View>
          </View>
        </Card>
      ))}

      <Card>
        <Text style={styles.roundTitle}>Pendant ton tour</Text>
        <Muted>
          👉 Glisse la carte à droite (ou « Trouvé ») : elle est gagnée.{'\n'}👈 Glisse-la à
          gauche (ou « Passer ») : elle retourne sous le paquet.{'\n'}↩️ Une erreur ? Annule la
          dernière action, ou corrige dans le récap.{'\n'}⏰ Chrono écoulé sur une carte ? Elle
          retourne dans le paquet, qui est remélangé avant le tour suivant.{'\n'}⚡ Paquet vidé
          avant la fin du chrono ? Ton équipe commence la manche suivante, avec un chrono complet.
        </Muted>
      </Card>

      <Card>
        <Text style={styles.roundTitle}>✍️ Cartes des joueurs</Text>
        <Muted>
          En option, chaque joueur écrit quelques cartes en secret avant la partie et choisit leur
          catégorie. Elles sont mélangées aux cartes des paquets (ou jouées seules si aucun paquet
          n’est choisi), puis gardées pour les parties suivantes. Retrouve-les dans « Mes cartes »
          pour supprimer celles que tu ne veux plus.
        </Muted>
      </Card>

      <Muted>
        Astuce : les cartes devinées en manche 1 reviennent en manche 2 et 3. Retenez vos
        meilleures descriptions, elles serviront !
      </Muted>

      <Button label="Retour" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: spacing.xs },
  emoji: { fontSize: font.heading },
  roundTitle: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
});
