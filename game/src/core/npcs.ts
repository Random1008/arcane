export interface NpcDef {
  name: string;
  lines: string[];
}

// Données générées (workflow gen-npcs) : 1-2 PNJ par biome.
// La 1re réplique de chaque biome présente le PNJ et nomme le biome (identification).
export const BIOME_NPCS: Record<string, NpcDef[]> = {
  plains: [
    {
      name: "Maïon le Berger",
      lines: [
        "Moi c'est Maïon. Te voilà dans les Plaines, voyageur, là où l'herbe ondule plus loin que l'œil ne porte.",
        "Mes bêtes broutent ici depuis trois générations. La terre est douce, et le vent ne ment jamais.",
        "Reste à l'écart des hautes herbes la nuit. Même en pays paisible, tout ne dort pas.",
      ],
    },
    {
      name: "Dame Brunelle",
      lines: [
        "Approche, n'aie crainte. Je cueille les fleurs de soleil avant que la rosée ne s'en aille.",
        "On dit que ces prairies guérissent les cœurs las. Bois mon infusion, tu verras bien.",
      ],
    },
  ],
  forest: [
    {
      name: "Galwin le Bûcheron",
      lines: [
        "Moi c'est Galwin. Te voilà dans Forêt, le bois le plus dense que tu fouleras de tout ton voyage.",
        "Garde l'oreille tendue, étranger. Les arbres qui craquent ne sont pas tous remués par le vent.",
        "J'abats du chêne ici depuis trente hivers. La forêt donne, mais elle reprend toujours sa part.",
      ],
    },
    {
      name: "Dame Sylvane",
      lines: [
        "Les bêtes me connaissent et me laissent passer. Toi, marche doucement, elles te jugent encore.",
        "Si un loup te fixe sans grogner, ne fuis pas : c'est qu'il te trouve digne du sous-bois.",
        "Cueille les baies pâles si tu veux, mais ne touche jamais aux rouges.",
      ],
    },
  ],
  cave: [
    {
      name: "Borvik le Vieux Mineur",
      lines: [
        "Moi c'est Borvik. Te voilà dans Caverne, gamin, alors garde ta lanterne allumée et tes oreilles ouvertes.",
        "J'ai creusé ces galeries quarante ans durant. Le filon le plus riche, c'est toujours celui qui te coûte le plus cher.",
        "Quand la roche se met à chanter tout bas, tu poses ta pioche et tu files. Crois-en un vieux.",
      ],
    },
    {
      name: "Mirelle la Cueilleuse",
      lines: [
        "Doucement avec mes champignons, voyageur, certains mordent plus fort qu'ils n'en ont l'air.",
        "Les bleus, tu les manges. Les rouges, tu t'en éclaires. Les pâles... tu les laisses tranquilles.",
        "Sans ces lueurs de chair sous mes paniers, plus personne ne saurait retrouver la sortie d'ici.",
      ],
    },
  ],
  river: [
    {
      name: "Maël le Passeur",
      lines: [
        "Moi c'est Maël le Passeur. Te voilà dans Rivière, là où l'eau coule plus vieille que les ponts qui l'enjambent.",
        "Si tu veux traverser, attends que le courant se calme. Il a noyé plus d'un pressé.",
        "On dit qu'au fond dorment les anciens gués. Moi, je préfère ne pas regarder de trop près.",
      ],
    },
    {
      name: "Dame Ondine la Pêcheuse",
      lines: [
        "Doucement, voyageur, tu effraies mes prises.",
        "Le matin, les truites montent à la surface comme des éclats d'argent. C'est l'heure de jeter sa ligne.",
        "Prends garde aux berges après la pluie. La boue avale les bottes, et parfois ceux qui sont dedans.",
      ],
    },
  ],
  swamp: [
    {
      name: "Ysolde l'Herboriste",
      lines: [
        "Moi c'est Ysolde. Te voilà dans Marais, là où la brume avale les pas et où les sangsues guettent le sang des imprudents.",
        "Garde tes bottes lacées et marche sur les souches. Une cheville offerte à la boue ne ressort jamais entière.",
        "Si tu trouves de la rosée-de-vase, rapporte-la-moi. J'en tire un baume qui calme les morsures et apaise la fièvre des marais.",
      ],
    },
    {
      name: "Vieux Maël",
      lines: [
        "Chut... entends-tu les bulles crever sous la mousse ? Ce ne sont pas toujours des grenouilles qui respirent là-dessous.",
        "J'ai vécu soixante hivers dans ces tourbières. La brume m'a tout pris, sauf le savoir d'en sortir vivant.",
      ],
    },
  ],
  windy_hills: [
    {
      name: "Aldwen le Berger",
      lines: [
        "Moi c'est Aldwen. Te voilà dans Collines venteuses, là où le vent ne se tait jamais et chasse mes bêtes d'un versant à l'autre.",
        "Garde l'oreille tendue, voyageur. Quand le vent siffle trop fort entre les pierres, c'est qu'il porte quelque chose de pas net.",
        "Mes moutons connaissent ces collines mieux que moi. Suis-les si tu te perds, ils retrouvent toujours l'abri avant l'orage.",
      ],
    },
    {
      name: "Vieille Maelis",
      lines: [
        "Le vent emporte tout, ici. Les voix, les odeurs... et parfois les souvenirs de ceux qui s'attardent trop.",
        "On dit que sous les hautes herbes dorment de vieilles bornes. Ne les réveille pas, gamin, certaines gardent encore rancune.",
      ],
    },
  ],
  dark_woods: [
    {
      name: "Galwin le Bûcheron",
      lines: [
        "Moi c'est Galwin. Te voilà dans Bois sombres, là où la lumière n'ose plus descendre entre les troncs.",
        "Marche au centre du sentier, voyageur. Les loups n'attaquent jamais ceux qui les regardent dans les yeux... du moins, c'est ce qu'on raconte.",
        "J'abats du bois ici depuis trente hivers. Chaque arbre que je coupe, la forêt m'en réclame un autre.",
      ],
    },
    {
      name: "Dame Sélène la Veilleuse",
      lines: [
        "Approche-toi du feu, étranger. La nuit tombe vite et elle a des dents, sous ces arbres.",
        "On dit que la meute obéit à une bête plus vieille que la forêt elle-même. Moi, je préfère ne pas la croiser.",
        "Si tu entends les hurlements se rapprocher, ne cours pas. Ils adorent qu'on coure.",
      ],
    },
  ],
  desert: [
    {
      name: "Ysmaël le Caravanier",
      lines: [
        "Moi c'est Ysmaël. Te voilà dans Désert, étranger, où les dunes brûlent plus fort que la colère des dieux.",
        "Bois pendant que tu le peux. L'oasis ne pardonne pas à ceux qui s'éloignent trop.",
        "Suis les étoiles, jamais les mirages. Les premières mènent quelque part, les seconds ne mènent qu'à la soif.",
      ],
    },
    {
      name: "Dame Néfira, lectrice de sable",
      lines: [
        "Le vent murmure ton arrivée depuis trois nuits, voyageur. Approche, je lis ce que les dunes effacent.",
        "Sous le sable dort un royaume englouti. Certains creusent pour l'or, ils ne ramènent que des os.",
        "Repose-toi à l'ombre des palmes. La nuit ici mord aussi cruellement que le jour.",
      ],
    },
  ],
  tundra: [
    {
      name: "Yvain le Traqueur",
      lines: [
        "Moi c'est Yvain. Te voilà dans Toundra, là où le givre mord plus fort que les loups.",
        "Les rennes migrent vers le nord avant la grande nuit. Suis leurs traces, jamais celles d'un homme pressé.",
        "Garde tes mains au chaud, étranger. Ici, le froid prend les doigts avant de prendre la vie.",
      ],
    },
    {
      name: "Dame Brunehild des Glaces",
      lines: [
        "Le vent te raconte des mensonges sur ces plaines. Écoute plutôt le craquement de la neige sous tes bottes.",
        "Mon foyer brûle encore pour ceux qui errent. Approche, réchauffe-toi, puis repars plus sage.",
      ],
    },
  ],
  toxic_marsh: [
    {
      name: "Vorlek l'Apothicaire",
      lines: [
        "Moi c'est Vorlek. Te voilà dans Marécage toxique, alors couvre-toi le nez : les vapeurs ici rongent autant les poumons que le métal.",
        "Je distille les bulles du marais en remèdes. Ironique, non ? Le poison qui soigne, c'est tout mon art.",
        "Suis les lanternes vertes si tu te perds. Tout le reste, dans cette boue, finit par t'avaler.",
      ],
    },
    {
      name: "Dame Sève",
      lines: [
        "On me nomme Dame Sève. J'écoute le marais respirer depuis plus longtemps qu'aucun alchimiste n'a vécu.",
        "Les eaux acides montent chaque nuit. Ne dors jamais en contrebas, voyageur.",
        "Apporte-moi des champignons cendrés et je t'apprendrai à marcher sur la fange sans t'enfoncer.",
      ],
    },
  ],
  mountains: [
    {
      name: "Thoren le Guide",
      lines: [
        "Moi c'est Thoren. Te voilà dans Montagnes, là où les aigles tournent plus haut que les pics et où le vent te connaît avant que tu n'arrives.",
        "Les sentiers gelés ne pardonnent rien. Pose le pied où je pose le mien, et tu reverras la vallée.",
        "Écoute les cris des rapaces : quand ils se taisent, c'est qu'un danger plus grand monte la pente.",
      ],
    },
    {
      name: "Dame Ysoline des Cimes",
      lines: [
        "Les alpinistes m'appellent Dame Ysoline. J'ai cloué mes pitons dans chaque paroi d'ici, et chaque paroi m'a rendu une cicatrice.",
        "Prends cette corde, étranger. Là-haut, l'orgueil tue plus sûrement que la chute.",
        "On dit qu'un aigle de pierre dort au sommet. Moi, je ne suis jamais montée assez haut pour le réveiller.",
      ],
    },
  ],
  jungle: [
    {
      name: "Kael le Pisteur",
      lines: [
        "Moi, c'est Kael. Te voilà dans Jungle, étranger... ici la canopée mange le ciel et avale les imprudents.",
        "Suis les lianes qui montent, jamais celles qui pendent. Les premières mènent aux temples, les autres aux fosses.",
        "J'ai vu des pierres parler sous la mousse. Écoute-les bien avant que la vigne ne te referme dessus.",
      ],
    },
    {
      name: "Dame Liova, gardienne des ruines",
      lines: [
        "Les temples cachés dorment sous des siècles de racines. Réveille-les avec respect, ou pas du tout.",
        "Mon clan veillait sur ces autels avant que la forêt ne nous oublie. Il en reste moi, et le silence.",
        "Prends cette graine de souffle vert : elle s'allume près des passages oubliés.",
      ],
    },
  ],
  ruins: [
    {
      name: "Maître Orveth l'Antiquaire",
      lines: [
        "Moi c'est Orveth. Te voilà dans Ruines, là où dorment des siècles sous la poussière. Avance lentement, voyageur.",
        "Chaque dalle ici garde un secret... ou une lame cachée. J'ai perdu deux confrères à des pièges qu'ils croyaient inertes.",
        "Si tu trouves une tablette gravée, rapporte-la-moi. Je lis les langues que le monde a oubliées.",
      ],
    },
    {
      name: "Dame Sélène, gardienne des tombeaux",
      lines: [
        "On vient piller, on repart en cendres. Les anciens n'aiment pas qu'on dérange leur sommeil.",
        "Méfie-toi des couloirs trop droits, étranger. Les bâtisseurs ne traçaient jamais une ligne sans raison.",
        "J'arpente ces galeries depuis vingt hivers. Je n'ai pas tout vu, mais j'ai survécu à tout.",
      ],
    },
  ],
  volcano: [
    {
      name: "Brakka la Forgeronne",
      lines: [
        "Moi c'est Brakka. Te voilà dans Volcan, là où la roche pleure le feu et où mon marteau ne dort jamais.",
        "Approche du four sans crainte. La chaleur ici, c'est une amie, pas un ennemi.",
        "Apporte-moi du minerai fondu et je t'en tirerai une lame qui mordra l'ombre.",
      ],
    },
    {
      name: "Cendrin le Veilleur des Coulées",
      lines: [
        "Marche où la roche est noire et refroidie, voyageur. Le rouge, lui, te dévorera.",
        "J'écoute le grondement de la montagne. Quand elle chante, c'est qu'elle s'apprête à cracher.",
        "Beaucoup sont venus chercher l'or des profondeurs. Peu sont remontés.",
      ],
    },
  ],
  ice_floe: [
    {
      name: "Ysolde la Pêcheuse",
      lines: [
        "Moi c'est Ysolde. Te voilà sur Banquise, là où la glace craque mais ne cède jamais sous les pieds prudents.",
        "Approche ton hameçon du trou que j'ai percé, le poisson d'argent mord au crépuscule.",
        "Reste près des feux, étranger. Le froid d'ici dévore ceux qui s'attardent seuls.",
      ],
    },
    {
      name: "Vieux Brannok le Tailleur de Glace",
      lines: [
        "Tu vois ces blocs ? Je les sculpte depuis quarante hivers, et la banquise me parle encore.",
        "Si tu entends la glace gémir sous toi, recule. Elle ne ment jamais sur ce qui l'affame en dessous.",
      ],
    },
  ],
  catacombs: [
    {
      name: "Ossiane la Veilleuse",
      lines: [
        "Moi c'est Ossiane. Te voilà dans Catacombes, là où les vivants marchent sur les os des anciens.",
        "Garde le silence près des niches. Les dormeurs n'aiment pas qu'on trouble leur long repos.",
        "Si tu vois une bougie s'éteindre sans vent, recule. Ce n'est pas pour toi qu'elle brûlait.",
      ],
    },
    {
      name: "Frère Caldebrun, gardien des sépultures",
      lines: [
        "J'allume les lampes des morts depuis quarante hivers, et jamais je n'en ai vu une rester froide... jusqu'à toi.",
        "Chaque crâne ici eut un nom. Honore-les en passant, et la pierre te laissera repartir.",
        "On dit qu'au coeur des cryptes dort un gardien d'ossements. Prie pour qu'il continue de dormir.",
      ],
    },
  ],
  abyss: [
    {
      name: "Vorgil le Sondeur",
      lines: [
        "Moi c'est Vorgil. Te voilà dans Abysses, là où le sol s'oublie et la chute n'a pas de fin.",
        "J'écoute le gouffre depuis tant d'années que sa voix me semble plus claire que la mienne.",
        "Ne te penche jamais trop. Ce qui regarde d'en bas a beaucoup de patience.",
      ],
    },
    {
      name: "Dame Lysabeth des Ténèbres",
      lines: [
        "Les lanternes mentent ici. La vraie lumière, c'est d'apprendre à voir sans elle.",
        "J'ai serré la main de choses sans visage. Elles furent plus courtoises que bien des hommes.",
        "Reste un instant. Le silence du gouffre a des secrets qu'il ne murmure qu'aux immobiles.",
      ],
    },
  ],
  sky_city: [
    {
      name: "Aëlith, Scribe des Vents",
      lines: [
        "Moi c'est Aëlith. Te voilà dans Cité céleste, dernier refuge des érudits ailés au-dessus des nuages.",
        "Ici, le savoir se grave dans la brume avant qu'elle ne se dissipe. Lis vite, voyageur.",
        "Garde l'oreille tendue : quand les tours chantent, c'est que le vent porte une vérité.",
      ],
    },
    {
      name: "Maître Vorhen l'Astrolithe",
      lines: [
        "On dit que les étoiles tombent ici comme la pluie ailleurs. J'en collectionne les éclats.",
        "Mes ailes faiblissent, mais mon esprit, lui, plane encore plus haut chaque jour.",
        "Si tu trouves une plume d'argent, apporte-la-moi. Elle vaut plus qu'un coffre d'or.",
      ],
    },
  ],
  void_rift: [
    {
      name: "Vael l'Égaré",
      lines: [
        "Moi c'est Vael. Te voilà dans Faille du Néant, là où le ciel s'est fendu et n'a jamais recousu sa plaie.",
        "Ne fixe pas trop longtemps les déchirures. Elles te rendent le regard, et ce qu'elles montrent n'existe pas encore.",
        "J'étais quelqu'un, avant. Maintenant je ne suis plus que ce qui a refusé de tomber dans le vide.",
      ],
    },
    {
      name: "Dame Orhenne, la Veilleuse Fêlée",
      lines: [
        "Chut... entends-tu ? Le néant chuchote mon nom, et chaque jour il l'écorche un peu plus.",
        "On ne traverse pas une faille, voyageur. C'est elle qui décide de te laisser passer, ou de te garder.",
        "Si ta mémoire commence à fuir comme du sable, c'est qu'il est déjà trop tard pour faire demi-tour.",
      ],
    },
  ],
  fractured: [
    {
      name: "Vael l'Égaré",
      lines: [
        "Moi c'est Vael. Te voilà dans Dimension fracturée, là où les heures se brisent comme du verre.",
        "Ne te fie pas à ton ombre, elle marche parfois une seconde avant toi.",
        "J'ai vu ma propre mort, puis je l'ai vue se défaire. Ici, rien ne reste vraiment arrivé.",
      ],
    },
    {
      name: "Dame Orsène, Tisseuse d'échos",
      lines: [
        "Écoute bien : chaque pas que tu fais a déjà résonné mille fois entre ces failles.",
        "Je recous les instants déchirés, mais le fil s'effiloche plus vite que mes mains.",
        "Si tu entends ta voix t'appeler de loin, surtout ne réponds pas. Ce n'est plus toi.",
      ],
    },
  ],
  tourbiere_blafarde: [
    { name: "Orveline la Glaneuse", lines: ["Je suis Orveline, et tu poses le pied dans la Tourbière blafarde, étranger.", "Suis les feux follets si tu veux, mais ne crois jamais ce qu'ils te montrent.", "La boue ici garde tout ce qu'elle avale... os, bottes, et secrets."] },
    { name: "Vieux Crann", lines: ["L'eau croupit, mais elle écoute. Parle bas.", "J'ai vu des lumières danser là où aucun homme ne revient."] },
  ],
  ravines_rouille: [
    { name: "Tessard le Ferrailleur", lines: ["On m'appelle Tessard, et te voilà au fond des Ravines de rouille, voyageur.", "Tout ce qui est en métal finit par saigner orange par ici.", "Méfie-toi des éboulis : la terre rouge a faim, elle aussi."] },
    { name: "Naelis aux Lames", lines: ["L'air mord la peau et grignote l'acier. Garde ta lame huilée.", "Les profondeurs grondent... quelque chose remue sous la rouille."] },
  ],
  steppe_brulee: [
    { name: "Karjan le Nomade", lines: ["Moi c'est Karjan. Te voilà dans Steppe brûlée, étranger, là où la sécheresse a craquelé la terre comme une vieille peau morte.", "Le soleil ne se couche jamais vraiment ici, il se contente de cuire l'herbe noire jusqu'à l'os.", "Garde ta gourde scellée. Le vent te volera ta dernière goutte avant même que tu n'aies soif."] },
    { name: "Dame Hessa, gardienne des puits", lines: ["On me nomme Hessa. Je connais les rares puits encore vivants sous cette plaine calcinée.", "Ne suis pas la fumée à l'horizon. Ce n'est pas un feu de camp, c'est la steppe qui se consume d'elle-même."] },
  ],
  salines_gelees: [
    { name: "Yorvald le Saunier", lines: ["Moi c'est Yorvald. Te voilà sur Salines gelées, là où le sel et le givre se sont mariés pour aveugler les voyageurs.", "Garde les yeux mi-clos, étranger. Le blanc d'ici brûle la vue plus sûrement qu'aucun feu.", "La croûte craque sous tes bottes : marche où le sel est gris, jamais où il scintille."] },
    { name: "Dame Linnea l'Errante", lines: ["On m'appelle Linnea. J'ai vu des hommes tourner en rond trois jours dans ce désert blanc, persuadés d'avancer droit.", "Le vent y porte une saumure qui gerce les lèvres et fige les larmes. Couvre-toi le visage."] },
  ],
  canyon_poussiere: [
    { name: "Drevan le Foreur", lines: ["Moi c'est Drevan. Te voilà dans Canyon de poussière, là où le sable rouge t'étouffe avant que les parois ne t'écrasent.", "Quand le ciel vire à l'ocre, plaque-toi contre la roche : la tempête arrache la chair des imprudents.", "J'ai creusé chaque faille de ces gorges. Le silence, ici, annonce toujours l'effondrement."] },
    { name: "Dame Soraya, lectrice de vents", lines: ["On me nomme Soraya. J'entends la tempête se lever bien avant qu'elle ne noie le canyon de poussière.", "Ne respire pas à pleins poumons, voyageur. L'air d'ici est fait de pierre broyée.", "Suis l'écho de ma cloche si la nuit ocre te prend. C'est la seule voix que la bourrasque ne couvre pas."] },
  ],
  foret_petrifiee: [
    { name: "Doryen le Graveur d'Écorce", lines: ["Moi c'est Doryen. Te voilà dans Forêt pétrifiée, là où chaque arbre est devenu pierre et garde encore le cri du jour où la sève s'est figée.", "Ne t'appuie sur aucun tronc, voyageur. Certains se fendent sous la main et libèrent ce qui dormait dans le bois mort.", "Je grave les anneaux du temps dans cette écorce minérale. Mille ans par cercle, et la forêt en compte plus que je ne saurai jamais lire."] },
    { name: "Dame Cendralys la Silencieuse", lines: ["Parle bas, étranger. Ici le moindre son rebondit de tronc en tronc et finit par réveiller des oreilles qu'il vaut mieux laisser sourdes.", "On dit que les bêtes elles-mêmes se sont changées en statues. Méfie-toi de celles dont les yeux te suivent."] },
  ],
  gorges_oubli: [
    { name: "Harlec le Funambule", lines: ["Moi c'est Harlec. Te voilà dans Gorges de l'Oubli, là où les falaises se resserrent jusqu'à voler le ciel et où une pierre tombée met dix battements de cœur à toucher le fond.", "Suis les vires étroites que j'ai marquées d'ocre. Hors d'elles, le vide t'attend à chaque pas.", "Quand l'écho te répond avant que tu n'aies fini de crier, c'est que tu n'es plus seul dans la faille."] },
    { name: "Vieille Morgane des Ravins", lines: ["On m'appelle Morgane. J'ai descendu chaque ravin de ces gorges et remonté chaque corde, sauf une.", "Le vent s'engouffre ici comme une bête affamée. Ne lui tourne jamais le dos sur une corniche."] },
  ],
  steppe_ossements: [
    { name: "Korvath le Charognard", lines: ["Moi c'est Korvath. Te voilà dans Steppe d'Ossements, là où le sol est pavé des os d'armées que personne ne se rappelle avoir enterrées.", "Marche entre les côtes brisées, jamais dessus. Ce qui craque sous la botte ici peut décider de se relever.", "Je fouille ces dépouilles depuis vingt hivers. Le métal, je le garde. Les os qui chuchotent, je les laisse où ils sont."] },
    { name: "Dame Ysenne, lectrice de crânes", lines: ["Approche, voyageur. Je lis dans les orbites vides ce que les vivants n'osent plus se dire.", "Au crépuscule, la steppe se met à chanter avec mille voix éteintes. Bouche-toi les oreilles, ou apprends leur langue.", "Si une côte plantée dans le sol pointe vers toi, change de route. Elle ne te désigne pas par hasard."] },
  ],
  plateau_fumerolles: [
    { name: "Brannoc le Sourcier", lines: ["Moi c'est Brannoc. Te voilà sur Plateau des Fumerolles, là où la terre crache sa vapeur brûlante par mille bouches sans prévenir.", "Touche le sol avant d'avancer, étranger. S'il tremble sous tes doigts, recule : un geyser s'apprête à percer.", "Suis les mousses pâles, elles ne poussent que là où la croûte tient. Le reste n'est qu'une mince peau sur l'enfer."] },
    { name: "Dame Vapoline des Sources", lines: ["On me nomme Vapoline. Je recueille l'eau bouillante des fissures pour en tirer des baumes qui ferment les plaies.", "Ne respire pas trop près des fumées jaunes. Elles endorment d'abord, puis elles ne réveillent plus."] },
  ],
  mer_cendres: [
    { name: "Brann le Faucheur de Suie", lines: ["Moi c'est Brann. Te voilà dans Mer de cendres, là où le sol respire encore la braise des forêts mortes.", "Couvre-toi le visage, voyageur. Ici, l'air sèche les poumons avant même que la chaleur ne te touche.", "Quand la cendre se soulève sans le moindre vent, c'est qu'une chose marche dessous. Ne reste pas."] },
    { name: "Dame Ysande, glaneuse de braises", lines: ["Je ramasse les tisons encore vivants sous les couches grises. Chacun raconte un arbre disparu.", "Ne creuse pas trop profond, étranger. Le feu d'hier dort à peine, et il a faim de pas imprudents."] },
  ],
  charnier_brumeux: [
    { name: "Corvin le Croque-mort", lines: ["Moi c'est Corvin. Te voilà dans Charnier brumeux, là où les morts s'entassent plus vite qu'on ne les enterre.", "Respire par la bouche, voyageur, et marche vite. La brume ici porte la maladie autant que l'odeur.", "Si une main jaillit de la fange et t'attrape la cheville, ne crie pas. Tranche, et continue."] },
    { name: "Vieille Maelg, diseuse d'os", lines: ["Les corbeaux me connaissent et m'apportent ce qu'ils trouvent. Os, anneaux... parfois des secrets.", "On ne pourrit jamais seul dans ce charnier. Ceux qui s'y couchent finissent toujours par se relever."] },
  ],
  geole_foudre: [
    { name: "Tharek l'Enchaîné", lines: ["Moi c'est Tharek. Te voilà dans Geôle de foudre, là où les éclairs tournent en cage et frappent qui s'attarde.", "Touche le métal et tu es mort. Ces barreaux n'ont plus retenu un prisonnier vivant depuis des siècles.", "Compte les secondes entre deux foudres, voyageur. C'est le seul rythme qui te garde en vie ici."] },
    { name: "Dame Volène, capteuse d'orages", lines: ["J'emprisonne la foudre dans des fioles de verre noir. Chacune vaut le souffle qu'on risque à la prendre.", "N'approche pas des piliers fendus quand l'air se met à bourdonner. La décharge ne prévient qu'une fois."] },
  ],
  marais_poix: [
    { name: "Goldebran le Tourbier", lines: ["Moi c'est Goldebran. Te voilà dans Marais de poix, là où le bitume noir avale les bottes et tout ce qui suit.", "Saute de pierre en pierre, voyageur. Un pied posé dans la poix, et le marais ne le rend plus jamais.", "Quand des bulles crèvent la surface en cercle, recule. Quelque chose remonte chercher de l'air."] },
    { name: "Dame Sève-Noire", lines: ["On me nomme Dame Sève-Noire. Je distille la poix en feu liquide, le seul qui brûle sous la pluie.", "Garde une torche à portée. Dans ce marais, l'obscurité n'est pas un manque de lumière : c'est une présence."] },
  ],
  desolation_sel: [
    { name: "Sarn le Desséché", lines: ["Moi c'est Sarn. Te voilà dans Désolation de sel, là où une mer entière est morte et n'a laissé que sa croûte.", "Le sel boit ton eau par les pores, voyageur. Marche de nuit, ou le soleil te momifiera debout.", "Ne touche pas aux statues blanches. Ce ne sont pas des pierres : ce sont ceux qui sont restés trop longtemps."] },
    { name: "Dame Calsine, glaneuse de croûte", lines: ["Je taille des blocs dans la plaine craquelée. Le sel garde tout : les corps, les cris, et les regrets.", "Si le sol se met à siffler sous tes pas, c'est qu'il est creux. Et ce qui dort dans le creux a soif de sang."] },
  ],
  desert_verre: [
    { name: "Saruvel l'Échardé", lines: ["Je suis Saruvel l'Échardé, et tu marches sur le Désert de verre, voyageur.", "Chaque dune ici fut jadis une mer, figée par un éclair sans nom.", "Ne cours pas. Le sol se brise, et le sable tranche jusqu'à l'os."] },
    { name: "Dame Ilthène", lines: ["Le soleil se reflète mille fois... et mille soleils peuvent t'aveugler.", "On dit que sous le verre dorment des cités entières."] },
  ],
  foret_suspendue: [
    { name: "Brannok le Grimpeur", lines: ["On m'appelle Brannok le Grimpeur, bienvenue dans la Forêt suspendue.", "Ici les racines poussent vers le ciel et le sol n'existe plus depuis des âges.", "Un faux pas entre les branches, et tu tomberas sans jamais toucher terre."] },
  ],
  lac_mercure: [
    { name: "Vorlanthe la Pâle", lines: ["Je me nomme Vorlanthe la Pâle, gardienne du Lac de mercure.", "Son miroir te montre ton reflet... mais pas toujours le tien.", "Ceux qui s'y penchent trop longtemps n'en reviennent jamais les mêmes."] },
    { name: "Old Fenrec", lines: ["Le métal liquide chante quand la lune monte, écoute-le.", "J'ai vu des hommes y plonger pour leur double. Idiots."] },
  ],
  cavernes_sel: [
    { name: "Karzeth le Saumâtre", lines: ["Karzeth le Saumâtre, à ton service, dans les Cavernes de sel.", "Les cristaux qui scintillent ne sont pas un cadeau, ils dévorent l'eau de ton sang.", "Garde ta gourde près du cœur, étranger."] },
  ],
  volcan_endormi: [
    { name: "Embralda la Cendrée", lines: ["Je suis Embralda la Cendrée, et tu foules le Volcan endormi.", "Endormi, dis-tu ? Pose la main au sol et sens-le respirer sous toi.", "Le jour où il s'éveillera, prie pour être déjà loin."] },
    { name: "Pyron", lines: ["La fumée monte des fissures comme un soupir patient.", "Les anciens forgeaient leurs lames dans ses veines. Plus personne n'ose."] },
  ],
  toundra_spectrale: [
    { name: "Sygrin le Givré", lines: ["Sygrin le Givré, voilà mon nom, et voici la Toundra spectrale.", "Le vent porte les voix de ceux que le froid a pris avant toi.", "Ne réponds jamais quand on t'appelle par ton nom dans la neige."] },
  ],
  marais_luminescent: [
    { name: "Mélusine des Vases", lines: ["On me nomme Mélusine des Vases, et le Marais luminescent t'a déjà choisi.", "Ces lueurs vertes ne guident pas, elles attirent. Vers le fond.", "Suis mes pas exacts, ou la boue te chantera ta dernière berceuse."] },
    { name: "Crozat le Boueux", lines: ["Les feux follets dansent pour les affamés du marais.", "J'ai perdu trois compagnons à les suivre. Reste près de moi."] },
  ],
  cimetiere_etoiles: [
    { name: "Vesper l'Ensevelisseuse", lines: ["Je suis Vesper, gardienne du Cimetière des Étoiles. Ici reposent les soleils morts.", "Chaque lueur sous tes pieds fut un monde. Marche doucement.", "Si une étoile s'éveille, fuis. Leur agonie déchire la chair."] },
    { name: "Orphée des Cendres Astrales", lines: ["Tu entends ce silence ? C'est le chant qu'aucune constellation ne chantera plus.", "J'enterre les dieux qui se croyaient éternels."] },
  ],
  ocean_antimatiere: [
    { name: "Maelis la Noyée", lines: ["On me nomme Maelis. Bienvenue dans l'Océan d'Antimatière, où exister est une faute.", "Ne touche pas l'eau : elle efface ce que tu fus, pas seulement ce que tu es.", "Moi-même, je ne me souviens plus de mon visage."] },
  ],
  cathedrale_echos: [
    { name: "Frère Solenne", lines: ["Je suis Frère Solenne. Tu pénètres la Cathédrale des Échos, où toute prière revient déformée.", "Ce que tu dis ici te sera rendu mille fois, en pire.", "Garde le silence. Le silence, lui, ne ment pas."] },
    { name: "La Chantre Sans Voix", lines: ["...", "Elle ouvre la bouche, mais c'est ta propre voix qui en sort."] },
  ],
  desert_verre_hurlant: [
    { name: "Karrazh le Brûlé", lines: ["Karrazh, c'est moi. Et ça, c'est le Désert de Verre Hurlant. Bouche tes oreilles.", "Le sable était une foule, jadis. Le verre a figé leurs cris.", "Marche vite. Quand le vent se lève, ils se souviennent de hurler."] },
  ],
  jardin_yeux_clos: [
    { name: "Dame Lysandre", lines: ["Je suis Dame Lysandre. Tu fleuris au Jardin des Yeux Clos, et déjà ils s'ouvrent.", "Ne les regarde pas. Ce qu'ils voient, ils le rendent réel.", "Garde les paupières baissées, et peut-être survivras-tu à ta propre image."] },
    { name: "Le Semeur Aveugle", lines: ["J'ai planté chaque regard de mes mains nues.", "Toi aussi, un jour, tu pousseras ici."] },
  ],
  horloge_aion: [
    { name: "Chronos l'Égaré", lines: ["Je me nomme Chronos. Tu erres dans l'Horloge Brisée d'Aïon, où l'instant se mord la queue.", "Tu es déjà mort ici. Tu vas mourir ici. Tu meurs ici. Choisis.", "Ne suis pas les aiguilles. Elles te ramènent toujours au début."] },
  ],
  abysse_bouches: [
    { name: "Goran le Dévoré", lines: ["Goran, ce qu'il en reste. L'Abysse des Bouches Affamées m'a tout pris sauf la voix.", "Chaque mur ici a faim. Ne t'appuie sur rien.", "Quand tu entendras mâcher, c'est qu'il sera trop tard."] },
  ],
  trone_dieu_endormi: [
    { name: "Oracle Néïs", lines: ["Je suis l'Oracle Néïs. Te voici au Trône du Dieu Endormi. Parle bas.", "Tout ce monde n'est que Son rêve. Notre fin sera Son réveil.", "Avance, mais ne pleure pas trop fort : Il déteste être dérangé."] },
    { name: "Le Veilleur Pétrifié", lines: ["Mille ans que je compte Sa respiration.", "S'il ouvre un œil, nous n'aurons jamais existé."] },
  ],
};

export function npcsForBiome(id: string): NpcDef[] {
  return BIOME_NPCS[id] ?? [];
}
