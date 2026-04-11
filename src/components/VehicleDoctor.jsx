import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './VehicleDoctor.module.css'

const INPUT_MODES = [
  { id: 'text', label: 'Free text' },
  { id: 'photo', label: 'Problem photo' },
  { id: 'audio', label: 'Voice note' },
]

const QUICK_CASES = [
  'My car squeaks when I brake',
  'The engine gets hot in traffic',
  'The battery feels weak in the morning',
  'One of my tires keeps losing air',
]

function repairText(value) {
  if (typeof value !== 'string') return value

  let next = value

  for (let index = 0; index < 2; index += 1) {
    if (!/[ÃÂâï]/.test(next)) break
    try {
      next = decodeURIComponent(escape(next))
    } catch {
      break
    }
  }

  return next
    .replace(/ï¿½/g, 'é')
    .replace(/â€¦/g, '...')
    .replace(/Â/g, '')
}

function repairPayload(value) {
  if (Array.isArray(value)) {
    return value.map(repairPayload)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, current]) => [key, repairPayload(current)]))
  }

  return repairText(value)
}

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
    probableIssue: 'Conseil de vidange et dâ€™entretien courant',
    confidence: 'Ã‰levÃ©e',
    urgency: 'Ã€ planifier selon le kilomÃ©trage',
    estimate: 'En gÃ©nÃ©ral tous les 8 000 Ã  10 000 km',
    duration: 'Environ tous les 6 Ã  12 mois',
    priceNote: 'Si vous faites surtout de la ville, du froid, de petits trajets ou beaucoup de trafic, faites-la plus tÃ´t, souvent vers 5 000 Ã  8 000 km.',
    durationNote: 'Pour un RAV4 2021, vÃ©rifiez aussi le dernier entretien fait et lâ€™indicateur de maintenance au tableau de bord.',
    searchCat: 'mechanic',
    summary: 'Pour une personne qui veut juste savoir quoi faire: une vidange sert Ã  garder le moteur bien lubrifiÃ©. Si vous ne connaissez pas lâ€™historique exact, le plus prudent est de vÃ©rifier la derniÃ¨re vidange et de viser un entretien rÃ©gulier plutÃ´t que dâ€™attendre un problÃ¨me.',
    guidanceTitle: 'Ce que vous devez savoir',
    guidanceItems: [
      'Si la derniÃ¨re vidange date de plus de 6 Ã  12 mois, il est raisonnable de la planifier.',
      'Si lâ€™auto a roulÃ© environ 8 000 Ã  10 000 km depuis la derniÃ¨re vidange, il est souvent temps de la faire.',
      'Si vous faites surtout de courts trajets, du trafic ou lâ€™hiver, faites-la plus tÃ´t.',
      'Quand vous prenez rendez-vous, vous pouvez simplement demander: vidange dâ€™huile + vÃ©rification de base.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 14h30', price: 'Vidange dÃ¨s $89', tags: ['Vidange', 'Inspection rapide', 'Disponible'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 16h00', price: 'Vidange dÃ¨s $95', tags: ['Entretien', 'Avis Ã©levÃ©s', 'RÃ©servation express'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h30', price: 'Vidange dÃ¨s $85', tags: ['Entretien', 'ContrÃ´le de base', 'Fiable'] },
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
    probableIssue: 'Porte arriÃ¨re possiblement bloquÃ©e aprÃ¨s impact',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ faire vÃ©rifier rapidement',
    estimate: 'ContrÃ´le carrosserie et mÃ©canisme de porte',
    duration: 'Diagnostic souvent le jour mÃªme',
    priceNote: 'AprÃ¨s un accident, il faut vÃ©rifier la porte, la serrure, les charniÃ¨res et lâ€™alignement de la carrosserie avant de forcer lâ€™ouverture.',
    durationNote: 'Si la porte est coincÃ©e aprÃ¨s impact, un atelier de carrosserie ou un garage peut confirmer si câ€™est la tÃ´le, la serrure ou le cadre qui bloque.',
    searchCat: 'body',
    summary: 'AprÃ¨s un accident, ne forcez pas la porte si elle ne sâ€™ouvre plus. Le bon rÃ©flexe est de faire vÃ©rifier la carrosserie et le mÃ©canisme dâ€™ouverture pour Ã©viter dâ€™aggraver les dÃ©gÃ¢ts ou de casser la poignÃ©e.',
    guidanceTitle: 'Quoi faire maintenant',
    guidanceItems: [
      'Nâ€™essayez pas de forcer la porte avec violence, surtout si elle frotte ou semble dÃ©calÃ©e.',
      'VÃ©rifiez si le problÃ¨me vient de la poignÃ©e, de la serrure ou dâ€™un dÃ©calage visible de la porte aprÃ¨s le choc.',
      'Si la porte ferme mal ou si la carrosserie est enfoncÃ©e, cherchez plutÃ´t un atelier de carrosserie.',
      'Quand vous appelez, dites simplement: accident, porte arriÃ¨re bloquÃ©e, jâ€™ai besoin dâ€™un contrÃ´le carrosserie et mÃ©canisme de porte.',
    ],
    matches: [
      { name: 'Atelier Carrosserie MTL', rating: '4.8', distance: '2.6 km', eta: 'Aujourdâ€™hui 15h40', price: 'Diagnostic carrosserie', tags: ['Carrosserie', 'Portes', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 17h00', price: 'Inspection rapide', tags: ['Diagnostic', 'AprÃ¨s accident', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h15', price: 'ContrÃ´le de porte', tags: ['MÃ©canique', 'Serrure', 'Proche'] },
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
    probableIssue: 'ProblÃ¨me de phare avant ou dâ€™Ã©clairage',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ faire vÃ©rifier rapidement',
    estimate: 'Souvent ampoule, fusible ou connecteur',
    duration: 'ContrÃ´le rapide en atelier',
    priceNote: 'Le problÃ¨me peut venir dâ€™une ampoule grillÃ©e, dâ€™un fusible, dâ€™un faux contact ou du bloc optique.',
    durationNote: 'Si un seul phare avant ne marche plus, la vÃ©rification est souvent simple et rapide.',
    searchCat: 'mechanic',
    summary: 'Si le phare avant ne fonctionne plus, Ã©vitez de rouler la nuit sans rÃ©paration. Le plus souvent, il faut vÃ©rifier lâ€™ampoule, le fusible ou le cÃ¢blage avant de remplacer des piÃ¨ces plus coÃ»teuses.',
    guidanceTitle: 'Quoi vÃ©rifier',
    guidanceItems: [
      'Regardez si un seul phare est touchÃ© ou les deux.',
      'Si un seul cÃ´tÃ© est Ã©teint, une ampoule grillÃ©e est une cause frÃ©quente.',
      'Si le phare sâ€™allume parfois puis sâ€™Ã©teint, il peut sâ€™agir dâ€™un faux contact.',
      'Quand vous appelez, dites: phare avant ne fonctionne pas, jâ€™ai besoin dâ€™un contrÃ´le ampoule, fusible et connexion.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 14h10', price: 'ContrÃ´le Ã©clairage', tags: ['Ã‰lectrique', 'Phare', 'Disponible'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 15h20', price: 'Diagnostic rapide', tags: ['Ã‰lectrique', 'Avis Ã©levÃ©s', 'Fiable'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h00', price: 'VÃ©rification phare', tags: ['Ã‰clairage', 'Inspection', 'Proche'] },
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
    probableIssue: 'Plaquettes de frein usÃ©es',
    confidence: 'Ã‰levÃ©e',
    urgency: 'Ã€ traiter rapidement',
    estimate: '$180 - $320',
    duration: '45 min - 1 h 30',
    priceNote: 'Inclut inspection et remplacement avant',
    durationNote: 'Selon lâ€™Ã©tat des disques',
    searchCat: 'mechanic',
    summary: 'Le symptÃ´me ressemble Ã  une usure avancÃ©e des plaquettes avant. Le systÃ¨me recommande une inspection le jour mÃªme pour Ã©viter dâ€™abÃ®mer les disques.',
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 13h20', price: '$210 estimÃ©', tags: ['Freins', 'Inspection incluse', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 15h10', price: '$195 estimÃ©', tags: ['Freins', 'PiÃ¨ces en stock', 'TrÃ¨s rapide'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 16h00', price: '$230 estimÃ©', tags: ['Freins', 'Avis Ã©levÃ©s', 'Paiement sur place'] },
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
    probableIssue: 'Batterie faible ou alternateur Ã  vÃ©rifier',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ planifier aujourdâ€™hui',
    estimate: '$120 - $340',
    duration: '30 min - 1 h',
    priceNote: 'Test batterie + charge + remplacement si nÃ©cessaire',
    durationNote: 'Plus rapide si la batterie est disponible en stock',
    searchCat: 'mechanic',
    summary: 'Le dÃ©marrage difficile au froid ou aprÃ¨s stationnement pointe vers une batterie fatiguÃ©e. Un test de charge et de systÃ¨me de dÃ©marrage est conseillÃ©.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 11h40', price: '$145 estimÃ©', tags: ['Batterie', 'Test rapide', 'Disponible'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 14h00', price: '$160 estimÃ©', tags: ['Ã‰lectrique', 'Diagnostic', 'RÃ©servation express'] },
      { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourdâ€™hui 16h15', price: '$130 estimÃ©', tags: ['Petit budget', 'Disponible', 'Client rÃ©gulier'] },
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
    confidence: 'Ã‰levÃ©e',
    urgency: 'Ã€ faire avant un long trajet',
    estimate: '$35 - $180',
    duration: '20 min - 50 min',
    priceNote: 'RÃ©paration simple ou remplacement selon lâ€™usure',
    durationNote: 'Permutation possible en mÃªme temps',
    searchCat: 'tire',
    summary: 'Une perte dâ€™air rÃ©pÃ©tÃ©e indique souvent une crevaison lente ou une valve abÃ®mÃ©e. Le systÃ¨me recommande un contrÃ´le immÃ©diat pour Ã©viter lâ€™Ã©clatement.',
    matches: [
      { name: 'DubÃ© Pneu et MÃ©can.', rating: '4.3', distance: '2.1 km', eta: 'Aujourdâ€™hui 12h15', price: '$49 estimÃ©', tags: ['Pneus', 'RÃ©paration rapide', 'Stock hiver'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 14h20', price: '$65 estimÃ©', tags: ['Pneus', 'Inspection incluse', 'Disponible'] },
      { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourdâ€™hui 17h00', price: '$55 estimÃ©', tags: ['Petit budget', 'Disponible', 'Sans rendez-vous'] },
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
    probableIssue: 'Surchauffe liÃ©e au liquide de refroidissement',
    confidence: 'Moyenne',
    urgency: 'Urgent si lâ€™aiguille monte vite',
    estimate: '$95 - $420',
    duration: '45 min - 2 h',
    priceNote: 'ContrÃ´le circuit, fuite, thermostat ou ventilateur',
    durationNote: 'DÃ©pend de la piÃ¨ce en cause',
    searchCat: 'mechanic',
    summary: 'Le moteur qui chauffe en circulation lente peut signaler un manque de liquide, un ventilateur dÃ©fectueux ou un thermostat bloquÃ©. Ã‰vite de rouler longtemps avant inspection.',
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 13h45', price: '$120 estimÃ©', tags: ['Refroidissement', 'Diagnostic', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 15h30', price: '$140 estimÃ©', tags: ['Moteur', 'ContrÃ´le complet', 'Aujourdâ€™hui'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h00', price: '$110 estimÃ©', tags: ['Diagnostic', 'TrÃ¨s proche', 'Fiable'] },
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
    probableIssue: 'Voyant moteur Ã  faire diagnostiquer',
    confidence: 'Moyenne',
    urgency: 'Ã€ vÃ©rifier bientÃ´t',
    estimate: 'Lecture de codes et diagnostic Ã©lectronique',
    duration: 'Souvent en moins dâ€™une heure',
    priceNote: 'Le voyant moteur peut venir dâ€™un capteur, dâ€™un problÃ¨me dâ€™allumage, dâ€™Ã©missions ou dâ€™un dÃ©faut plus sÃ©rieux.',
    durationNote: 'Si le voyant clignote ou si lâ€™auto roule trÃ¨s mal, arrÃªtez-vous dÃ¨s que possible.',
    searchCat: 'mechanic',
    summary: 'Le voyant moteur ne dit pas exactement quoi changer, mais il indique quâ€™un diagnostic Ã©lectronique est nÃ©cessaire pour lire le code et Ã©viter de remplacer des piÃ¨ces au hasard.',
    guidanceTitle: 'Bon rÃ©flexe',
    guidanceItems: [
      'Si le voyant est fixe, prenez rendez-vous rapidement pour une lecture de codes.',
      'Sâ€™il clignote, limitez la conduite et faites vÃ©rifier lâ€™auto dÃ¨s que possible.',
      'Notez si lâ€™auto tremble, manque de puissance ou consomme plus que dâ€™habitude.',
      'Demandez simplement: voyant moteur allumÃ©, jâ€™ai besoin dâ€™un scan et dâ€™un diagnostic.',
    ],
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 14h10', price: 'Scan moteur', tags: ['Diagnostic', 'Ã‰lectronique', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 15h45', price: 'Lecture codes', tags: ['Moteur', 'Rapide', 'Proche'] },
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
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ planifier selon le confort',
    estimate: 'ContrÃ´le gaz, compresseur ou fuite',
    duration: 'Diagnostic souvent rapide',
    priceNote: 'Le problÃ¨me peut venir dâ€™un manque de gaz, dâ€™une fuite, du compresseur ou dâ€™un souci Ã©lectrique.',
    durationNote: 'Un atelier peut dâ€™abord contrÃ´ler la pression et confirmer si une recharge suffit ou non.',
    searchCat: 'mechanic',
    summary: 'Si lâ€™air ne devient plus froid, il faut vÃ©rifier le niveau de rÃ©frigÃ©rant et le circuit de climatisation avant de faire une recharge au hasard.',
    guidanceTitle: 'Ce que vous pouvez dire au garage',
    guidanceItems: [
      'Ma clim ne refroidit plus ou souffle chaud.',
      'Je veux vÃ©rifier sâ€™il manque du gaz ou sâ€™il y a une fuite.',
      'Si possible, faites un contrÃ´le pression + compresseur.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 16h10', price: 'ContrÃ´le clim', tags: ['Climatisation', 'Diagnostic', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 10h00', price: 'Recharge / test', tags: ['A/C', 'Inspection', 'Fiable'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 11h15', price: 'Diagnostic clim', tags: ['Compresseur', 'Circuit', 'Avis Ã©levÃ©s'] },
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
    probableIssue: 'Suspension ou train avant Ã  vÃ©rifier',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ vÃ©rifier rapidement',
    estimate: '$120 - $650',
    duration: '1 h Ã  3 h selon la piÃ¨ce',
    priceNote: 'Le bruit peut venir dâ€™un amortisseur, dâ€™une biellette, dâ€™un silentbloc ou dâ€™une piÃ¨ce du train avant.',
    durationNote: 'Le diagnostic sert Ã  trouver la piÃ¨ce prÃ©cise avant remplacement.',
    searchCat: 'mechanic',
    summary: 'Un bruit sur les bosses ou en tournant indique souvent une piÃ¨ce de suspension ou de direction fatiguÃ©e. Il vaut mieux la faire inspecter avant que lâ€™usure ne sâ€™aggrave.',
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 13h50', price: '$145 diagnostic', tags: ['Suspension', 'Train avant', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 16h20', price: '$160 inspection', tags: ['Direction', 'Biellettes', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h40', price: '$130 contrÃ´le', tags: ['Suspension', 'Rapide', 'Proche'] },
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
    probableIssue: 'Vibration au volant Ã  vÃ©rifier',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ planifier rapidement',
    estimate: '$60 - $240',
    duration: '30 min Ã  2 h',
    priceNote: 'La cause frÃ©quente est un pneu mal Ã©quilibrÃ©, un problÃ¨me dâ€™alignement ou une usure de direction/suspension.',
    durationNote: 'Le garage peut commencer par Ã©quilibrage et inspection du train roulant.',
    searchCat: 'mechanic',
    summary: 'Un volant qui vibre indique souvent un souci de pneus, dâ€™Ã©quilibrage ou de train avant. Ce nâ€™est pas Ã  ignorer si la vibration augmente avec la vitesse.',
    matches: [
      { name: 'DubÃ© Pneu et MÃ©can.', rating: '4.3', distance: '2.1 km', eta: 'Aujourdâ€™hui 12h40', price: 'Ã‰quilibrage / alignement', tags: ['Pneus', 'Direction', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 15h00', price: 'ContrÃ´le volant', tags: ['Train avant', 'Inspection', 'Proche'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 10h10', price: 'Diagnostic chÃ¢ssis', tags: ['Suspension', 'Direction', 'Fiable'] },
    ],
  },
  {
    id: 'wheel-bearing',
    type: 'repair',
    symptoms: [
      { terms: ['roulement'], weight: 9 },
      { terms: ['bearing'], weight: 8 },
      { terms: ['roue', 'arriere'], weight: 5 },
      { terms: ['roue', 'avant'], weight: 5 },
      { terms: ['bruit', 'roue'], weight: 6 },
      { terms: ['grincement', 'roue'], weight: 7 },
      { terms: ['grondement'], weight: 6 },
      { terms: ['bourdonnement'], weight: 6 },
      { terms: ['ronronnement'], weight: 5 },
      { terms: ['augmente', 'vitesse'], weight: 6 },
      { terms: ['bruit', 'vitesse'], weight: 5 },
      { terms: ['suspecte', 'roulement'], weight: 8 },
    ],
    probableIssue: 'Roulement de roue possiblement use ou endommage',
    confidence: 'Moyenne a elevee',
    urgency: 'A verifier rapidement',
    estimate: '$140 - $420',
    duration: '1 h a 2 h 30',
    priceNote: 'Le bruit peut venir du roulement lui-meme, mais aussi parfois du pneu, du moyeu ou d une usure associee du train roulant.',
    durationNote: 'Un essai routier et une verification de jeu a la roue permettent souvent de confirmer la piste assez vite.',
    searchCat: 'mechanic',
    summary: 'Un grincement, grondement ou bourdonnement localise a une roue, surtout s il augmente avec la vitesse, fait penser a un roulement de roue fatigue. Il vaut mieux confirmer rapidement avant que le bruit ou le jeu ne s aggrave.',
    guidanceTitle: 'Ce qu il faut preciser au garage',
    guidanceItems: [
      'Indiquez si le bruit vient plutot de la roue avant ou arriere, gauche ou droite si vous le savez.',
      'Dites si le bruit augmente avec la vitesse, en virage ou seulement sur certaines routes.',
      'Mentionnez si vous sentez aussi une vibration, un jeu ou une chaleur inhabituelle pres de la roue.',
      'Demandez un controle du roulement, du moyeu et du pneu pour confirmer la vraie source du bruit.',
    ],
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 14h20', price: 'Diagnostic roulement', tags: ['Train roulant', 'Bruit roue', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 16h00', price: 'Inspection roue / moyeu', tags: ['Roulement', 'Essai routier', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h10', price: 'ContrÃ´le train roulant', tags: ['Roue', 'Diagnostic', 'Proche'] },
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
    probableIssue: 'Transmission ou boÃ®te de vitesses Ã  diagnostiquer',
    confidence: 'Moyenne',
    urgency: 'Ã€ vÃ©rifier rapidement',
    estimate: '$140 - $900+',
    duration: 'Diagnostic nÃ©cessaire avant devis',
    priceNote: 'La cause peut aller dâ€™un niveau dâ€™huile/transmission Ã  un problÃ¨me interne plus important.',
    durationNote: 'Ne pas continuer Ã  rouler longtemps si les vitesses cognent fort ou ne passent plus correctement.',
    searchCat: 'mechanic',
    summary: 'Une transmission qui patine, donne des coups ou passe mal les vitesses doit Ãªtre diagnostiquÃ©e rapidement pour Ã©viter des dommages plus coÃ»teux.',
    matches: [
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 15h50', price: 'Diagnostic transmission', tags: ['BoÃ®te', 'Inspection', 'Fiable'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 09h20', price: 'Lecture et essai', tags: ['Transmission', 'Avis Ã©levÃ©s', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 10h10', price: 'ContrÃ´le vitesses', tags: ['Automatique', 'Rapide', 'Proche'] },
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
    probableIssue: 'FumÃ©e ou problÃ¨me dâ€™Ã©chappement Ã  vÃ©rifier',
    confidence: 'Moyenne',
    urgency: 'Ã€ vÃ©rifier rapidement',
    estimate: 'Diagnostic moteur / Ã©chappement',
    duration: 'Variable selon la cause',
    priceNote: 'La couleur de la fumÃ©e aide: blanche, noire ou bleue ne pointent pas vers les mÃªmes causes.',
    durationNote: 'Si la fumÃ©e est importante ou accompagnÃ©e dâ€™une perte de puissance, Ã©vitez de rouler inutilement.',
    searchCat: 'mechanic',
    summary: 'La fumÃ©e Ã  lâ€™Ã©chappement peut indiquer un problÃ¨me de combustion, dâ€™huile ou de refroidissement. Il faut surtout Ã©viter de continuer Ã  rouler si le symptÃ´me est marquÃ©.',
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 14h50', price: 'Diagnostic moteur', tags: ['FumÃ©e', 'Ã‰chappement', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 17h10', price: 'Inspection complÃ¨te', tags: ['Moteur', 'Combustion', 'Fiable'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h30', price: 'ContrÃ´le Ã©chappement', tags: ['Ã‰chappement', 'Rapide', 'Proche'] },
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
    probableIssue: 'Fuite dâ€™huile moteur Ã  vÃ©rifier',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ vÃ©rifier rapidement',
    estimate: '$120 - $550',
    duration: 'Selon lâ€™origine de la fuite',
    priceNote: 'La fuite peut venir dâ€™un joint, dâ€™un bouchon, du carter ou du filtre.',
    durationNote: 'Il faut dâ€™abord localiser lâ€™origine exacte avant devis final.',
    searchCat: 'mechanic',
    summary: 'Une fuite dâ€™huile ne doit pas Ãªtre ignorÃ©e, surtout si la tache grandit ou si le niveau baisse. Le mieux est de faire localiser la fuite avant quâ€™elle nâ€™abÃ®me le moteur.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 14h20', price: 'Recherche de fuite', tags: ['Huile', 'Diagnostic', 'Disponible'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 16h30', price: 'Inspection moteur', tags: ['Fuite', 'Joint', 'Fiable'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h50', price: 'ContrÃ´le complet', tags: ['Huile', 'RÃ©paration', 'Proche'] },
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
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ vÃ©rifier vite',
    estimate: '$110 - $480',
    duration: 'Variable selon la fuite',
    priceNote: 'La fuite peut venir dâ€™une durite, du radiateur, du bouchon ou dâ€™une autre piÃ¨ce du circuit.',
    durationNote: 'Ã‰vitez de rouler si le niveau descend vite ou si la tempÃ©rature monte.',
    searchCat: 'mechanic',
    summary: 'Une fuite de liquide de refroidissement peut mener Ã  une surchauffe. Il faut contrÃ´ler le circuit avant de continuer Ã  rouler normalement.',
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 13h30', price: 'Test circuit', tags: ['Radiateur', 'Fuite', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 15h30', price: 'Inspection liquide', tags: ['Refroidissement', 'Rapide', 'Proche'] },
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
    probableIssue: 'Vitre Ã©lectrique ou mÃ©canisme de fenÃªtre Ã  vÃ©rifier',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ planifier rapidement',
    estimate: 'Moteur, interrupteur ou rÃ©gulateur',
    duration: 'Souvent rapide Ã  diagnostiquer',
    priceNote: 'Le problÃ¨me peut venir du bouton, du moteur de vitre ou du mÃ©canisme intÃ©rieur.',
    durationNote: 'Si la vitre reste ouverte, il vaut mieux faire rÃ©parer rapidement pour Ã©viter lâ€™eau et le vol.',
    searchCat: 'mechanic',
    summary: 'Une vitre qui ne monte plus ou ne descend plus est souvent liÃ©e au moteur, au bouton ou au rÃ©gulateur. Le diagnostic permet de cibler la piÃ¨ce exacte.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 16h10', price: 'ContrÃ´le vitre', tags: ['Ã‰lectrique', 'FenÃªtre', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h15', price: 'Inspection mÃ©canisme', tags: ['Porte', 'RÃ©gulateur', 'Fiable'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Demain 11h00', price: 'Diagnostic rapide', tags: ['Vitre', 'Switch', 'Avis Ã©levÃ©s'] },
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
    probableIssue: 'Essuie-glace ou systÃ¨me dâ€™essuyage Ã  vÃ©rifier',
    confidence: 'Moyenne Ã  Ã©levÃ©e',
    urgency: 'Ã€ rÃ©gler vite si mauvais temps',
    estimate: 'Souvent balais, fusible ou moteur',
    duration: 'Souvent rapide',
    priceNote: 'Parfois un simple remplacement de balais suffit, parfois il faut contrÃ´ler le moteur ou le fusible.',
    durationNote: 'Câ€™est un point de sÃ©curitÃ©, surtout en pluie ou neige.',
    searchCat: 'mechanic',
    summary: 'Si les essuie-glaces nettoient mal ou ne fonctionnent plus, il faut les faire vÃ©rifier rapidement pour garder une bonne visibilitÃ©.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 14h50', price: 'ContrÃ´le essuie-glace', tags: ['SÃ©curitÃ©', 'Balais', 'Disponible'] },
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 15h40', price: 'Diagnostic rapide', tags: ['Moteur', 'Fusible', 'Fiable'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h40', price: 'Inspection visibilitÃ©', tags: ['Essuie-glace', 'Proche', 'Rapide'] },
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
    probableIssue: 'Odeur dâ€™essence ou fuite possible Ã  faire vÃ©rifier',
    confidence: 'Ã‰levÃ©e',
    urgency: 'Urgent',
    estimate: 'ContrÃ´le alimentation carburant',
    duration: 'DÃ¨s que possible',
    priceNote: 'Une odeur dâ€™essence peut indiquer une fuite ou un problÃ¨me du circuit dâ€™alimentation.',
    durationNote: 'Ã‰vitez de continuer Ã  rouler ou de stationner dans un endroit fermÃ© sans contrÃ´le.',
    searchCat: 'mechanic',
    summary: 'Une odeur dâ€™essence est un symptÃ´me Ã  prendre au sÃ©rieux. Le plus prudent est de limiter lâ€™usage du vÃ©hicule et de faire vÃ©rifier rapidement le circuit de carburant.',
    matches: [
      { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 13h10', price: 'ContrÃ´le carburant', tags: ['Urgent', 'SÃ©curitÃ©', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 14h00', price: 'Inspection fuite', tags: ['Essence', 'Rapide', 'Proche'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourdâ€™hui 16h10', price: 'Diagnostic complet', tags: ['Carburant', 'Fiable', 'Inspection'] },
    ],
  },
]

const DEFAULT_CASE = {
  type: 'repair',
  probableIssue: 'Inspection mÃ©canique gÃ©nÃ©rale recommandÃ©e',
  confidence: 'Moyenne',
  urgency: 'Ã€ planifier selon le symptÃ´me',
  estimate: '$85 - $220',
  duration: '30 min - 1 h',
  priceNote: 'Diagnostic initial avant devis prÃ©cis',
  durationNote: 'Le devis final dÃ©pendra du vÃ©hicule',
  searchCat: 'mechanic',
  summary: 'Le symptÃ´me dÃ©crit nâ€™est pas assez prÃ©cis pour isoler une panne unique. FlashMat recommande un diagnostic rapide avec un garage disponible aujourdâ€™hui.',
  matches: [
    { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourdâ€™hui 13h50', price: '$95 estimÃ©', tags: ['Diagnostic', 'TrÃ¨s proche', 'Disponible'] },
    { name: 'Garage MÃ©canique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourdâ€™hui 15h00', price: '$110 estimÃ©', tags: ['Diagnostic', 'Avis Ã©levÃ©s', 'RÃ©servation express'] },
    { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourdâ€™hui 16h40', price: '$89 estimÃ©', tags: ['Petit budget', 'Disponible', 'MontrÃ©al'] },
  ],
}

const OBD_CODE_PATTERNS = [
  {
    codes: ['p0300', 'p0301', 'p0302', 'p0303', 'p0304'],
    probableIssue: 'RatÃ©s d allumage moteur a diagnostiquer',
    confidence: 'Elevee',
    urgency: 'A verifier rapidement',
    estimate: 'Diagnostic allumage, bobines, bougies ou injection',
    duration: '30 min a 1 h 30',
    priceNote: 'Les codes de rate peuvent venir des bougies, bobines, injecteurs, d une prise d air ou d un probleme de compression.',
    durationNote: 'Evitez de rouler longtemps si le moteur tremble, manque de puissance ou si le voyant clignote.',
    summary: 'Le code releve pointe vers un probleme de combustion sur un ou plusieurs cylindres. Le bon reflexe est de faire confirmer la vraie cause avant de remplacer des pieces au hasard.',
    guidanceTitle: 'Diagnostic avance conseille',
    guidanceItems: [
      'Notez si le moteur tremble au ralenti, manque de puissance ou consomme plus que d habitude.',
      'Demandez un controle des bobines, bougies, injecteurs et de la compression si le symptome persiste.',
      'Si vous connaissez le cylindre concerne, mentionnez le code exact au garage.',
      'Si le voyant moteur clignote, limitez la conduite jusqu au diagnostic.',
    ],
  },
  {
    codes: ['p0420', 'p0430'],
    probableIssue: 'Rendement catalyseur ou gestion moteur a verifier',
    confidence: 'Moyenne a elevee',
    urgency: 'A verifier bientot',
    estimate: 'Diagnostic emissions, sonde O2 et catalyseur',
    duration: '45 min a 1 h 30',
    priceNote: 'Le code peut etre lie au catalyseur, a une sonde lambda, a une fuite d echappement ou a un melange air-carburant incorrect.',
    durationNote: 'Il faut confirmer la cause avant de changer un catalyseur, souvent couteux.',
    summary: 'Ce code ne veut pas dire automatiquement que le catalyseur est mort. Il faut verifier les sondes, les fuites et le fonctionnement moteur avant de conclure.',
    guidanceTitle: 'Avant de remplacer une grosse piece',
    guidanceItems: [
      'Demandez un diagnostic complet des emissions avant tout remplacement du catalyseur.',
      'Mentionnez si vous avez une odeur inhabituelle, une perte de puissance ou une surconsommation.',
      'Une fuite d echappement ou une sonde O2 fatiguee peuvent provoquer ce code.',
    ],
  },
  {
    codes: ['p0171', 'p0174'],
    probableIssue: 'Melange trop pauvre a diagnostiquer',
    confidence: 'Moyenne a elevee',
    urgency: 'A verifier bientot',
    estimate: 'Recherche de prise d air, debitmetre ou alimentation carburant',
    duration: '45 min a 1 h 30',
    priceNote: 'Les causes frequentes sont une fuite de vide, un capteur MAF sale, une pression d essence faible ou un souci de mesure d air.',
    durationNote: 'Le diagnostic doit confirmer si le probleme vient de l admission d air ou du carburant.',
    summary: 'Le moteur semble compenser un melange trop pauvre. Ce type de panne demande un diagnostic cible, pas juste un effacement du code.',
    guidanceTitle: 'Bon niveau de detail a donner',
    guidanceItems: [
      'Precisez si le ralenti est instable, si l acceleration hesite ou si la consommation a change.',
      'Demandez un controle du systeme d admission, du capteur MAF et de la pression de carburant.',
      'Si le code revient apres effacement, il faut chercher la cause racine plutot que le reinitialiser encore.',
    ],
  },
]

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

function extractObdCodes(text) {
  return Array.from(new Set((text.match(/\b[pcbu]\d{4}\b/g) || [])))
}

function buildObdDiagnosis(code) {
  const pattern = OBD_CODE_PATTERNS.find((item) => item.codes.includes(code))
  if (!pattern) return null

  return {
    ...DEFAULT_CASE,
    ...pattern,
    probableIssue: `${pattern.probableIssue} (${code.toUpperCase()})`,
  }
}

function buildAdvancedDiagnosis(matches, normalized) {
  const topMatches = matches.slice(0, 3)
  if (!topMatches.length) return buildConservativeFallback()

  const topIds = topMatches.map((entry) => entry.candidate.id)
  const hasNoStart = topIds.includes('battery') || inputIncludesAny(normalized, ['demarre pas', 'ne demarre pas'])
  const hasTireIssue = topIds.includes('tires') || inputIncludesAny(normalized, ['pneu', 'pneus', 'creve', 'crevee', 'crevaison', 'a plat'])
  const hasEngineConcern = inputIncludesAny(normalized, ['bruit moteur', 'bruit au moteur', 'moteur', 'claque', 'cogne', 'grondement', 'bruit'])

  if (hasNoStart && hasTireIssue && hasEngineConcern) {
    return {
      ...DEFAULT_CASE,
      type: 'repair',
      probableIssue: 'Plusieurs problemes critiques a traiter avant de reprendre la route',
      confidence: 'Elevee',
      urgency: 'Urgent - ne pas conduire',
      estimate: 'Remorquage ou diagnostic prioritaire recommande',
      duration: 'Evaluation immediate puis devis selon les problemes confirmes',
      priceNote: 'Quand la voiture ne demarre pas, qu un pneu est creve et qu un bruit moteur est present, il faut verifier plusieurs systemes avant toute tentative de reprise de route.',
      durationNote: 'Le garage ou le service mobile doit d abord securiser le vehicule, confirmer la cause du non-demarrage et verifier si le bruit moteur signale un dommage mecanique plus grave.',
      searchCat: 'tow',
      summary: 'Le symptome decrit combine un probleme de demarrage, un pneu creve et un bruit au moteur. FlashMat considere cela comme un cas prioritaire a traiter globalement, pas comme une seule panne isolee.',
      guidanceTitle: 'Ce qu il faut faire maintenant',
      guidanceItems: [
        'Ne tentez pas de reprendre la route tant que le pneu et le bruit moteur ne sont pas verifies.',
        'Expliquez clairement: la voiture ne demarre pas, un pneu est creve et un bruit moteur est present.',
        'Demandez un controle prioritaire du demarrage, du pneu et du moteur avant toute reparation ciblee.',
        'Si le vehicule est immobilise dans un endroit non securitaire, demandez un remorquage ou une intervention mobile.',
      ],
      matches: [
        { name: 'Remorquage Elite 24/7', rating: '4.6', distance: 'Mobile', eta: '15-25 min', price: 'Prise en charge prioritaire', tags: ['Urgent', 'Remorquage', 'Disponible'] },
        { name: 'Garage Mecanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd hui 13h10', price: 'Diagnostic multi-systemes', tags: ['Demarrage', 'Moteur', 'Prioritaire'] },
        { name: 'Dube Pneu et Mecan.', rating: '4.3', distance: '2.1 km', eta: 'Aujourd hui 14h00', price: 'Controle pneu + mecanique', tags: ['Pneus', 'Mecanique', 'Disponible'] },
      ],
    }
  }

  const names = topMatches.map((entry) => entry.candidate.probableIssue.toLowerCase())
  const first = topMatches[0].candidate
  const confidence = topMatches[0].score >= 10 ? 'Moyenne a elevee' : 'Moyenne'
  const urgency = topMatches.some((entry) => entry.candidate.urgency?.toLowerCase().includes('urgent'))
    ? 'A verifier rapidement'
    : 'Diagnostic avance conseille'

  const detailHints = []
  if (!inputIncludesAny(normalized, ['voyant', 'code', 'p0', 'b0', 'c0', 'u0'])) detailHints.push('Ajoutez si un voyant est allume ou si vous avez un code OBD.')
  if (!inputIncludesAny(normalized, ['a froid', 'a chaud', 'demarrage', 'ralenti', 'autoroute', 'freinage'])) detailHints.push('Precisez quand le probleme arrive: a froid, a chaud, au ralenti, en roulant ou au freinage.')
  if (!inputIncludesAny(normalized, ['bruit', 'odeur', 'fumee', 'vibration', 'fuite'])) detailHints.push('Indiquez le signe principal: bruit, odeur, fumee, vibration ou fuite.')

  return {
    ...DEFAULT_CASE,
    type: 'repair',
    probableIssue: 'Diagnostic avance: plusieurs pistes mecaniques a confirmer',
    confidence,
    urgency,
    estimate: 'Diagnostic cible avant remplacement de pieces',
    duration: '45 min a 1 h 30',
    priceNote: 'Les indices fournis pointent vers plusieurs sous-systemes possibles. Un bon diagnostic permet de confirmer la vraie cause avant de commander des pieces.',
    durationNote: 'Avec un symptome detaille ou un code OBD, le garage peut souvent reduire tres vite les hypotheses.',
    summary: `Les symptomes decrits sont assez avances pour orienter plusieurs pistes probables: ${names.join(', ')}. FlashMat prefere vous donner ces hypotheses de travail plutot qu une seule panne trop precise sans verification.`,
    guidanceTitle: 'Comment obtenir une reponse plus pointue',
    guidanceItems: [
      `La piste la plus probable pour l instant: ${first.probableIssue}.`,
      ...topMatches.slice(1).map((entry) => `Autre piste plausible a verifier: ${entry.candidate.probableIssue}.`),
      ...detailHints,
    ].slice(0, 5),
    searchCat: first.searchCat || 'mechanic',
    matches: first.matches || DEFAULT_CASE.matches,
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
      anyTerms: ['accident', 'collision', 'choc', 'accroche'],
      minAnyTerms: 1,
      extraAnyTerms: [
        'voyant',
        'voyants',
        'tout les voyants',
        'tous les voyants',
        'phare',
        'phares',
        'feu',
        'frein',
        'freine pas',
        'ne freine pas',
        'freins',
      ],
      minExtraMatches: 1,
      response: {
        ...conservativeFallback,
        probableIssue: 'Degats critiques apres accident touchant plusieurs systemes du vehicule',
        confidence: 'Elevee',
        urgency: 'Urgent - ne pas conduire',
        estimate: 'Remorquage et diagnostic securite / electrique / freinage recommandes',
        duration: 'Evaluation immediate puis devis selon les dommages',
        priceNote: 'Apres un accident avec voyants allumes, eclairage en panne et freinage anormal, il faut verifier la securite generale avant toute reprise de route.',
        durationNote: 'Le premier objectif est de confirmer si le vehicule peut etre deplace en securite ou doit etre remorque.',
        searchCat: 'tow',
        summary: 'Avec un accident, plusieurs voyants allumes, un phare qui ne fonctionne plus et un freinage qui ne repond pas normalement, FlashMat considere cela comme un cas critique. Il ne faut pas continuer a rouler sans controle prioritaire.',
        guidanceTitle: 'Quoi faire tout de suite',
        guidanceItems: [
          'Ne conduisez pas le vehicule tant que le freinage et les circuits de securite ne sont pas verifies.',
          'Si vous etes encore sur la route, arretez vous dans un endroit securitaire et demandez un remorquage.',
          'Expliquez: accident, plusieurs voyants allumes, phare ne marche plus, freinage anormal.',
          'Demandez un controle prioritaire du freinage, de l alimentation electrique et des dommages apres impact.',
        ],
        matches: [
          { name: 'Remorquage Elite 24/7', rating: '4.6', distance: 'Mobile', eta: '15-25 min', price: 'Remorquage prioritaire', tags: ['Urgent', 'Remorquage', 'Disponible'] },
          { name: 'Garage Mecanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd hui 13h10', price: 'Diagnostic securite complet', tags: ['Freinage', 'Electrique', 'Prioritaire'] },
          { name: 'Atelier Carrosserie MTL', rating: '4.8', distance: '2.6 km', eta: 'Aujourd hui 15h40', price: 'Controle apres impact', tags: ['Carrosserie', 'Structure', 'Inspection'] },
        ],
      },
    },
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
    && (!item.anyTerms || item.anyTerms.filter((term) => normalized.includes(term)).length >= (item.minAnyTerms || 1))
    && (!item.extraAnyTerms || item.extraAnyTerms.filter((term) => normalized.includes(term)).length >= (item.minExtraMatches || 1))
  )

  if (override) {
    return override.response
  }

  const asksForOilChangeInfo = inputIncludesAny(normalized, ['quand', 'combien de temps', 'combien de km', 'entretien', 'maintenance'])
    && inputIncludesAny(normalized, ['vidange', 'huile', 'changement huile'])

  if (asksForOilChangeInfo) {
    return getVehicleDoctorCase('oil-change')
  }

  const detectedCode = extractObdCodes(normalized)[0]
  if (detectedCode) {
    const codeDiagnosis = buildObdDiagnosis(detectedCode)
    if (codeDiagnosis) return codeDiagnosis
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
    return buildAdvancedDiagnosis(scoredCases, normalized)
  }

  return bestMatch.candidate
}

function shouldTryAiDiagnosis(input, localDiagnosis) {
  if (!input || input.trim().length < 18 || !localDiagnosis) {
    return false
  }
  return true
}

function parseAiJsonBlock(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function normalizeAiDiagnosisResponse(response, fallbackDiagnosis) {
  if (!response || typeof response !== 'object') return null

  const probableIssue = String(response.probableIssue || '').trim()
  const summary = String(response.summary || '').trim()

  if (!probableIssue || !summary) {
    return null
  }

  const guidanceItems = Array.isArray(response.guidanceItems)
    ? response.guidanceItems.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
    : fallbackDiagnosis.guidanceItems || []

  return {
    ...fallbackDiagnosis,
    type: response.type === 'maintenance' ? 'maintenance' : 'repair',
    probableIssue,
    confidence: String(response.confidence || fallbackDiagnosis.confidence || 'Medium').trim(),
    urgency: String(response.urgency || fallbackDiagnosis.urgency || 'To verify').trim(),
    estimate: String(response.estimate || fallbackDiagnosis.estimate || 'Targeted diagnosis').trim(),
    duration: String(response.duration || fallbackDiagnosis.duration || 'To confirm').trim(),
    priceNote: String(response.priceNote || fallbackDiagnosis.priceNote || '').trim(),
    durationNote: String(response.durationNote || fallbackDiagnosis.durationNote || '').trim(),
    summary,
    guidanceTitle: String(response.guidanceTitle || fallbackDiagnosis.guidanceTitle || 'Key takeaways').trim(),
    guidanceItems,
    searchCat: ['mechanic', 'tire', 'body', 'glass', 'tow', 'wash'].includes(response.searchCat)
      ? response.searchCat
      : (fallbackDiagnosis.searchCat || 'mechanic'),
    matches: fallbackDiagnosis.matches || DEFAULT_CASE.matches,
  }
}

async function fetchAnthropicDiagnosis(input, fallbackDiagnosis) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8000)

  let response
  try {
    response = await fetch('/api/vehicle-doctor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        fallbackDiagnosis,
      }),
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error('The diagnostic service did not respond correctly')
  }

  const data = await response.json()
  return data?.diagnosis || null
}

function repairMojibake(value) {
  if (typeof value !== 'string') return value
  let repaired = value
  try {
    const secondPass = decodeURIComponent(escape(repaired))
    if (secondPass && secondPass !== repaired) repaired = secondPass
  } catch {}
  return repaired
    .replace(/ï¿½/g, '')
    .replaceAll('??', '?')
    .replaceAll('???', '?')
    .replaceAll('???', '...')
    .replaceAll('???', '?')
    .replaceAll('???', "'")
    .replaceAll('???', '"')
    .replaceAll('???', '"')
    .replaceAll('???', '-')
    .replaceAll('???', '-')
}

function translateDiagnosisText(value) {
  let text = repairMojibake(String(value || ''))
  const phraseMap = [
    ['Conseil de vidange et d entretien courant', 'Oil change and routine maintenance guidance'],
    ['Porte arriere possiblement bloquee apres impact', 'Rear door may be jammed after the impact'],
    ['Probleme de phare avant ou d eclairage', 'Front headlight or lighting problem'],
    ['Plaquettes de frein usees', 'Worn brake pads'],
    ['Batterie faible ou alternateur a verifier', 'Weak battery or alternator to inspect'],
    ['Fuite lente ou crevaison sur un pneu', 'Slow leak or puncture in one tire'],
    ['Surchauffe liee au liquide de refroidissement', 'Overheating linked to the cooling system'],
    ['Diagnostic encore incertain', 'Diagnosis still uncertain'],
    ['?lev?e', 'High'],
    ['Elev?e', 'High'],
    ['Moyenne ? ?lev?e', 'Medium to high'],
    ['Moyenne a ?lev?e', 'Medium to high'],
    ['Moyenne', 'Medium'],
    ['Faible ? moyenne', 'Low to medium'],
    ['A traiter rapidement', 'Handle soon'],
    ['? traiter rapidement', 'Handle soon'],
    ['? faire v?rifier rapidement', 'Check soon'],
    ['? faire avant un long trajet', 'Handle before a long trip'],
    ['Urgent si l aiguille monte vite', 'Urgent if the gauge rises quickly'],
    ['? planifier selon le kilom?trage', 'Plan based on mileage'],
    ['? planifier aujourd?hui', 'Plan for today'],
    ['Quoi faire maintenant', 'What to do now'],
    ['Quoi v?rifier', 'What to check'],
    ['Ce que vous devez savoir', 'What you should know'],
    ['Points cl?s', 'Key takeaways'],
    ['Aujourd?hui', 'Today'],
    ['Demain', 'Tomorrow'],
    ['Disponible', 'Available'],
    ['Inspection rapide', 'Quick inspection'],
    ['Avis ?lev?s', 'Highly rated'],
    ['R?servation express', 'Express booking'],
    ['Entretien', 'Maintenance'],
    ['Fiable', 'Reliable'],
    ['Proche', 'Nearby'],
    ['Petit budget', 'Budget-friendly'],
    ['Sans rendez-vous', 'Walk-in'],
    ['Pneus', 'Tires'],
    ['Freins', 'Brakes'],
    ['Carrosserie', 'Bodywork'],
    ['?clairage', 'Lighting'],
    ['?lectrique', 'Electrical']
  ]
  for (const [from, to] of phraseMap) text = text.split(from).join(to)
  return text
}

function translateDiagnosisDisplay(rawDiagnosis) {
  if (!rawDiagnosis) return null
  return {
    ...rawDiagnosis,
    probableIssue: translateDiagnosisText(rawDiagnosis.probableIssue),
    confidence: translateDiagnosisText(rawDiagnosis.confidence),
    urgency: translateDiagnosisText(rawDiagnosis.urgency),
    estimate: translateDiagnosisText(rawDiagnosis.estimate),
    duration: translateDiagnosisText(rawDiagnosis.duration),
    priceNote: translateDiagnosisText(rawDiagnosis.priceNote),
    durationNote: translateDiagnosisText(rawDiagnosis.durationNote),
    summary: translateDiagnosisText(rawDiagnosis.summary),
    guidanceTitle: translateDiagnosisText(rawDiagnosis.guidanceTitle),
    guidanceItems: (rawDiagnosis.guidanceItems || []).map((item) => translateDiagnosisText(item)),
    matches: (rawDiagnosis.matches || []).map((match) => ({
      ...match,
      name: translateDiagnosisText(match.name),
      eta: translateDiagnosisText(match.eta),
      price: translateDiagnosisText(match.price),
      tags: (match.tags || []).map((tag) => translateDiagnosisText(tag)),
    })),
  }
}

export default function VehicleDoctor({ compact = false, userName }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const resultRef = useRef(null)
  const analyzeTimeoutRef = useRef(null)
  const highlightTimeoutRef = useRef(null)
  const latestAnalysisRef = useRef(0)
  const [inputMode, setInputMode] = useState('text')
  const [draft, setDraft] = useState('')
  const [diagnosis, setDiagnosis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasFreshResult, setHasFreshResult] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Describe the symptom, then run the diagnosis.')
  const ctaLabel = user && profile?.role === 'client' ? 'Book in 10 sec' : 'Sign in to book'
  const effectiveSearchCat = diagnosis?.searchCat || 'mechanic'
  const displayDiagnosis = useMemo(() => translateDiagnosisDisplay(diagnosis), [diagnosis])
  const resultEyebrowLabel = diagnosis?.type === 'maintenance'
    ? 'FlashMat maintenance guidance'
    : 'FlashMat automatic diagnosis'

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
      setStatusMessage('Describe a symptom to start the diagnosis.')
      return
    }

    window.clearTimeout(analyzeTimeoutRef.current)
    window.clearTimeout(highlightTimeoutRef.current)

    setDraft(value)
    setIsAnalyzing(true)
    setHasFreshResult(false)
    setStatusMessage('Analyzing the symptom...')

    const analysisId = Date.now()
    latestAnalysisRef.current = analysisId

    analyzeTimeoutRef.current = window.setTimeout(async () => {
      const localDiagnosis = repairPayload(detectCaseStable(value))
      let finalDiagnosis = localDiagnosis
      let finalStatus = 'Diagnosis ready. Review the result and suggested garages.'

      setDiagnosis(localDiagnosis)

      if (shouldTryAiDiagnosis(value, localDiagnosis)) {
        setStatusMessage('Running an advanced diagnosis...')

        try {
          const aiDiagnosis = await fetchAnthropicDiagnosis(value, localDiagnosis)
          if (latestAnalysisRef.current !== analysisId) return

          if (aiDiagnosis) {
            finalDiagnosis = repairPayload(aiDiagnosis)
          }
          finalStatus = 'Diagnostic prêt. Vérifiez la synthèse et les actions conseillées.'
        } catch {
          if (latestAnalysisRef.current !== analysisId) return
          finalStatus = 'Diagnosis ready. Review the summary and recommended actions.'
        }
      }

      if (latestAnalysisRef.current !== analysisId) return

      setDiagnosis(finalDiagnosis)
      setIsAnalyzing(false)
      setHasFreshResult(true)
      setStatusMessage(finalStatus)
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHasFreshResult(false)
      }, 1800)
    }, 450)
  }

  const wrapperClass = compact ? `${styles.section} ${styles.sectionCompact}` : styles.section
  const shellClass = compact ? `${styles.shell} ${styles.shellCompact}` : styles.shell
  const greetingName = userName || profile?.full_name || 'there'
  const hasConversation = Boolean(draft.trim() || displayDiagnosis || isAnalyzing)

  return (
    <section className={wrapperClass}>
      <div className={shellClass}>
        <div className={styles.chatShell}>
          {!hasConversation ? (
            <div className={styles.chatLanding}>
              <div className={styles.chatLandingTop}>
                <div className={styles.chatBadge}>Hello {greetingName}</div>
              </div>
              <div className={styles.chatLandingBody}>
                <div className={styles.eyebrow}>FlashMat Auto Doctor</div>
                <h2 className={styles.chatLandingTitle}>How can FlashMat help with your vehicle?</h2>
                <p className={styles.chatLandingText}>
                  Ask about a symptom, maintenance timing, warning light, repair estimate, or which FlashMat service you should book next.
                </p>
                <div className={styles.modeRow} style={{ justifyContent: 'center', marginTop: 20 }}>
                  {INPUT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`${styles.modeBtn} ${inputMode === mode.id ? styles.modeBtnActive : ''}`}
                      onClick={() => setInputMode(mode.id)}
                    >
                      {repairText(mode.label)}
                    </button>
                  ))}
                </div>
                <div className={styles.chipRow} style={{ justifyContent: 'center', marginTop: 22 }}>
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
                      {repairText(item)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={resultRef}
              className={`${styles.chatTimeline} ${hasFreshResult ? styles.resultHighlight : ''}`}
              tabIndex={-1}
            >
              <article className={`${styles.chatMessage} ${styles.chatAssistant}`}>
                <div className={styles.chatAvatar}>F</div>
                <div className={styles.chatBubble}>
                  <div className={styles.chatMeta}>FlashMat assistant</div>
                  <p className={styles.chatText}>
                    Tell me what the vehicle is doing and I will answer with the likely issue, what matters most, and where FlashMat would send you next.
                  </p>
                </div>
              </article>

              {draft.trim() ? (
                <article className={`${styles.chatMessage} ${styles.chatUser}`}>
                  <div className={styles.chatBubble}>
                    <div className={styles.chatMeta}>You</div>
                    <p className={styles.chatText}>{draft.trim()}</p>
                  </div>
                </article>
              ) : null}

              <article className={`${styles.chatMessage} ${styles.chatAssistant}`}>
                <div className={styles.chatAvatar}>F</div>
                <div className={styles.chatBubble}>
                  <div className={styles.chatMeta}>{resultEyebrowLabel}</div>
                  <div className={styles.statusRow}>
                    <span className={`${styles.statusPill} ${isAnalyzing ? styles.statusPillBusy : styles.statusPillReady}`}>
                      {isAnalyzing ? 'Thinking...' : displayDiagnosis ? 'Answer ready' : 'Ready'}
                    </span>
                    <span className={styles.statusText}>{statusMessage}</span>
                  </div>

                  {displayDiagnosis ? (
                    <>
                      <h3 className={styles.chatAnswerTitle}>{displayDiagnosis.probableIssue}</h3>
                      <p className={styles.chatText}>{displayDiagnosis.summary}</p>

                      <div className={styles.chatFacts}>
                        <div className={styles.chatFact}>
                          <span className={styles.chatFactLabel}>Confidence</span>
                          <strong>{displayDiagnosis.confidence}</strong>
                        </div>
                        <div className={styles.chatFact}>
                          <span className={styles.chatFactLabel}>Urgency</span>
                          <strong>{displayDiagnosis.urgency}</strong>
                        </div>
                        <div className={styles.chatFact}>
                          <span className={styles.chatFactLabel}>{displayDiagnosis.type === 'maintenance' ? 'When' : 'Estimate'}</span>
                          <strong>{displayDiagnosis.estimate}</strong>
                        </div>
                        <div className={styles.chatFact}>
                          <span className={styles.chatFactLabel}>{displayDiagnosis.type === 'maintenance' ? 'Timeline' : 'Repair time'}</span>
                          <strong>{displayDiagnosis.duration}</strong>
                        </div>
                      </div>

                      {displayDiagnosis.guidanceItems?.length ? (
                        <div className={styles.chatChecklist}>
                          <div className={styles.guidanceTitle}>{displayDiagnosis.guidanceTitle || 'What to do next'}</div>
                          <div className={styles.guidanceList}>
                            {displayDiagnosis.guidanceItems.slice(0, 4).map((item) => (
                              <div key={item} className={styles.guidanceItem}>{item}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className={styles.chatGarageCard}>
                        <div className={styles.matchHeader}>
                          <h4 className={styles.matchTitle}>Best FlashMat matches</h4>
                          <span className={styles.matchHint}>Montreal • nearby • relevant</span>
                        </div>
                        <div className={styles.matchList}>
                          {displayDiagnosis.matches.slice(0, 3).map((match) => (
                            <div key={match.name} className={styles.matchCard}>
                              <div className={styles.matchTop}>
                                <div>
                                  <div className={styles.matchName}>{match.name}</div>
                                  <div className={styles.matchMeta}>★ {match.rating} · {match.distance} · {match.eta}</div>
                                </div>
                                <div className={styles.matchPrice}>{match.price}</div>
                              </div>
                              <div className={styles.matchTags}>
                                {match.tags.map((tag) => (
                                  <span key={tag} className={styles.miniTag}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className={styles.chatText}>
                      Ask a simple question like “when should I do my oil change?”, or describe a real symptom like brake noise, overheating, a weak battery, or a warning light.
                    </p>
                  )}
                </div>
              </article>
            </div>
          )}

          {hasConversation ? (
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
                  {repairText(item)}
                </button>
              ))}
            </div>
          ) : null}

          <div className={`${styles.composer} ${!hasConversation ? styles.composerCentered : ''}`}>
            <div className={styles.inputCard}>
              <textarea
                className={styles.textarea}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Describe the symptom or ask an auto question..."
              />
              <div className={styles.helper}>
                <span>
                  {inputMode === 'text' && 'Focused on FlashMat services, providers, and vehicle diagnosis.'}
                  {inputMode === 'photo' && 'Photo support is coming next. For now, describe what you see in writing.'}
                  {inputMode === 'audio' && 'Voice support is coming next. For now, type the issue in your own words.'}
                </span>
                <strong>FlashMat • Montreal</strong>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.primaryBtn} ${isAnalyzing ? styles.primaryBtnDisabled : ''}`}
                onClick={() => analyze()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Thinking...' : 'Send'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => openMatchingSearch(effectiveSearchCat)}
              >
                Find matching garages
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => navigate('/services')}
              >
                Explore services
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}



