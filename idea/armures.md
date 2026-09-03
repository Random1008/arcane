🛡️ ARMURES

État actuel (`src/core/armor.ts`, `src/core/sets.ts`, `src/core/equip.ts`). Menu d'équipement = touche **I**.

🧩 6 EMPLACEMENTS
Casque · Plastron · Jambières · Bottes · Gants · Amulette

🪖 3 TYPES (compromis protection / mobilité)

| Type | Défense (base) | Vitesse | Crit |
|---|---|---|---|
| Légère | 5 | +6% | +3% |
| Moyenne | 10 | 0 | +1% |
| Lourde | 16 | −8% | 0 |

- La **défense** monte avec le **tier** (×1.0 F → ×5.5 S) et ×1.5 si la pièce appartient à un **set Ω**.
- **Réduction des dégâts** = `100 / (100 + défense totale)` (**plafonnée à 70%**) **× (1 − résistance plate)**
  (**résistance plafonnée à 60%**) — pas d'invincibilité possible.
- Vitesse et crit s'additionnent sur les 6 pièces (compromis : tout léger = rapide/crit mais fragile).

✨ EFFETS PAR TIER (par pièce, cumulés sur les 6 — `tierArmorEffects`)
| Tier | Effets de la pièce |
|---|---|
| ⚪ F | défense seule |
| 🟢 E | résistance 1% |
| 🔵 D | résistance + régén 0.3 PV/s |
| 🟡 C | + bonus de type : légère → vitesse · moyenne → crit · lourde → résistance |
| 🟠 B | + dégâts +2%, régén 0.6 |
| 🔴 A | + crit supplémentaire (buffs multiples) |
| ⚫ S | résistance 3.5% · régén 0.9 · +4% dégâts (par pièce) |

⚠️ Les pièces de **set Ω** ne portent **pas** d'effets de tier (elles ont déjà déf ×1.5 + bonus de set 2/4/6).

🌟 7 PIÈCES UNIQUES S (drop : boss de rang S, 50% · test : `/armor uniques`)
| Pièce | Slot | Effet |
|---|---|---|
| Casque absolu | casque | vision des points faibles : +25% crit |
| Armure chaos | plastron | régén 2 PV/s + résistance 10% |
| Armure dimensionnelle | plastron | réduction de dégâts énorme (25%) |
| Bottes temporelles | bottes | dash recharge −60% + vitesse |
| Gants cosmiques | gants | +15% crit + vitesse |
| Cape infinie | amulette | **invisible 1.5 s toutes les 8 s** (les ennemis te perdent, n'attaquent plus) + esquive 10% |
| Bouclier éternel | amulette | **bloque automatiquement 1 attaque toutes les 4 s** + résistance 5% |

- Défense ×1.6, tier S, pas de set. Nom + effets affichés dans le menu **I**.
- Tous les dégâts subis passent par un pipeline unique (`hurtPlayer`) :
  godmode → invisibilité → esquive → blocage auto → défense + résistance.

🟣 SETS Ω
Les pièces d'armure **Ω** appartiennent à un set (Chaos / Temps / Néant) et octroient des **bonus à 2 / 4 / 6 pièces**.
→ détails dans `sets.md`.

🎁 OBTENTION
- Chaque **boss** lâche **1 pièce d'armure Ω** (set, emplacement et type aléatoires, au rang du boss).
- Les **boss de rang S** ont en plus **50% de chance** de lâcher une **pièce unique S**.
- La **boutique** vend des pièces normales (avec leurs effets de tier).

💡 IDÉES À VENIR
- **Armures Ω uniques** (Immortel Absolu, Voile du Néant, Flash Dimensionnel… cf. `a-implementer/arme-armure-competence.md`)
- Couturière (Lira) : améliorer les armures, y coudre des bonus
- Résistances élémentaires différenciées (feu, glace, poison…)
- Apparence visuelle de l'armure équipée sur le personnage
- Enchantements / gemmes à sertir
