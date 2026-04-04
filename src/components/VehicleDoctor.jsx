import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './VehicleDoctor.module.css'

const INPUT_MODES = [
  { id: 'text', label: 'Texte libre' },
  { id: 'photo', label: 'Photo du problème' },
  { id: 'audio', label: 'Note vocale' },
]

const QUICK_CASES = [
  'Ma voiture grince quand je freine',
  'Le moteur chauffe dans le trafic',
  'La batterie semble faible le matin',
  'J’ai un pneu qui perd de l’air',
]

const CASE_LIBRARY = [
  {
    id: 'oil-change',
    type: 'maintenance',
    symptoms: [
      { terms: ['vidange'], weight: 7 },
      { terms: ['huile'], weight: 5 },
      { terms: ['changement', 'huile'], weight: 6 },
      { terms: ['quand', 'vidange'], weight: 7 },
      { terms: ['quand', 'huile'], weight: 6 },
      { terms: ['entretien'], weight: 3 },
      { terms: ['rav4'], weight: 2 },
      { terms: ['2021'], weight: 1 },
    ],
    probableIssue: 'Conseil de vidange et d’entretien courant',
    confidence: 'Élevée',
    urgency: 'À planifier selon le kilométrage',
    estimate: 'En général tous les 8 000 à 10 000 km',
    duration: 'Environ tous les 6 à 12 mois',
    priceNote: 'Si vous faites surtout de la ville, du froid, de petits trajets ou beaucoup de trafic, faites-la plus tôt, souvent vers 5 000 à 8 000 km.',
    durationNote: 'Pour un RAV4 2021, vérifiez aussi le dernier entretien fait et l’indicateur de maintenance au tableau de bord.',
    searchCat: 'mechanic',
    summary: 'Pour une personne qui veut juste savoir quoi faire: une vidange sert à garder le moteur bien lubrifié. Si vous ne connaissez pas l’historique exact, le plus prudent est de vérifier la dernière vidange et de viser un entretien régulier plutôt que d’attendre un problème.',
    guidanceTitle: 'Ce que vous devez savoir',
    guidanceItems: [
      'Si la dernière vidange date de plus de 6 à 12 mois, il est raisonnable de la planifier.',
      'Si l’auto a roulé environ 8 000 à 10 000 km depuis la dernière vidange, il est souvent temps de la faire.',
      'Si vous faites surtout de courts trajets, du trafic ou l’hiver, faites-la plus tôt.',
      'Quand vous prenez rendez-vous, vous pouvez simplement demander: vidange d’huile + vérification de base.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h30', price: 'Vidange dès $89', tags: ['Vidange', 'Inspection rapide', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 16h00', price: 'Vidange dès $95', tags: ['Entretien', 'Avis élevés', 'Réservation express'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h30', price: 'Vidange dès $85', tags: ['Entretien', 'Contrôle de base', 'Fiable'] },
    ],
  },
  {
    id: 'accident-door',
    type: 'maintenance',
    symptoms: [
      { terms: ['accident'], weight: 7 },
      { terms: ['accroche'], weight: 4 },
      { terms: ['collision'], weight: 7 },
      { terms: ['choc'], weight: 5 },
      { terms: ['porte'], weight: 4 },
      { terms: ['porte', 'arriere'], weight: 6 },
      { terms: ['porte', 'ouvre pas'], weight: 8 },
      { terms: ['porte', 'bloquee'], weight: 8 },
      { terms: ['ne s ouvre pas'], weight: 8 },
      { terms: ['fermee'], weight: 2 },
      { terms: ['charniere'], weight: 4 },
      { terms: ['serrure'], weight: 4 },
      { terms: ['carrosserie'], weight: 5 },
    ],
    probableIssue: 'Porte arrière possiblement bloquée après impact',
    confidence: 'Moyenne à élevée',
    urgency: 'À faire vérifier rapidement',
    estimate: 'Contrôle carrosserie et mécanisme de porte',
    duration: 'Diagnostic souvent le jour même',
    priceNote: 'Après un accident, il faut vérifier la porte, la serrure, les charnières et l’alignement de la carrosserie avant de forcer l’ouverture.',
    durationNote: 'Si la porte est coincée après impact, un atelier de carrosserie ou un garage peut confirmer si c’est la tôle, la serrure ou le cadre qui bloque.',
    searchCat: 'body',
    summary: 'Après un accident, ne forcez pas la porte si elle ne s’ouvre plus. Le bon réflexe est de faire vérifier la carrosserie et le mécanisme d’ouverture pour éviter d’aggraver les dégâts ou de casser la poignée.',
    guidanceTitle: 'Quoi faire maintenant',
    guidanceItems: [
      'N’essayez pas de forcer la porte avec violence, surtout si elle frotte ou semble décalée.',
      'Vérifiez si le problème vient de la poignée, de la serrure ou d’un décalage visible de la porte après le choc.',
      'Si la porte ferme mal ou si la carrosserie est enfoncée, cherchez plutôt un atelier de carrosserie.',
      'Quand vous appelez, dites simplement: accident, porte arrière bloquée, j’ai besoin d’un contrôle carrosserie et mécanisme de porte.',
    ],
    matches: [
      { name: 'Atelier Carrosserie MTL', rating: '4.8', distance: '2.6 km', eta: 'Aujourd’hui 15h40', price: 'Diagnostic carrosserie', tags: ['Carrosserie', 'Portes', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 17h00', price: 'Inspection rapide', tags: ['Diagnostic', 'Après accident', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h15', price: 'Contrôle de porte', tags: ['Mécanique', 'Serrure', 'Proche'] },
    ],
  },
  {
    id: 'headlight',
    type: 'maintenance',
    symptoms: [
      { terms: ['phare'], weight: 6 },
      { terms: ['phares'], weight: 6 },
      { terms: ['lumiere'], weight: 3 },
      { terms: ['ampoule'], weight: 5 },
      { terms: ['avant'], weight: 2 },
      { terms: ['avant', 'fonctionne pas'], weight: 7 },
      { terms: ['phare', 'fonctionne pas'], weight: 8 },
      { terms: ['phare', 'marche pas'], weight: 8 },
      { terms: ['ne fonctionne pas'], weight: 5 },
      { terms: ['eclairage'], weight: 5 },
      { terms: ['feu'], weight: 4 },
      { terms: ['fusible'], weight: 4 },
      { terms: ['electrique'], weight: 4 },
    ],
    probableIssue: 'Problème de phare avant ou d’éclairage',
    confidence: 'Moyenne à élevée',
    urgency: 'À faire vérifier rapidement',
    estimate: 'Souvent ampoule, fusible ou connecteur',
    duration: 'Contrôle rapide en atelier',
    priceNote: 'Le problème peut venir d’une ampoule grillée, d’un fusible, d’un faux contact ou du bloc optique.',
    durationNote: 'Si un seul phare avant ne marche plus, la vérification est souvent simple et rapide.',
    searchCat: 'mechanic',
    summary: 'Si le phare avant ne fonctionne plus, évitez de rouler la nuit sans réparation. Le plus souvent, il faut vérifier l’ampoule, le fusible ou le câblage avant de remplacer des pièces plus coûteuses.',
    guidanceTitle: 'Quoi vérifier',
    guidanceItems: [
      'Regardez si un seul phare est touché ou les deux.',
      'Si un seul côté est éteint, une ampoule grillée est une cause fréquente.',
      'Si le phare s’allume parfois puis s’éteint, il peut s’agir d’un faux contact.',
      'Quand vous appelez, dites: phare avant ne fonctionne pas, j’ai besoin d’un contrôle ampoule, fusible et connexion.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h10', price: 'Contrôle éclairage', tags: ['Électrique', 'Phare', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 15h20', price: 'Diagnostic rapide', tags: ['Électrique', 'Avis élevés', 'Fiable'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h00', price: 'Vérification phare', tags: ['Éclairage', 'Inspection', 'Proche'] },
    ],
  },
  {
    id: 'brakes',
    type: 'repair',
    symptoms: [
      { terms: ['frein'], weight: 4 },
      { terms: ['freine'], weight: 4 },
      { terms: ['freinage'], weight: 4 },
      { terms: ['plaquette'], weight: 5 },
      { terms: ['plaquettes'], weight: 5 },
      { terms: ['disque'], weight: 4 },
      { terms: ['grince'], weight: 3 },
      { terms: ['grincement'], weight: 3 },
      { terms: ['couine'], weight: 3 },
      { terms: ['pedale', 'vibre'], weight: 5 },
      { terms: ['bruit', 'frein'], weight: 5 },
      { terms: ['bruit metallique'], weight: 4 },
      { terms: ['brake'], weight: 4 },
    ],
    probableIssue: 'Plaquettes de frein usées',
    confidence: 'Élevée',
    urgency: 'À traiter rapidement',
    estimate: '$180 - $320',
    duration: '45 min - 1 h 30',
    priceNote: 'Inclut inspection et remplacement avant',
    durationNote: 'Selon l’état des disques',
    searchCat: 'mechanic',
    summary: 'Le symptôme ressemble à une usure avancée des plaquettes avant. Le système recommande une inspection le jour même pour éviter d’abîmer les disques.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h20', price: '$210 estimé', tags: ['Freins', 'Inspection incluse', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 15h10', price: '$195 estimé', tags: ['Freins', 'Pièces en stock', 'Très rapide'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 16h00', price: '$230 estimé', tags: ['Freins', 'Avis élevés', 'Paiement sur place'] },
    ],
  },
  {
    id: 'battery',
    type: 'repair',
    symptoms: [
      { terms: ['batterie'], weight: 5 },
      { terms: ['demarre pas'], weight: 6 },
      { terms: ['ne demarre pas'], weight: 6 },
      { terms: ['aucune lumiere'], weight: 8 },
      { terms: ['aucune lampe'], weight: 8 },
      { terms: ['aucun voyant'], weight: 8 },
      { terms: ['rien allume'], weight: 8 },
      { terms: ['rien s allume'], weight: 8 },
      { terms: ['pas de courant'], weight: 7 },
      { terms: ['plus de courant'], weight: 7 },
      { terms: ['demarrage'], weight: 4 },
      { terms: ['booster'], weight: 5 },
      { terms: ['alternateur'], weight: 5 },
      { terms: ['courant'], weight: 3 },
      { terms: ['faible', 'batterie'], weight: 5 },
      { terms: ['le matin', 'demarre'], weight: 4 },
      { terms: ['starter'], weight: 4 },
      { terms: ['clique'], weight: 3 },
      { terms: ['clic'], weight: 3 },
    ],
    probableIssue: 'Batterie faible ou alternateur à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À planifier aujourd’hui',
    estimate: '$120 - $340',
    duration: '30 min - 1 h',
    priceNote: 'Test batterie + charge + remplacement si nécessaire',
    durationNote: 'Plus rapide si la batterie est disponible en stock',
    searchCat: 'mechanic',
    summary: 'Le démarrage difficile au froid ou après stationnement pointe vers une batterie fatiguée. Un test de charge et de système de démarrage est conseillé.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 11h40', price: '$145 estimé', tags: ['Batterie', 'Test rapide', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 14h00', price: '$160 estimé', tags: ['Électrique', 'Diagnostic', 'Réservation express'] },
      { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd’hui 16h15', price: '$130 estimé', tags: ['Petit budget', 'Disponible', 'Client régulier'] },
    ],
  },
  {
    id: 'tires',
    type: 'repair',
    symptoms: [
      { terms: ['pneu'], weight: 4 },
      { terms: ['pneus'], weight: 4 },
      { terms: ['crevaison'], weight: 6 },
      { terms: ['air'], weight: 2 },
      { terms: ['pression'], weight: 4 },
      { terms: ['jante'], weight: 3 },
      { terms: ['perd', 'air'], weight: 6 },
      { terms: ['fuite', 'air'], weight: 6 },
      { terms: ['a plat'], weight: 6 },
      { terms: ['gonfler'], weight: 3 },
      { terms: ['valve'], weight: 4 },
    ],
    probableIssue: 'Fuite lente ou crevaison sur un pneu',
    confidence: 'Élevée',
    urgency: 'À faire avant un long trajet',
    estimate: '$35 - $180',
    duration: '20 min - 50 min',
    priceNote: 'Réparation simple ou remplacement selon l’usure',
    durationNote: 'Permutation possible en même temps',
    searchCat: 'tire',
    summary: 'Une perte d’air répétée indique souvent une crevaison lente ou une valve abîmée. Le système recommande un contrôle immédiat pour éviter l’éclatement.',
    matches: [
      { name: 'Dubé Pneu et Mécan.', rating: '4.3', distance: '2.1 km', eta: 'Aujourd’hui 12h15', price: '$49 estimé', tags: ['Pneus', 'Réparation rapide', 'Stock hiver'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h20', price: '$65 estimé', tags: ['Pneus', 'Inspection incluse', 'Disponible'] },
      { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd’hui 17h00', price: '$55 estimé', tags: ['Petit budget', 'Disponible', 'Sans rendez-vous'] },
    ],
  },
  {
    id: 'overheat',
    type: 'repair',
    symptoms: [
      { terms: ['chauffe'], weight: 5 },
      { terms: ['temperature'], weight: 4 },
      { terms: ['surchauffe'], weight: 6 },
      { terms: ['radiateur'], weight: 5 },
      { terms: ['liquide'], weight: 2 },
      { terms: ['refroidissement'], weight: 5 },
      { terms: ['aiguille', 'monte'], weight: 6 },
      { terms: ['moteur', 'chauffe'], weight: 6 },
      { terms: ['ventilateur'], weight: 3 },
      { terms: ['thermostat'], weight: 3 },
    ],
    probableIssue: 'Surchauffe liée au liquide de refroidissement',
    confidence: 'Moyenne',
    urgency: 'Urgent si l’aiguille monte vite',
    estimate: '$95 - $420',
    duration: '45 min - 2 h',
    priceNote: 'Contrôle circuit, fuite, thermostat ou ventilateur',
    durationNote: 'Dépend de la pièce en cause',
    searchCat: 'mechanic',
    summary: 'Le moteur qui chauffe en circulation lente peut signaler un manque de liquide, un ventilateur défectueux ou un thermostat bloqué. Évite de rouler longtemps avant inspection.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h45', price: '$120 estimé', tags: ['Refroidissement', 'Diagnostic', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 15h30', price: '$140 estimé', tags: ['Moteur', 'Contrôle complet', 'Aujourd’hui'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h00', price: '$110 estimé', tags: ['Diagnostic', 'Très proche', 'Fiable'] },
    ],
  },
  {
    id: 'check-engine',
    type: 'maintenance',
    symptoms: [
      { terms: ['check engine'], weight: 9 },
      { terms: ['moteur', 'allume'], weight: 6 },
      { terms: ['voyant', 'moteur'], weight: 8 },
      { terms: ['lumiere', 'moteur'], weight: 7 },
      { terms: ['temoin', 'moteur'], weight: 7 },
      { terms: ['voyant'], weight: 3 },
      { terms: ['diagnostic'], weight: 2 },
    ],
    probableIssue: 'Voyant moteur à faire diagnostiquer',
    confidence: 'Moyenne',
    urgency: 'À vérifier bientôt',
    estimate: 'Lecture de codes et diagnostic électronique',
    duration: 'Souvent en moins d’une heure',
    priceNote: 'Le voyant moteur peut venir d’un capteur, d’un problème d’allumage, d’émissions ou d’un défaut plus sérieux.',
    durationNote: 'Si le voyant clignote ou si l’auto roule très mal, arrêtez-vous dès que possible.',
    searchCat: 'mechanic',
    summary: 'Le voyant moteur ne dit pas exactement quoi changer, mais il indique qu’un diagnostic électronique est nécessaire pour lire le code et éviter de remplacer des pièces au hasard.',
    guidanceTitle: 'Bon réflexe',
    guidanceItems: [
      'Si le voyant est fixe, prenez rendez-vous rapidement pour une lecture de codes.',
      'S’il clignote, limitez la conduite et faites vérifier l’auto dès que possible.',
      'Notez si l’auto tremble, manque de puissance ou consomme plus que d’habitude.',
      'Demandez simplement: voyant moteur allumé, j’ai besoin d’un scan et d’un diagnostic.',
    ],
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 14h10', price: 'Scan moteur', tags: ['Diagnostic', 'Électronique', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 15h45', price: 'Lecture codes', tags: ['Moteur', 'Rapide', 'Proche'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h20', price: 'Diagnostic complet', tags: ['Check engine', 'Fiable', 'Inspection'] },
    ],
  },
  {
    id: 'ac-no-cold',
    type: 'maintenance',
    symptoms: [
      { terms: ['air climatise'], weight: 8 },
      { terms: ['clim'], weight: 6 },
      { terms: ['ac'], weight: 5 },
      { terms: ['ne refroidit pas'], weight: 8 },
      { terms: ['souffle', 'chaud'], weight: 7 },
      { terms: ['pas froid'], weight: 7 },
      { terms: ['climatisation'], weight: 6 },
      { terms: ['froid'], weight: 3 },
    ],
    probableIssue: 'Climatisation faible ou non fonctionnelle',
    confidence: 'Moyenne à élevée',
    urgency: 'À planifier selon le confort',
    estimate: 'Contrôle gaz, compresseur ou fuite',
    duration: 'Diagnostic souvent rapide',
    priceNote: 'Le problème peut venir d’un manque de gaz, d’une fuite, du compresseur ou d’un souci électrique.',
    durationNote: 'Un atelier peut d’abord contrôler la pression et confirmer si une recharge suffit ou non.',
    searchCat: 'mechanic',
    summary: 'Si l’air ne devient plus froid, il faut vérifier le niveau de réfrigérant et le circuit de climatisation avant de faire une recharge au hasard.',
    guidanceTitle: 'Ce que vous pouvez dire au garage',
    guidanceItems: [
      'Ma clim ne refroidit plus ou souffle chaud.',
      'Je veux vérifier s’il manque du gaz ou s’il y a une fuite.',
      'Si possible, faites un contrôle pression + compresseur.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 16h10', price: 'Contrôle clim', tags: ['Climatisation', 'Diagnostic', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 10h00', price: 'Recharge / test', tags: ['A/C', 'Inspection', 'Fiable'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 11h15', price: 'Diagnostic clim', tags: ['Compresseur', 'Circuit', 'Avis élevés'] },
    ],
  },
  {
    id: 'suspension-noise',
    type: 'repair',
    symptoms: [
      { terms: ['clac'], weight: 6 },
      { terms: ['cloc'], weight: 5 },
      { terms: ['cogne'], weight: 5 },
      { terms: ['bosse'], weight: 4 },
      { terms: ['suspension'], weight: 7 },
      { terms: ['amortisseur'], weight: 6 },
      { terms: ['bruit', 'bosse'], weight: 7 },
      { terms: ['train avant'], weight: 6 },
      { terms: ['cognement'], weight: 6 },
    ],
    probableIssue: 'Suspension ou train avant à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À vérifier rapidement',
    estimate: '$120 - $650',
    duration: '1 h à 3 h selon la pièce',
    priceNote: 'Le bruit peut venir d’un amortisseur, d’une biellette, d’un silentbloc ou d’une pièce du train avant.',
    durationNote: 'Le diagnostic sert à trouver la pièce précise avant remplacement.',
    searchCat: 'mechanic',
    summary: 'Un bruit sur les bosses ou en tournant indique souvent une pièce de suspension ou de direction fatiguée. Il vaut mieux la faire inspecter avant que l’usure ne s’aggrave.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h50', price: '$145 diagnostic', tags: ['Suspension', 'Train avant', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 16h20', price: '$160 inspection', tags: ['Direction', 'Biellettes', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h40', price: '$130 contrôle', tags: ['Suspension', 'Rapide', 'Proche'] },
    ],
  },
  {
    id: 'steering-vibration',
    type: 'repair',
    symptoms: [
      { terms: ['volant', 'vibre'], weight: 8 },
      { terms: ['vibration', 'volant'], weight: 8 },
      { terms: ['direction'], weight: 4 },
      { terms: ['aligne'], weight: 4 },
      { terms: ['equilibrage'], weight: 5 },
      { terms: ['autoroute'], weight: 3 },
      { terms: ['tremble'], weight: 3 },
    ],
    probableIssue: 'Vibration au volant à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À planifier rapidement',
    estimate: '$60 - $240',
    duration: '30 min à 2 h',
    priceNote: 'La cause fréquente est un pneu mal équilibré, un problème d’alignement ou une usure de direction/suspension.',
    durationNote: 'Le garage peut commencer par équilibrage et inspection du train roulant.',
    searchCat: 'mechanic',
    summary: 'Un volant qui vibre indique souvent un souci de pneus, d’équilibrage ou de train avant. Ce n’est pas à ignorer si la vibration augmente avec la vitesse.',
    matches: [
      { name: 'Dubé Pneu et Mécan.', rating: '4.3', distance: '2.1 km', eta: 'Aujourd’hui 12h40', price: 'Équilibrage / alignement', tags: ['Pneus', 'Direction', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 15h00', price: 'Contrôle volant', tags: ['Train avant', 'Inspection', 'Proche'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 10h10', price: 'Diagnostic châssis', tags: ['Suspension', 'Direction', 'Fiable'] },
    ],
  },
  {
    id: 'transmission',
    type: 'repair',
    symptoms: [
      { terms: ['transmission'], weight: 8 },
      { terms: ['vitesse', 'passe pas'], weight: 8 },
      { terms: ['change', 'mal'], weight: 6 },
      { terms: ['boite'], weight: 6 },
      { terms: ['patine'], weight: 7 },
      { terms: ['coups'], weight: 5 },
      { terms: ['jerk'], weight: 5 },
      { terms: ['automatique'], weight: 3 },
    ],
    probableIssue: 'Transmission ou boîte de vitesses à diagnostiquer',
    confidence: 'Moyenne',
    urgency: 'À vérifier rapidement',
    estimate: '$140 - $900+',
    duration: 'Diagnostic nécessaire avant devis',
    priceNote: 'La cause peut aller d’un niveau d’huile/transmission à un problème interne plus important.',
    durationNote: 'Ne pas continuer à rouler longtemps si les vitesses cognent fort ou ne passent plus correctement.',
    searchCat: 'mechanic',
    summary: 'Une transmission qui patine, donne des coups ou passe mal les vitesses doit être diagnostiquée rapidement pour éviter des dommages plus coûteux.',
    matches: [
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 15h50', price: 'Diagnostic transmission', tags: ['Boîte', 'Inspection', 'Fiable'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 09h20', price: 'Lecture et essai', tags: ['Transmission', 'Avis élevés', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 10h10', price: 'Contrôle vitesses', tags: ['Automatique', 'Rapide', 'Proche'] },
    ],
  },
  {
    id: 'smoke-exhaust',
    type: 'repair',
    symptoms: [
      { terms: ['fumee'], weight: 7 },
      { terms: ['fumee'], weight: 7 },
      { terms: ['echappement'], weight: 6 },
      { terms: ['bleue'], weight: 5 },
      { terms: ['blanche'], weight: 5 },
      { terms: ['noire'], weight: 5 },
      { terms: ['sort'], weight: 2 },
      { terms: ['odeur'], weight: 2 },
    ],
    probableIssue: 'Fumée ou problème d’échappement à vérifier',
    confidence: 'Moyenne',
    urgency: 'À vérifier rapidement',
    estimate: 'Diagnostic moteur / échappement',
    duration: 'Variable selon la cause',
    priceNote: 'La couleur de la fumée aide: blanche, noire ou bleue ne pointent pas vers les mêmes causes.',
    durationNote: 'Si la fumée est importante ou accompagnée d’une perte de puissance, évitez de rouler inutilement.',
    searchCat: 'mechanic',
    summary: 'La fumée à l’échappement peut indiquer un problème de combustion, d’huile ou de refroidissement. Il faut surtout éviter de continuer à rouler si le symptôme est marqué.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 14h50', price: 'Diagnostic moteur', tags: ['Fumée', 'Échappement', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 17h10', price: 'Inspection complète', tags: ['Moteur', 'Combustion', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h30', price: 'Contrôle échappement', tags: ['Échappement', 'Rapide', 'Proche'] },
    ],
  },
  {
    id: 'oil-leak',
    type: 'repair',
    symptoms: [
      { terms: ['fuite', 'huile'], weight: 8 },
      { terms: ['huile', 'sol'], weight: 7 },
      { terms: ['tache', 'huile'], weight: 7 },
      { terms: ['coule', 'huile'], weight: 8 },
      { terms: ['huile'], weight: 3 },
      { terms: ['leak'], weight: 3 },
    ],
    probableIssue: 'Fuite d’huile moteur à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À vérifier rapidement',
    estimate: '$120 - $550',
    duration: 'Selon l’origine de la fuite',
    priceNote: 'La fuite peut venir d’un joint, d’un bouchon, du carter ou du filtre.',
    durationNote: 'Il faut d’abord localiser l’origine exacte avant devis final.',
    searchCat: 'mechanic',
    summary: 'Une fuite d’huile ne doit pas être ignorée, surtout si la tache grandit ou si le niveau baisse. Le mieux est de faire localiser la fuite avant qu’elle n’abîme le moteur.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h20', price: 'Recherche de fuite', tags: ['Huile', 'Diagnostic', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 16h30', price: 'Inspection moteur', tags: ['Fuite', 'Joint', 'Fiable'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h50', price: 'Contrôle complet', tags: ['Huile', 'Réparation', 'Proche'] },
    ],
  },
  {
    id: 'coolant-leak',
    type: 'repair',
    symptoms: [
      { terms: ['fuite', 'liquide'], weight: 5 },
      { terms: ['liquide', 'refroidissement'], weight: 8 },
      { terms: ['coolant'], weight: 7 },
      { terms: ['radiateur'], weight: 6 },
      { terms: ['antigel'], weight: 6 },
      { terms: ['vert'], weight: 3 },
      { terms: ['rose'], weight: 3 },
    ],
    probableIssue: 'Fuite de liquide de refroidissement',
    confidence: 'Moyenne à élevée',
    urgency: 'À vérifier vite',
    estimate: '$110 - $480',
    duration: 'Variable selon la fuite',
    priceNote: 'La fuite peut venir d’une durite, du radiateur, du bouchon ou d’une autre pièce du circuit.',
    durationNote: 'Évitez de rouler si le niveau descend vite ou si la température monte.',
    searchCat: 'mechanic',
    summary: 'Une fuite de liquide de refroidissement peut mener à une surchauffe. Il faut contrôler le circuit avant de continuer à rouler normalement.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h30', price: 'Test circuit', tags: ['Radiateur', 'Fuite', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 15h30', price: 'Inspection liquide', tags: ['Refroidissement', 'Rapide', 'Proche'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 10h20', price: 'Diagnostic fuite', tags: ['Coolant', 'Fiable', 'Inspection'] },
    ],
  },
  {
    id: 'window-regulator',
    type: 'maintenance',
    symptoms: [
      { terms: ['vitre'], weight: 6 },
      { terms: ['fenetre'], weight: 5 },
      { terms: ['descend plus'], weight: 8 },
      { terms: ['monte plus'], weight: 8 },
      { terms: ['ouvre plus'], weight: 5 },
      { terms: ['moteur', 'vitre'], weight: 6 },
      { terms: ['switch'], weight: 4 },
      { terms: ['regulateur'], weight: 5 },
    ],
    probableIssue: 'Vitre électrique ou mécanisme de fenêtre à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À planifier rapidement',
    estimate: 'Moteur, interrupteur ou régulateur',
    duration: 'Souvent rapide à diagnostiquer',
    priceNote: 'Le problème peut venir du bouton, du moteur de vitre ou du mécanisme intérieur.',
    durationNote: 'Si la vitre reste ouverte, il vaut mieux faire réparer rapidement pour éviter l’eau et le vol.',
    searchCat: 'mechanic',
    summary: 'Une vitre qui ne monte plus ou ne descend plus est souvent liée au moteur, au bouton ou au régulateur. Le diagnostic permet de cibler la pièce exacte.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 16h10', price: 'Contrôle vitre', tags: ['Électrique', 'Fenêtre', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h15', price: 'Inspection mécanisme', tags: ['Porte', 'Régulateur', 'Fiable'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 11h00', price: 'Diagnostic rapide', tags: ['Vitre', 'Switch', 'Avis élevés'] },
    ],
  },
  {
    id: 'wipers',
    type: 'maintenance',
    symptoms: [
      { terms: ['essuie glace'], weight: 8 },
      { terms: ['essuie-glace'], weight: 8 },
      { terms: ['balai'], weight: 4 },
      { terms: ['pluie'], weight: 2 },
      { terms: ['nettoie mal'], weight: 6 },
      { terms: ['ne marche pas'], weight: 4 },
      { terms: ['moteur', 'essuie'], weight: 6 },
    ],
    probableIssue: 'Essuie-glace ou système d’essuyage à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À régler vite si mauvais temps',
    estimate: 'Souvent balais, fusible ou moteur',
    duration: 'Souvent rapide',
    priceNote: 'Parfois un simple remplacement de balais suffit, parfois il faut contrôler le moteur ou le fusible.',
    durationNote: 'C’est un point de sécurité, surtout en pluie ou neige.',
    searchCat: 'mechanic',
    summary: 'Si les essuie-glaces nettoient mal ou ne fonctionnent plus, il faut les faire vérifier rapidement pour garder une bonne visibilité.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h50', price: 'Contrôle essuie-glace', tags: ['Sécurité', 'Balais', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 15h40', price: 'Diagnostic rapide', tags: ['Moteur', 'Fusible', 'Fiable'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h40', price: 'Inspection visibilité', tags: ['Essuie-glace', 'Proche', 'Rapide'] },
    ],
  },
  {
    id: 'fuel-smell',
    type: 'repair',
    symptoms: [
      { terms: ['odeur', 'essence'], weight: 9 },
      { terms: ['odeur', 'gaz'], weight: 7 },
      { terms: ['essence'], weight: 5 },
      { terms: ['fuel'], weight: 5 },
      { terms: ['fuite', 'essence'], weight: 9 },
      { terms: ['sent', 'essence'], weight: 7 },
    ],
    probableIssue: 'Odeur d’essence ou fuite possible à faire vérifier',
    confidence: 'Élevée',
    urgency: 'Urgent',
    estimate: 'Contrôle alimentation carburant',
    duration: 'Dès que possible',
    priceNote: 'Une odeur d’essence peut indiquer une fuite ou un problème du circuit d’alimentation.',
    durationNote: 'Évitez de continuer à rouler ou de stationner dans un endroit fermé sans contrôle.',
    searchCat: 'mechanic',
    summary: 'Une odeur d’essence est un symptôme à prendre au sérieux. Le plus prudent est de limiter l’usage du véhicule et de faire vérifier rapidement le circuit de carburant.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h10', price: 'Contrôle carburant', tags: ['Urgent', 'Sécurité', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h00', price: 'Inspection fuite', tags: ['Essence', 'Rapide', 'Proche'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 16h10', price: 'Diagnostic complet', tags: ['Carburant', 'Fiable', 'Inspection'] },
    ],
  },
]

