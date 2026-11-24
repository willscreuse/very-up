<p align="center">
  <img src="assets/images/icon.png" width="128" alt="Logo Very Up" />
</p>

<h1 align="center">Very Up</h1>

<p align="center">
  Le jeu d'ambiance en équipes, en 3 manches, avec un seul paquet de cartes.<br />
  Application Android gratuite, sans publicité, sans compte et 100 % hors ligne.
</p>

---

## Le principe

Formez au moins 2 équipes. À tour de rôle, un joueur fait deviner un maximum de cartes à son
équipe avant la fin du chrono. On garde le même paquet pendant les 3 manches :

1. 🗣️ **Description libre** : tous les mots sont permis, sauf le mot de la carte.
2. ☝️ **Un seul mot** : un seul mot pour faire deviner.
3. 🤫 **Mimes** : aucun mot, aucun son.

Les cartes devinées en manche 1 reviennent en manche 2 et 3. Retenez bien vos descriptions !

## Fonctionnalités

- 🃏 **9 paquets thématiques** (plus de 700 cartes) : Célébrités, Personnages, Films & séries,
  Animaux, Métiers, Objets, Cuisine, Enfants, Soirée (16+)
- 📅 **Choix des époques** pour les Célébrités, les Personnages et les Films, pour adapter les
  cartes à la culture de chacun (avant 1900 → depuis 2015)
- ✍️ **Cartes écrites par les joueurs** : chacun écrit ses cartes en secret avant la partie
- 👆 **Swipe** à droite pour « Trouvé », à gauche pour « Passer », avec annulation possible
- 🔊 Sons et vibrations (désactivables), 🎉 confettis pour les gagnants
- 💾 **Plusieurs parties sauvegardées**, à reprendre à tout moment
- ⚡ Si une équipe vide le paquet avant la fin du chrono, elle garde son temps restant
  pour la manche suivante

## Jouer sur iPhone, iPad ou ordinateur

Very Up existe aussi en **version web installable**, gratuite et sans App Store :
**👉 [willscreuse.github.io/very-up](https://willscreuse.github.io/very-up/)**

- **iPhone / iPad** : ouvrez le lien dans **Safari**, touchez **Partager** (le carré avec une
  flèche ↑), puis **« Sur l'écran d'accueil »**. Very Up apparaît avec son icône et s'ouvre en
  plein écran, comme une app.
- **Android / ordinateur** : ouvrez le lien dans Chrome ou Edge, puis choisissez **« Installer »**
  (bandeau dans l'app ou menu du navigateur).

Une fois ouverte une première fois, l'app fonctionne **hors ligne**. Les parties sont sauvegardées
dans le navigateur : effacer les données de Safari ou de Chrome les supprime. Sur iPhone, Safari
ne permet pas les vibrations ; les sons fonctionnent.

## Télécharger (Android)

1. Ouvrez la page [**Releases**](../../releases/latest) depuis votre téléphone Android.
2. Téléchargez le fichier `very-up-x.y.z.apk`.
3. Ouvrez-le. Android vous demandera d'autoriser l'installation d'applications provenant de
   cette source (votre navigateur ou votre gestionnaire de fichiers) : acceptez.
4. **Google Play Protect** peut afficher une fenêtre « Application inconnue » ou « Installation
   bloquée ». Appuyez sur la **petite flèche** (« Plus de détails ») pour déplier la fenêtre,
   puis sur **« Installer quand même »**.
5. Very Up apparaît avec les autres applications. Bonne partie !

> L'application n'est pas (encore) sur le Play Store : c'est pour cela qu'Android et Play Protect
> affichent un avertissement à l'installation. L'app ne demande aucune permission sensible
> (ni Internet, ni stockage, ni micro) et fonctionne entièrement hors ligne.

Pour mettre à jour, installez simplement la nouvelle version par-dessus l'ancienne : vos parties
sauvegardées sont conservées.

## Développement

L'app est construite avec [Expo](https://expo.dev) (React Native + TypeScript).

```bash
npm install
npx expo start        # puis scanner le QR code avec l'app Expo Go
```

```bash
npm run build:web     # version web dans dist/ (publiée automatiquement sur GitHub Pages à chaque push)
npm test              # tests (moteur de jeu, sauvegardes, paquets)
npm run typecheck     # vérification TypeScript
npx expo lint         # lint
```

### Architecture

```
src/
├── game/         Moteur pur, sans React : règles, reducer, scores (testé)
├── store/        Zustand + sauvegarde automatique (parties, préférences)
├── data/packs/   Paquets de cartes (un fichier par paquet) et époques
├── services/     Sons et vibrations, via un point d'entrée unique `feedback`
├── hooks/        Chrono basé sur une échéance absolue
├── theme/        Couleurs, tailles, espacements
├── components/   UI partagée, carte swipable, confettis, écrans de jeu
└── app/          Routes Expo Router : accueil, règles, configuration, parties, jeu
```

La route `/game` affiche l'écran qui correspond à la phase de la partie. La navigation suit donc
toujours l'état du jeu, et une partie interrompue reprend exactement où elle s'était arrêtée.

### Ajouter des cartes

Chaque paquet est un fichier de `src/data/packs/`. Ajoutez une ligne pour ajouter une carte.
Dans les paquets datés, chaque carte porte l'année où elle est devenue célèbre auprès du grand
public. Les tests vérifient l'absence de doublons et la couverture de chaque époque.

### Sons et logo

Les sons et le logo sont générés par des scripts, sans aucun fichier externe :

```bash
python3 tools/generate-sounds.py   # → assets/sounds/*.wav
python3 tools/generate-brand.py    # → assets/brand/*.svg et assets/images/*.png (nécessite rsvg-convert)
```

## Licence

[MIT](LICENSE)