const DEFAULT_CASE = {
  type: 'repair',
  probableIssue: 'Inspection mécanique générale recommandée',
  confidence: 'Moyenne',
  urgency: 'À planifier selon le symptôme',
  estimate: '$85 - $220',
  duration: '30 min - 1 h',
  priceNote: 'Diagnostic initial avant devis précis',
  durationNote: 'Le devis final dépendra du véhicule',
  searchCat: 'mechanic',
  summary: 'Le symptôme décrit n’est pas assez précis pour isoler une panne unique. FlashMat recommande un diagnostic rapide avec un garage disponible aujourd’hui.',
  matches: [
    { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 13h50', price: '$95 estimé', tags: ['Diagnostic', 'Très proche', 'Disponible'] },
    { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 15h00', price: '$110 estimé', tags: ['Diagnostic', 'Avis élevés', 'Réservation express'] },
    { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd’hui 16h40', price: '$89 estimé', tags: ['Petit budget', 'Disponible', 'Montréal'] },
  ],
}

function detectCase(text) {
  const normalized = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const urgentOverrides = [
    {
      anyTerms: [
        'roule toute seule',
        'freine toute seule',
        'accelere toute seule',
        'avance toute seule',
        'la voiture freine toute seule',
        'la voiture roule toute seule',
        'la voiture accelere toute seule',
      ],
      response: {
        ...DEFAULT_CASE,
        probableIssue: 'Probleme de securite critique sur l acceleration ou le freinage',
        confidence: 'Elevee',
        urgency: 'Urgent - ne pas conduire',
        estimate: 'Remorquage et diagnostic de securite recommandes',
        duration: 'A verifier immediatement',
        priceNote: 'Une voiture qui roule, accelere ou freine toute seule peut presenter un probleme grave lie a la pedale, au freinage, a l accelerateur, a l electronique ou a un blocage mecanique.',
        durationNote: 'Le plus prudent est de ne pas continuer a rouler et de faire inspecter le vehicule des que possible.',
        searchCat: 'mechanic',
        summary: 'Ce symptome ne correspond pas a une usure normale de plaquettes. C est un cas de securite critique qui doit etre traite immediatement avant toute autre utilisation du vehicule.',
        guidanceTitle: 'Quoi faire maintenant',
        guidanceItems: [
          'N utilisez pas le vehicule tant que le probleme n est pas verifie.',
          'Si le comportement se produit en roulant, arretez vous des que possible dans un endroit securitaire.',
          'Faites remorquer le vehicule si vous n avez pas confiance dans le freinage ou l acceleration.',
          'Quand vous appelez, dites: la voiture roule ou freine toute seule, j ai besoin d un diagnostic de securite urgent.',
        ],
        matches: [
          { name: 'Garage Mecanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd hui 13h10', price: 'Diagnostic securite urgent', tags: ['Urgent', 'Freinage', 'Disponible'] },
          { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd hui 14h00', price: 'Inspection prioritaire', tags: ['Securite', 'Rapide', 'Proche'] },
          { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd hui 15h20', price: 'Controle complet', tags: ['Diagnostic', 'Urgent', 'Fiable'] },
        ],
      },
    },
    {
      terms: ['demarre pas'],
      anyTerms: ['aucune lumiere', 'aucune lampe', 'aucun voyant', 'rien allume', 'rien s allume', 'pas de courant', 'plus de courant'],
      response: {
        ...DEFAULT_CASE,
        probableIssue: 'Batterie dechargee ou alimentation electrique principale a verifier',
        confidence: 'Elevee',
        urgency: 'A faire verifier rapidement',
        estimate: 'Test batterie, bornes et systeme de demarrage',
        duration: 'Souvent 30 min a 1 h',
        priceNote: 'Quand la voiture ne demarre pas et qu aucune lumiere ne s allume, la batterie est souvent tres faible, debranchee ou le courant principal n arrive plus correctement.',
        durationNote: 'Un garage peut verifier la batterie, les bornes, les fusibles principaux et l alimentation du demarreur.',
        searchCat: 'mechanic',
        summary: 'Si rien ne s allume au tableau de bord et que la voiture ne demarre pas, il faut d abord penser a la batterie ou a un probleme d alimentation electrique avant de chercher une panne mecanique generale.',
        guidanceTitle: 'Quoi faire maintenant',
        guidanceItems: [
          'Verifiez si les bornes de batterie sont desserrees ou tres oxydees.',
          'Si vous avez acces a des cables ou a un booster, un survoltage peut confirmer si la batterie est en cause.',
          'Si rien ne s allume du tout, evitez d insister longtemps sur le demarreur.',
          'Quand vous appelez, dites: la voiture ne demarre pas et aucune lumiere ne s allume, je veux un test batterie et alimentation.',
        ],
        matches: [
          { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd hui 11h40', price: 'Test batterie rapide', tags: ['Batterie', 'Demarrage', 'Disponible'] },
          { name: 'Garage Mecanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd hui 14h00', price: 'Diagnostic electrique', tags: ['Electrique', 'Batterie', 'Reservation express'] },
          { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd hui 16h15', price: 'Verification courant', tags: ['Petit budget', 'Disponible', 'Proche'] },
        ],
      },
    },
    {
      terms: ['odeur', 'essence'],
      response: {
        ...DEFAULT_CASE,
        probableIssue: 'Odeur d’essence à faire vérifier immédiatement',
        confidence: 'Élevée',
        urgency: 'Urgent',
        estimate: 'Contrôle alimentation carburant',
        duration: 'Dès que possible',
        priceNote: 'Évitez de continuer à rouler inutilement et faites contrôler le véhicule rapidement.',
        durationNote: 'La sécurité passe avant le devis final.',
        summary: 'Une odeur d’essence peut indiquer une fuite ou un problème du circuit de carburant. Le mieux est de faire vérifier le véhicule rapidement.',
      },
    },
    {
      terms: ['voyant', 'clignote'],
      response: {
        ...DEFAULT_CASE,
        probableIssue: 'Voyant moteur clignotant à faire vérifier rapidement',
        confidence: 'Élevée',
        urgency: 'Urgent',
        estimate: 'Diagnostic électronique immédiat',
        duration: 'Dès que possible',
        priceNote: 'Un voyant moteur clignotant peut signaler un problème plus sérieux qu’un voyant fixe.',
        durationNote: 'Limitez la conduite jusqu’au diagnostic.',
        summary: 'Si le voyant clignote, mieux vaut éviter de rouler longtemps et demander un diagnostic dès que possible.',
      },
    },
  ]

  const override = urgentOverrides.find((item) =>
    (!item.terms || item.terms.every((term) => normalized.includes(term)))
    && (!item.anyTerms || item.anyTerms.some((term) => normalized.includes(term)))
  )

  if (override) {
    return override.response
  }

  const scoredCases = CASE_LIBRARY
    .map((candidate) => {
      const score = candidate.symptoms.reduce((total, symptom) => {
        const matched = symptom.terms.every((term) => normalized.includes(term))
        return matched ? total + symptom.weight : total
      }, 0)

      return { candidate, score }
    })
    .sort((left, right) => right.score - left.score)

  const [bestMatch, nextMatch] = scoredCases

  if (!bestMatch || bestMatch.score < 4) {
    return DEFAULT_CASE
  }

  if (nextMatch && bestMatch.score - nextMatch.score <= 1) {
    return {
      ...DEFAULT_CASE,
      probableIssue: 'Plusieurs causes possibles à vérifier',
      confidence: 'Faible à moyenne',
      urgency: 'Diagnostic conseillé avant réparation',
      summary: 'Les symptômes décrits pointent vers plusieurs pistes possibles. FlashMat recommande un diagnostic mécanique pour confirmer la vraie cause avant de réserver une réparation ciblée.',
    }
  }

  return bestMatch.candidate
}

const STABLE_CASE_GUARDS = {
  brakes: {
    strongTerms: ['plaquette', 'plaquettes', 'grince', 'grincement', 'couine', 'disque', 'pedale vibre', 'bruit frein', 'bruit metallique', 'brake'],
    rejectTerms: ['toute seule', 'tout seul'],
  },
  battery: {
    strongTerms: ['batterie', 'booster', 'alternateur', 'clic', 'clique', 'demarre pas', 'ne demarre pas', 'pas de courant', 'aucune lumiere', 'aucun voyant'],
  },
  headlight: {
    strongTerms: ['phare', 'phares', 'ampoule', 'eclairage', 'feu', 'fusible'],
  },
  overheat: {
    strongTerms: ['chauffe', 'surchauffe', 'temperature', 'radiateur', 'refroidissement', 'aiguille monte', 'ventilateur', 'thermostat'],
  },
}

function normalizeVehicleDoctorInput(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inputIncludesAny(text, phrases = []) {
  return phrases.some((phrase) => text.includes(phrase))
}

function inputIncludesAll(text, phrases = []) {
  return phrases.every((phrase) => text.includes(phrase))
}

function getVehicleDoctorCase(id) {
  return CASE_LIBRARY.find((candidate) => candidate.id === id) || DEFAULT_CASE
}

function buildConservativeFallback() {
  return {
    ...DEFAULT_CASE,
    probableIssue: 'Diagnostic encore incertain',
    confidence: 'Faible a moyenne',
    urgency: 'A preciser avant de reparer',
    priceNote: 'Mieux vaut confirmer la cause avant de remplacer des pieces',
    durationNote: 'Le garage pourra confirmer la vraie cause avec une inspection ciblee',
    summary: 'Le symptome decrit ne permet pas encore d isoler une panne fiable. FlashMat prefere rester prudent plutot que donner une mauvaise reponse.',
    guidanceTitle: 'Pour une meilleure reponse',
    guidanceItems: [
      'Dites ce que fait la voiture: bruit, odeur, voyant, vibration, fuite ou panne.',
      'Precisez quand le probleme arrive: au demarrage, en roulant, au freinage, a chaud ou a froid.',
      'Indiquez ce qui ne fonctionne plus: phare, clim, batterie, vitre, porte, pneus, moteur ou freins.',
      'Si le comportement semble dangereux, ne roulez pas et faites verifier le vehicule rapidement.',
    ],
  }
}

function detectCaseStable(text) {
  const normalized = normalizeVehicleDoctorInput(text)
  const conservativeFallback = buildConservativeFallback()

  if (!normalized) {
    return conservativeFallback
  }

  const urgentOverrides = [
    {
      anyTerms: [
        'roule toute seule',
        'freine toute seule',
        'accelere toute seule',
        'avance toute seule',
        'la voiture freine toute seule',
        'la voiture roule toute seule',
        'la voiture accelere toute seule',
      ],
      response: {
        ...conservativeFallback,
        probableIssue: 'Probleme de securite critique sur l acceleration ou le freinage',
        confidence: 'Elevee',
        urgency: 'Urgent - ne pas conduire',
        estimate: 'Remorquage et diagnostic de securite recommandes',
        duration: 'A verifier immediatement',
        summary: 'Ce symptome ne correspond pas a une usure normale de plaquettes. C est un cas de securite critique qui doit etre traite immediatement.',
      },
    },
    {
      allTerms: ['demarre pas'],
      anyTerms: ['aucune lumiere', 'aucune lampe', 'aucun voyant', 'rien allume', 'rien s allume', 'pas de courant', 'plus de courant'],
      response: {
        ...conservativeFallback,
        probableIssue: 'Batterie dechargee ou alimentation electrique principale a verifier',
        confidence: 'Elevee',
        urgency: 'A faire verifier rapidement',
        estimate: 'Test batterie, bornes et systeme de demarrage',
        duration: 'Souvent 30 min a 1 h',
        summary: 'Si rien ne s allume au tableau de bord et que la voiture ne demarre pas, il faut d abord penser a la batterie ou a l alimentation electrique.',
      },
    },
    {
      allTerms: ['odeur', 'essence'],
      response: {
        ...conservativeFallback,
        probableIssue: 'Odeur d essence a faire verifier immediatement',
        confidence: 'Elevee',
        urgency: 'Urgent',
        estimate: 'Controle alimentation carburant',
        duration: 'Des que possible',
      },
    },
    {
      allTerms: ['voyant', 'clignote'],
      response: {
        ...conservativeFallback,
        probableIssue: 'Voyant moteur clignotant a faire verifier rapidement',
        confidence: 'Elevee',
        urgency: 'Urgent',
        estimate: 'Diagnostic electronique immediat',
        duration: 'Des que possible',
      },
    },
  ]

  const override = urgentOverrides.find((item) =>
    (!item.allTerms || inputIncludesAll(normalized, item.allTerms))
    && (!item.anyTerms || inputIncludesAny(normalized, item.anyTerms))
  )

  if (override) {
    return override.response
  }

  const asksForOilChangeInfo = inputIncludesAny(normalized, ['quand', 'combien de temps', 'combien de km', 'entretien', 'maintenance'])
    && inputIncludesAny(normalized, ['vidange', 'huile', 'changement huile'])

  if (asksForOilChangeInfo) {
    return getVehicleDoctorCase('oil-change')
  }

  const scoredCases = CASE_LIBRARY
    .map((candidate) => {
      const matchedSymptoms = candidate.symptoms.filter((symptom) => inputIncludesAll(normalized, symptom.terms))
      let score = matchedSymptoms.reduce((total, symptom) => total + symptom.weight, 0)
      const strongMatches = matchedSymptoms.filter((symptom) => symptom.weight >= 5).length
      const guard = STABLE_CASE_GUARDS[candidate.id]

      if (guard?.strongTerms && !inputIncludesAny(normalized, guard.strongTerms)) {
        score -= 5
      }

      if (guard?.rejectTerms && inputIncludesAny(normalized, guard.rejectTerms)) {
        score -= 8
      }

      if (matchedSymptoms.length > 0 && strongMatches === 0) {
        score -= 2
      }

      return {
        candidate,
        score,
        matchedSymptomsCount: matchedSymptoms.length,
        strongMatches,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)

  const [bestMatch, nextMatch] = scoredCases

  if (!bestMatch) {
    return conservativeFallback
  }

  const notSpecificEnough = bestMatch.score < 6 || (bestMatch.matchedSymptomsCount < 2 && bestMatch.strongMatches < 1)

  if (notSpecificEnough) {
    return conservativeFallback
  }

  if (nextMatch && bestMatch.score - nextMatch.score <= 2) {
    return {
      ...conservativeFallback,
      probableIssue: 'Plusieurs causes possibles a verifier',
      confidence: 'Faible a moyenne',
      urgency: 'Diagnostic conseille avant reparation',
      summary: 'Les symptomes decrits pointent vers plusieurs pistes possibles. FlashMat prefere recommander un diagnostic cible plutot que donner une panne trop precise.',
    }
  }

  return bestMatch.candidate
}

export default function VehicleDoctor({ compact = false, userName }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const resultRef = useRef(null)
  const analyzeTimeoutRef = useRef(null)
  const highlightTimeoutRef = useRef(null)
  const [inputMode, setInputMode] = useState('text')
  const [draft, setDraft] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasFreshResult, setHasFreshResult] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Décrivez le symptôme puis lancez le diagnostic.')

  const diagnosis = useMemo(() => (submitted ? detectCaseStable(submitted) : null), [submitted])
  const ctaLabel = user && profile?.role === 'client' ? 'Réserver en 10 sec' : 'Se connecter et réserver'
  const effectiveSearchCat = diagnosis?.searchCat || 'mechanic'
  const resultEyebrowLabel = diagnosis?.type === 'maintenance'
    ? 'Conseil entretien FlashMat'
    : 'Diagnostic automatique FlashMat'

  useEffect(() => {
    return () => {
      window.clearTimeout(analyzeTimeoutRef.current)
      window.clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  function openMatchingSearch(category) {
    const target = `/app/client?pane=search&cat=${encodeURIComponent(category)}`
    if (user && profile?.role === 'client') {
      navigate(target)
      return
    }
    window.sessionStorage.setItem('flashmat-post-login-redirect', target)
    window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
  }

  function analyze(nextDraft) {
    const value = (nextDraft || draft).trim()
    if (!value) {
      setStatusMessage('Décrivez un symptôme pour lancer le diagnostic.')
      return
    }

    window.clearTimeout(analyzeTimeoutRef.current)
    window.clearTimeout(highlightTimeoutRef.current)

    setDraft(value)
    setIsAnalyzing(true)
    setHasFreshResult(false)
    setStatusMessage('Analyse du symptôme en cours...')

    analyzeTimeoutRef.current = window.setTimeout(() => {
      setSubmitted(value)
      setIsAnalyzing(false)
      setHasFreshResult(true)
      setStatusMessage('Diagnostic prêt. Consultez le résultat et les garages suggérés.')
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHasFreshResult(false)
      }, 1800)
    }, 450)
  }

  const wrapperClass = compact ? `${styles.section} ${styles.sectionCompact}` : styles.section
  const shellClass = compact ? `${styles.shell} ${styles.shellCompact}` : styles.shell

  return (
    <section className={wrapperClass}>
      <div className={shellClass}>
        {compact ? (
          <div className={styles.compactHeader}>
            <div>
              <div className={styles.eyebrow}>FlashMat Diagnostic IA</div>
              <h2 className={styles.compactTitle}>Votre Docteur Automobile</h2>
              <p className={styles.compactSub}>
                Décrivez le symptôme, ajoutez bientôt une photo ou un audio, et FlashMat propose un problème probable,
                un prix estimé, une durée et les garages disponibles les plus pertinents.
              </p>
            </div>
            <div className={styles.confidence}>Bonjour {userName || 'client'}</div>
          </div>
        ) : null}

        <div className={styles.grid}>
          <div>
            {!compact ? (
              <>
                <div className={styles.eyebrow}>Docteur Automobile</div>
                <h2 className={styles.title}>
                  Le docteur <span>pour voiture</span>
                </h2>
                <p className={styles.subtitle}>
                  Décrivez votre problème, envoyez bientôt une photo ou une note vocale, puis laissez FlashMat
                  estimer la panne, le prix, le temps de réparation et vous connecter au meilleur mécanicien dispo.
                </p>
              </>
            ) : null}

            <div className={styles.modeRow}>
              {INPUT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`${styles.modeBtn} ${inputMode === mode.id ? styles.modeBtnActive : ''}`}
                  onClick={() => setInputMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className={styles.inputCard}>
              <textarea
                className={styles.textarea}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ex: ma voiture fait un bruit quand je freine, l’auto vibre et une lumière s’allume au tableau de bord."
              />
              <div className={styles.helper}>
                <span>
                  {inputMode === 'text' && 'Décrivez les bruits, vibrations, odeurs ou voyants.'}
                  {inputMode === 'photo' && 'Le mode photo peut déjà lancer le diagnostic après description du symptôme.'}
                  {inputMode === 'audio' && 'Le mode audio est prévu dans le flow: la note vocale alimentera le diagnostic.'}
                </span>
                <strong>Montréal · IA + estimation + matching</strong>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.primaryBtn} ${isAnalyzing ? styles.primaryBtnDisabled : ''}`}
                onClick={() => analyze()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyse en cours...' : 'Lancer le diagnostic'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => openMatchingSearch(effectiveSearchCat)}
              >
                Voir les garages disponibles
              </button>
            </div>

            <div className={styles.chipRow}>
              {QUICK_CASES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.chip}
                  onClick={() => {
                    setDraft(item)
                    analyze(item)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Diagnostic auto</div>
                <div className={styles.statValue}>1 min</div>
                <div className={styles.statSub}>Résultat clair avant de réserver</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Prix en temps réel</div>
                <div className={styles.statValue}>{diagnosis?.estimate || '—'}</div>
                <div className={styles.statSub}>
                  {diagnosis?.type === 'maintenance'
                    ? 'Repère simple pour savoir quand planifier le service'
                    : diagnosis
                      ? 'Fourchette basée sur le problème probable'
                      : 'Lancez le diagnostic pour une estimation'}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Réservation rapide</div>
                <div className={styles.statValue}>{diagnosis ? '3 garages' : '—'}</div>
                <div className={styles.statSub}>
                  {diagnosis ? 'Proches, disponibles, déjà filtrés' : 'Des suggestions apparaîtront après analyse'}
                </div>
              </div>
            </div>
          </div>

          <div
            ref={resultRef}
            className={`${styles.result} ${hasFreshResult ? styles.resultHighlight : ''}`}
            tabIndex={-1}
          >
            <div className={styles.resultTop}>
              <div>
                <div className={styles.resultEyebrow}>{resultEyebrowLabel}</div>
                <h3 className={styles.resultTitle}>
                  {diagnosis ? diagnosis.probableIssue : 'Prêt à analyser votre véhicule'}
                </h3>
              </div>
              <div className={styles.confidence}>
                {diagnosis ? `Confiance ${diagnosis.confidence}` : 'Aucun diagnostic'}
              </div>
            </div>

            <div className={styles.statusRow}>
              <span className={`${styles.statusPill} ${isAnalyzing ? styles.statusPillBusy : styles.statusPillReady}`}>
                {isAnalyzing ? 'Analyse...' : 'Diagnostic prêt'}
              </span>
              <span className={styles.statusText}>{statusMessage}</span>
            </div>

            <p className={styles.summary}>
              {diagnosis
                ? diagnosis.summary
                : 'Décrivez un bruit, une vibration, un voyant ou un comportement étrange, puis cliquez sur le bouton pour obtenir une estimation.'}
            </p>

            {diagnosis ? (
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${diagnosis.urgency.toLowerCase().includes('urgent') || diagnosis.urgency.toLowerCase().includes('rapidement') ? styles.badgeWarn : styles.badgeSafe}`}>
                  {diagnosis.urgency}
                </span>
                <span className={`${styles.badge} ${styles.badgeInfo}`}>Matching à Montréal</span>
              </div>
            ) : null}

            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>{diagnosis?.type === 'maintenance' ? 'Quand le faire' : 'Prix estimé'}</div>
                <div className={styles.metricValue}>{diagnosis?.estimate || '—'}</div>
                <div className={styles.metricSub}>
                  {diagnosis?.priceNote || 'L’estimation apparaîtra après l’analyse'}
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>{diagnosis?.type === 'maintenance' ? 'Repère dans le temps' : 'Temps de réparation'}</div>
                <div className={styles.metricValue}>{diagnosis?.duration || '—'}</div>
                <div className={styles.metricSub}>
                  {diagnosis?.durationNote || 'La durée estimée apparaîtra après l’analyse'}
                </div>
              </div>
            </div>

            {diagnosis?.guidanceItems?.length ? (
              <div className={styles.guidanceCard}>
                <div className={styles.guidanceTitle}>{diagnosis.guidanceTitle || 'À retenir'}</div>
                <div className={styles.guidanceList}>
                  {diagnosis.guidanceItems.map((item) => (
                    <div key={item} className={styles.guidanceItem}>{item}</div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={styles.matchSection}>
              <div className={styles.matchHeader}>
                <h4 className={styles.matchTitle}>3 garages suggérés aujourd’hui</h4>
                <span className={styles.matchHint}>Proches + compatibles + dispo</span>
              </div>

              <div className={styles.matchList}>
                {diagnosis ? diagnosis.matches.map((match) => (
                  <div key={match.name} className={styles.matchCard}>
                    <div className={styles.matchTop}>
                      <div>
                        <div className={styles.matchName}>{match.name}</div>
                        <div className={styles.matchMeta}>
                          ⭐ {match.rating} · {match.distance} · {match.eta}
                        </div>
                      </div>
                      <div className={styles.matchPrice}>{match.price}</div>
                    </div>
                    <div className={styles.matchFoot}>
                      <div className={styles.matchTags}>
                        {match.tags.map((tag) => (
                          <span key={tag} className={styles.miniTag}>{tag}</span>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={styles.reserveBtn}
                        onClick={() => openMatchingSearch(effectiveSearchCat)}
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className={styles.emptyState}>
                    Lancez un diagnostic pour voir les garages les plus pertinents.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.ctaRow}>
              <button
                type="button"
                className={styles.ctaPrimary}
                onClick={() => openMatchingSearch(effectiveSearchCat)}
              >
                {ctaLabel}
              </button>
              <button
                type="button"
                className={styles.ctaGhost}
                onClick={() => navigate('/services')}
              >
                Explorer tous les services
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
