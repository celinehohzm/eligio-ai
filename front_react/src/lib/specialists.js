const SPECIALIST_NAMES = [
  "LAWRENCE, ERIN",
  "LLINAS, RAFAEL H",
  "MARAGAKIS, NICHOLAS JOHN",
  "MARSH, ELISABETH BREESE",
  "MCARTHUR, JUSTIN CHARLES",
  "MCDONALD, TANYA JOELLE WILLIAMS",
  "MERBACH, DAWN",
  "MILLS, KELLY ALEXANDER",
  "MOUKHEIBER, EMILE SAMI",
  "MUKHERJEE-CLAVIN, BIPASHA",
  "NEWSOME, SCOTT DOUGLAS",
  "NORTON, LAURA",
  "OAKLEY, CHRISTOPHER BRANDON",
  "PANTELYAT, ALEXANDER YURYEVICH",
  "PARDO-VILLAMIZAR, CARLOS A",
  "PAUL, ASHLEY MARY",
  "POLYDEFKIS, MICHAEL JAMES",
  "RASTALL, DAVID PATRIC WERNER",
  "RICAURTE, GEORGE A JR.",
  "RODA, RICARDO HORACIO",
  "ROSENTHAL, LIANA ISA",
  "SAIDHA, SHIV",
  "SALAS, RACHEL MARIE E",
  "SCHMIDT, MARIA TERESA",
  "SOTIRCHOS, ELIAS S",
  "TEVZADZE, NANA",
  "UCHIL, ALPA",
  "VENKATESAN, ARUN",
  "WAKSMUNSKI, REBECCA",
  "WOOD, AMANDA",
  "WYPYCH, KELLY ANN",
  "YACOUB, ANNE DAMIAN",
  "BARANANO, KRISTIN WHITFORD",
  "BHARGAVA, PAVAN",
  "EXAR, ELLIOTT NICHOLAS",
  "FELLING, RYAN JORDAN",
  "FILIPPATOU, ANGELIKI",
  "FRACICA, ELIZABETH ANN",
  "GOODMAN, ALEXANDRA",
  "GRALEY, CHRISTINA RENEE",
  "GRANDISON, DIAN PATRICIA",
  "HALE, DAVID EDWARD",
  "HOKE, AHMET",
  "JOHANSEN, MICHELLE CHRISTINA",
  "KANG, JOON-YI",
  "KORNBERG, MICHAEL DAVIN",
  "KRAUSS, GREGORY LEWIS",
  "MOGHEKAR, ABHAY RAJESHWAR",
  "MOHASSEL, PAYAM",
  "MORRIS, STEPHANIE MAYE",
  "MORRISON, BRETT MICHAEL",
  "MOWRY, ELLEN MAHAR",
  "NAYAK, KATRINA MARIE",
  "NOURBAKHSH, BARDIA",
  "PROBASCO, JOHN CALVIN",
  "ROMO, CARLOS GUILLERMO",
  "ROTHSTEIN, JEFFREY DAVID",
  "SAFONOVA, ALEKSANDRA SERGEYEVNA",
  "SCHOLZ, SONJA WALTRAUD",
  "STERN, BARNEY JOEL",
  "SUMNER, CHARLOTTE JANE",
  "SUN, LISA RENEE",
  "TAGA, ARENS",
  "URRUTIA, VICTOR CRUZ",
  "ZEILER, STEVEN ROBERT",
];

const FEATURE_DEFINITIONS = {
  headache: {
    label: "Headache Medicine",
    keywords: [
      "headache",
      "migraine",
      "aura",
      "cluster headache",
      "vestibular migraine",
      "photophobia",
      "head pain",
      "trigeminal neuralgia",
    ],
  },
  stroke: {
    label: "Stroke and Cerebrovascular Neurology",
    keywords: [
      "stroke",
      "tia",
      "cerebrovascular",
      "aneurysm",
      "hemorrhage",
      "ischemia",
      "thrombectomy",
      "vascular",
      "neurovascular",
    ],
  },
  multipleSclerosis: {
    label: "Multiple Sclerosis and Neuroimmunology",
    keywords: [
      "multiple sclerosis",
      " ms ",
      "optic neuritis",
      "neuroimmunology",
      "demyelinating",
      "transverse myelitis",
      "nmosd",
      "myelitis",
    ],
  },
  movementDisorders: {
    label: "Movement Disorders",
    keywords: [
      "parkinson",
      "tremor",
      "dystonia",
      "ataxia",
      "movement disorder",
      "lewy",
      "rigidity",
      "bradykinesia",
      "essential tremor",
      "atypical parkinsonism",
    ],
  },
  epilepsy: {
    label: "Epilepsy",
    keywords: [
      "seizure",
      "epilepsy",
      "convulsion",
      "spell",
      "first seizure",
      "status epilepticus",
      "eeg",
    ],
  },
  sleep: {
    label: "Sleep Neurology",
    keywords: [
      "sleep",
      "insomnia",
      "narcolepsy",
      "restless legs",
      "parasomnia",
      "sleep apnea",
      "circadian",
      "hypersomnia",
    ],
  },
  neuromuscular: {
    label: "Neuromuscular Medicine",
    keywords: [
      "als",
      "neuromuscular",
      "neuropathy",
      "myopathy",
      "myasthenia",
      "fasciculation",
      "weakness",
      "emg",
      "ncs",
      "muscle",
      "motor neuron",
    ],
  },
  neuroinfectious: {
    label: "Neuroinfectious Disease and Autoimmune Neurology",
    keywords: [
      "encephalitis",
      "meningitis",
      "neuroinfectious",
      "infectious",
      "autoimmune encephalitis",
      "brain inflammation",
      "csf",
    ],
  },
  concussionRehab: {
    label: "Physical Medicine and Rehabilitation",
    keywords: [
      "concussion",
      "traumatic brain injury",
      "tbi",
      "post-traumatic",
      "physiatry",
      "rehabilitation",
      "pm&r",
      "pmr",
    ],
  },
  generalNeurology: {
    label: "General Neurology",
    keywords: [],
  },
};

const SPECIALTY_AREAS = [
  "Amyotrophic Lateral Sclerosis (ALS)",
  "Aneurysm",
  "Ataxia",
  "Brain Tumor",
  "Cerebral Fluid Disorders",
  "Cerebrovascular Conditions",
  "Chiari Malformation",
  "Charcot-Marie-Tooth Disease",
  "Encephalitis",
  "Epilepsy",
  "Headache",
  "Stroke",
  "The Multidisciplinary Adult Cranioplasty Center (MACC)",
  "Memory Disorders",
  "Parkinson's Disease and Movement Disorders",
  "Multiple Sclerosis",
  "Muscular Dystrophy",
  "Myelitis and Myelopathy",
  "Myositis",
  "Neurofibromatosis",
  "Neuroimmunology and Neurological Infections",
  "Neuromuscular Medicine",
  "Neuroplastic Surgery",
  "Peripheral Nerve Injuries",
  "Peripheral Nerve Surgery",
  "Pituitary Disorders",
  "Restless Legs Syndrome",
  "Spinal Muscular Atrophy",
  "Spine Conditions",
  "Trigeminal Neuralgia",
  "Vestibular and Neuro-Visual Disorders",
];

const SPECIALTY_AREA_SET = new Set(SPECIALTY_AREAS);

const PROVIDER_OVERRIDES = {
  "MARSH, ELISABETH BREESE": {
    displayName: "Liz Breese Marsh",
    subspecialty: "Vascular Neurology",
    clinic: "Stroke Center at Johns Hopkins Bayview Medical Center",
    departments: ["Neurology"],
    specialtyArea: "Cerebrovascular Conditions",
    focusAreas: ["stroke", "headache"],
    minAge: 18,
    backgroundSummary:
      "Liz Breese Marsh focuses on cerebrovascular neurology, stroke outcomes, and stroke recovery. Her clinical work includes stroke service leadership and multidisciplinary follow-up care aimed at improving long-term functional recovery after stroke.",
    centersAndInstitutes: [
      "Cerebrovascular Center",
      "Stroke Center at Johns Hopkins Bayview Medical Center",
      "Stroke Center at The Johns Hopkins Hospital",
    ],
  },
  "YACOUB, ANNE DAMIAN": {
    subspecialty: "Headache Medicine and Neuroimmunology",
    clinic: "Johns Hopkins Headache Center / Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Headache",
    focusAreas: ["headache", "multipleSclerosis"],
    minAge: 18,
  },
  "GRALEY, CHRISTINA RENEE": {
    subspecialty: "Headache Medicine",
    clinic: "Johns Hopkins Headache Center, Johns Hopkins Bayview Medical Center",
    departments: ["Neurology"],
    specialtyArea: "Headache",
    focusAreas: ["headache"],
    minAge: 18,
  },
  "NAYAK, KATRINA MARIE": {
    subspecialty: "Headache Medicine",
    clinic: "Johns Hopkins Headache Center, Johns Hopkins Bayview Medical Center",
    departments: ["Neurology"],
    specialtyArea: "Headache",
    focusAreas: ["headache"],
    minAge: 18,
  },
  "OAKLEY, CHRISTOPHER BRANDON": {
    subspecialty: "Pediatric Headache Medicine",
    clinic: "Johns Hopkins Headache Center / Children's Center Pediatric Specialists",
    departments: ["Neurology"],
    specialtyArea: "Headache",
    focusAreas: ["headache"],
    maxAge: 17,
  },
  "GRANDISON, DIAN PATRICIA": {
    subspecialty: "Headache Medicine",
    clinic: "Johns Hopkins Headache Center, Johns Hopkins Bayview Medical Center",
    departments: ["Neurology"],
    specialtyArea: "Headache",
    focusAreas: ["headache"],
    maxAge: 30,
  },
  "WOOD, AMANDA": {
    subspecialty: "Pediatric Headache Medicine",
    clinic: "Johns Hopkins Headache Center / Green Spring Station",
    departments: ["Neurology"],
    specialtyArea: "Headache",
    focusAreas: ["headache"],
    maxAge: 17,
  },
  "LLINAS, RAFAEL H": {
    displayName: "Raf H. Llinas",
    subspecialty: "Vascular Neurology",
    clinic: "Johns Hopkins Bayview Neurology / Stroke Center",
    departments: ["Neurology"],
    specialtyArea: "Cerebrovascular Conditions",
    focusAreas: ["stroke", "headache"],
    minAge: 18,
  },
  "URRUTIA, VICTOR CRUZ": {
    subspecialty: "Stroke and Cerebrovascular Neurology",
    clinic: "Johns Hopkins Hospital Comprehensive Stroke Center",
    departments: ["Neurology"],
    specialtyArea: "Stroke",
    focusAreas: ["stroke"],
    minAge: 18,
  },
  "ZEILER, STEVEN ROBERT": {
    subspecialty: "Stroke Recovery Neurology",
    clinic: "Johns Hopkins Hospital Comprehensive Stroke Center",
    departments: ["Neurology"],
    specialtyArea: "Stroke",
    focusAreas: ["stroke"],
    minAge: 18,
  },
  "FELLING, RYAN JORDAN": {
    subspecialty: "Pediatric Stroke Neurology",
    clinic: "Johns Hopkins Pediatric Stroke Program / Green Spring Station",
    departments: ["Neurology"],
    specialtyArea: "Stroke",
    focusAreas: ["stroke"],
    maxAge: 25,
  },
  "NEWSOME, SCOTT DOUGLAS": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "SAIDHA, SHIV": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "MOWRY, ELLEN MAHAR": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "SOTIRCHOS, ELIAS S": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "NOURBAKHSH, BARDIA": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "BHARGAVA, PAVAN": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "KORNBERG, MICHAEL DAVIN": {
    displayName: "Michael Davin Kornberg",
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "MCARTHUR, JUSTIN CHARLES": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "PARDO-VILLAMIZAR, CARLOS A": {
    subspecialty: "Multiple Sclerosis and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    departments: ["Neurology"],
    specialtyArea: "Multiple Sclerosis",
    focusAreas: ["multipleSclerosis"],
    minAge: 18,
  },
  "VENKATESAN, ARUN": {
    subspecialty: "Neuroinfectious Disease and Neuroimmunology",
    clinic: "Johns Hopkins Multiple Sclerosis Center / Autoimmune Neurology Clinics",
    departments: ["Neurology"],
    specialtyArea: "Neuroimmunology and Neurological Infections",
    focusAreas: ["neuroinfectious", "multipleSclerosis"],
    minAge: 18,
  },
  "MILLS, KELLY ALEXANDER": {
    displayName: "Kelly Alexander Mills",
    subspecialty: "Movement Disorders Neurology",
    clinic: "Johns Hopkins Parkinson's Disease and Movement Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Parkinson's Disease and Movement Disorders",
    focusAreas: ["movementDisorders"],
    minAge: 18,
  },
  "MOUKHEIBER, EMILE SAMI": {
    subspecialty: "Movement Disorders Neurology",
    clinic: "Johns Hopkins Parkinson's Disease and Movement Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Parkinson's Disease and Movement Disorders",
    focusAreas: ["movementDisorders"],
    minAge: 18,
  },
  "PANTELYAT, ALEXANDER YURYEVICH": {
    displayName: "Alex Pantelyat",
    subspecialty: "Movement Disorders Neurology",
    clinic: "Johns Hopkins Parkinson's Disease and Movement Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Parkinson's Disease and Movement Disorders",
    focusAreas: ["movementDisorders"],
    minAge: 18,
  },
  "RICAURTE, GEORGE A JR.": {
    displayName: "George A. Ricaurte Jr.",
    subspecialty: "Movement Disorders Neurology",
    clinic: "Johns Hopkins Parkinson's Disease and Movement Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Parkinson's Disease and Movement Disorders",
    focusAreas: ["movementDisorders"],
    minAge: 18,
  },
  "SCHMIDT, MARIA TERESA": {
    subspecialty: "Movement Disorders Neurology",
    clinic: "Johns Hopkins Parkinson's Disease and Movement Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Parkinson's Disease and Movement Disorders",
    focusAreas: ["movementDisorders"],
    minAge: 18,
  },
  "WAKSMUNSKI, REBECCA": {
    subspecialty: "Movement Disorders Neurology",
    clinic: "Johns Hopkins Parkinson's Disease and Movement Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Parkinson's Disease and Movement Disorders",
    focusAreas: ["movementDisorders"],
    minAge: 18,
  },
  "KRAUSS, GREGORY LEWIS": {
    subspecialty: "Epilepsy",
    clinic: "Johns Hopkins Epilepsy Center",
    departments: ["Neurology"],
    specialtyArea: "Epilepsy",
    focusAreas: ["epilepsy"],
    minAge: 18,
  },
  "KANG, JOON-YI": {
    displayName: "Joon-Yi Kang",
    subspecialty: "Epilepsy",
    clinic: "Johns Hopkins Epilepsy Center",
    departments: ["Neurology"],
    specialtyArea: "Epilepsy",
    focusAreas: ["epilepsy"],
    minAge: 18,
  },
  "MCDONALD, TANYA JOELLE WILLIAMS": {
    displayName: "Tanya McDonald",
    subspecialty: "Epilepsy",
    clinic: "Johns Hopkins Epilepsy Center",
    departments: ["Neurology"],
    specialtyArea: "Epilepsy",
    focusAreas: ["epilepsy"],
    minAge: 18,
  },
  "NORTON, LAURA": {
    subspecialty: "Epilepsy Nurse Practitioner",
    clinic: "Johns Hopkins Epilepsy Center",
    departments: ["Neurology"],
    specialtyArea: "Epilepsy",
    focusAreas: ["epilepsy"],
    minAge: 18,
  },
  "EXAR, ELLIOTT NICHOLAS": {
    subspecialty: "Sleep Medicine",
    clinic: "Johns Hopkins Center for Sleep at Howard County Medical Center",
    departments: ["Neurology"],
    specialtyArea: "Restless Legs Syndrome",
    focusAreas: ["sleep"],
    minAge: 18,
  },
  "SALAS, RACHEL MARIE E": {
    displayName: "Rachel M. E. Salas",
    subspecialty: "Sleep Neurology",
    clinic: "Center for Sleep and Wellness / Bayview Sleep Disorders Center",
    departments: ["Neurology"],
    specialtyArea: "Restless Legs Syndrome",
    focusAreas: ["sleep"],
    minAge: 18,
  },
  "HOKE, AHMET": {
    subspecialty: "Neuromuscular Medicine",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Neuromuscular Medicine",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "MARAGAKIS, NICHOLAS JOHN": {
    subspecialty: "Neuromuscular Medicine and ALS",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Amyotrophic Lateral Sclerosis (ALS)",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "MOHASSEL, PAYAM": {
    subspecialty: "Neuromuscular Medicine",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Neuromuscular Medicine",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "MORRISON, BRETT MICHAEL": {
    subspecialty: "Neuromuscular Medicine and ALS",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Amyotrophic Lateral Sclerosis (ALS)",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "MUKHERJEE-CLAVIN, BIPASHA": {
    subspecialty: "Neuromuscular Medicine",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Neuromuscular Medicine",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "POLYDEFKIS, MICHAEL JAMES": {
    subspecialty: "Neuromuscular Medicine",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Neuromuscular Medicine",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "RODA, RICARDO HORACIO": {
    subspecialty: "Neuromuscular Medicine",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Neuromuscular Medicine",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "ROTHSTEIN, JEFFREY DAVID": {
    subspecialty: "Neuromuscular Medicine and ALS",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Amyotrophic Lateral Sclerosis (ALS)",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "SUMNER, CHARLOTTE JANE": {
    subspecialty: "Neuromuscular Medicine",
    clinic: "Daniel B. Drachman Division of Neuromuscular Medicine",
    departments: ["Neurology"],
    specialtyArea: "Neuromuscular Medicine",
    focusAreas: ["neuromuscular"],
    minAge: 18,
  },
  "LAWRENCE, ERIN": {
    specialtyArea: "Cerebrovascular Conditions",
  },
  "MERBACH, DAWN": {
    subspecialty: "Vascular Neurology",
    clinic: "Johns Hopkins Bayview Medical Center",
    specialtyArea: "Cerebrovascular Conditions",
  },
  "PAUL, ASHLEY MARY": {
    subspecialty: "Movement Disorders Neurology",
    clinic: "Parkinson's Disease and Movement Disorders Center",
    specialtyArea: "Parkinson's Disease and Movement Disorders",
  },
  "RASTALL, DAVID PATRIC WERNER": {
    subspecialty: "Neurotology and Neurology",
    clinic: "Johns Hopkins Vestibular Neurology Program",
    specialtyArea: "Vestibular and Neuro-Visual Disorders",
  },
  "ROSENTHAL, LIANA ISA": {
    displayName: "Liana Rosenthal",
    subspecialty: "Ataxia and Movement Disorders Neurology",
    clinic: "Ataxia Center / Parkinson's Disease and Movement Disorders Center",
    specialtyArea: "Ataxia",
  },
  "TEVZADZE, NANA": {
    subspecialty: "Neurotology",
    clinic: "Johns Hopkins Vestibular Neurology Program",
    specialtyArea: "Vestibular and Neuro-Visual Disorders",
  },
  "UCHIL, ALPA": {
    subspecialty: "Amyotrophic Lateral Sclerosis (ALS) Care",
    clinic: "Amyotrophic Lateral Sclerosis (ALS) Clinic",
    specialtyArea: "Amyotrophic Lateral Sclerosis (ALS)",
  },
  "WYPYCH, KELLY ANN": {
    subspecialty: "Neuro-Oncology",
    clinic: "Neurofibromatosis Clinic / Johns Hopkins Neuro-Oncology",
    specialtyArea: "Neurofibromatosis",
  },
  "BARANANO, KRISTIN WHITFORD": {
    displayName: "Kristin Baranano",
    subspecialty: "Neurogenetics and Ataxia",
    clinic: "Ataxia Program / Kennedy Krieger Institute",
    specialtyArea: "Ataxia",
  },
  "FILIPPATOU, ANGELIKI": {
    subspecialty: "Neuroimmunology with a focus on Multiple Sclerosis",
    clinic: "Johns Hopkins Multiple Sclerosis Center",
    specialtyArea: "Multiple Sclerosis",
  },
  "FRACICA, ELIZABETH ANN": {
    displayName: "Elizabeth Fracica",
    subspecialty: "Vascular Neurology and Neurovestibular Disorders",
    clinic: "Vascular Neurology / Green Spring Station",
    specialtyArea: "Cerebrovascular Conditions",
  },
  "HALE, DAVID EDWARD": {
    displayName: "David Hale",
    subspecialty: "Neurotology and Neurology",
    clinic: "Johns Hopkins Vestibular Neurology Program",
    specialtyArea: "Vestibular and Neuro-Visual Disorders",
  },
  "MOGHEKAR, ABHAY RAJESHWAR": {
    displayName: "Abhay R. Moghekar",
    subspecialty: "Cerebrospinal Fluid Disorders Neurology",
    clinic: "Cerebrospinal Fluid Center",
    specialtyArea: "Cerebral Fluid Disorders",
  },
  "MORRIS, STEPHANIE MAYE": {
    subspecialty: "Pediatric Neurology",
    clinic: "Child Neurology at Green Spring Station",
    specialtyArea: "Vestibular and Neuro-Visual Disorders",
  },
  "PROBASCO, JOHN CALVIN": {
    displayName: "John C. Probasco",
    subspecialty: "Advanced Clinical Neurology and Autoimmune Neurology",
    clinic: "Johns Hopkins Encephalitis Center",
    specialtyArea: "Encephalitis",
  },
  "ROMO, CARLOS GUILLERMO": {
    displayName: "Carlos Romo",
    subspecialty: "Neuro-Oncology",
    clinic: "Johns Hopkins Neuro-Oncology",
    specialtyArea: "Brain Tumor",
  },
  "SAFONOVA, ALEKSANDRA SERGEYEVNA": {
    displayName: "Aleksandra Safonova",
    subspecialty: "Cerebrovascular Neurology",
    clinic: "Johns Hopkins Stroke Center",
    specialtyArea: "Stroke",
  },
  "SCHOLZ, SONJA WALTRAUD": {
    displayName: "Sonja Scholz",
    subspecialty: "Movement Disorders and Neurogenetics",
    clinic: "Parkinson's Disease and Movement Disorders Center",
    specialtyArea: "Parkinson's Disease and Movement Disorders",
  },
  "STERN, BARNEY JOEL": {
    displayName: "Barney J. Stern",
    subspecialty: "Vascular Neurology and Neurosarcoidosis",
    clinic: "Advanced Clinical Neurology",
    specialtyArea: "Cerebrovascular Conditions",
  },
  "SUN, LISA RENEE": {
    displayName: "Lisa Renee Sun",
    subspecialty: "Pediatric and Young Adult Stroke Neurology",
    clinic: "Pediatric Stroke Program",
    specialtyArea: "Stroke",
  },
  "TAGA, ARENS": {
    displayName: "Arens Taga",
    subspecialty: "Neuromuscular Medicine and ALS",
    clinic: "Amyotrophic Lateral Sclerosis (ALS) Clinic",
    specialtyArea: "Amyotrophic Lateral Sclerosis (ALS)",
  },
};

function formatNamePart(part) {
  return part
    .split("-")
    .map((segment) =>
      segment
        .split("'")
        .map((piece) => {
          const lowered = piece.toLowerCase();
          if (lowered.length <= 1) {
            return lowered.toUpperCase();
          }
          if (lowered.startsWith("mc") && lowered.length > 2) {
            return `Mc${lowered.charAt(2).toUpperCase()}${lowered.slice(3)}`;
          }
          return `${lowered.charAt(0).toUpperCase()}${lowered.slice(1)}`;
        })
        .join("'"),
    )
    .join("-");
}

function formatProviderName(rawName) {
  const parts = rawName.split(",").map((part) => part.trim()).filter(Boolean);
  const orderedName = parts.length === 2 ? `${parts[1]} ${parts[0]}` : rawName;
  return orderedName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => formatNamePart(part))
    .join(" ");
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeText(value) {
  return ` ${String(value || "").trim().toLowerCase().replace(/\s+/g, " ")} `;
}

function truncateText(value, maxLength = 120) {
  const cleaned = String(value || "").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}...`;
}

function parseDateOfBirth(value) {
  if (!value) {
    return null;
  }

  const parts = String(value).split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPatientAge(referral) {
  const parsedDob = parseDateOfBirth(referral?.patientInfo?.dateOfBirth);
  if (!parsedDob) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsedDob.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > parsedDob.getMonth() ||
    (today.getMonth() === parsedDob.getMonth() && today.getDate() >= parsedDob.getDate());

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function buildEvidenceSources(referral) {
  const patientInfo = referral?.patientInfo || {};
  const referralInsights = referral?.referralInsights || {};
  const triageHighlights = referral?.triageHighlights || {};

  return [
    { field: "Chief Complaint", text: triageHighlights.chiefComplaint || referralInsights.chiefComplaint || patientInfo.reasonForReferral },
    { field: "History of Present Illness", text: triageHighlights.historyOfPresentIllness },
    { field: "Physical Exam", text: triageHighlights.physicalExam },
    { field: "Imaging Results", text: triageHighlights.imagingResults },
    { field: "Lab Results", text: triageHighlights.labResults },
    { field: "Other Providers", text: triageHighlights.otherProviders },
    { field: "Diagnosis", text: referralInsights.diagnosis },
    { field: "Evaluation", text: referralInsights.evaluation },
    { field: "Reason for Referral", text: patientInfo.reasonForReferral },
    { field: "Referral Summary", text: referral?.summaryLine },
  ].filter((item) => String(item.text || "").trim());
}

// Deprecated for routing: backend LLM now owns primary clinic routing decisions.
function collectCaseSignals(referral) {
  const evidenceSources = buildEvidenceSources(referral);
  const fullCorpus = evidenceSources.map((item) => item.text).join(" ");
  const normalizedCorpus = normalizeText(fullCorpus);
  const matchedFeatures = {};

  Object.entries(FEATURE_DEFINITIONS).forEach(([featureKey, feature]) => {
    const hits = feature.keywords.filter((keyword) => normalizedCorpus.includes(normalizeText(keyword)));
    if (hits.length > 0) {
      matchedFeatures[featureKey] = hits;
    }
  });

  return {
    evidenceSources,
    matchedFeatures,
    recommendedDepartment: inferRecommendedDepartment(matchedFeatures),
  };
}

// Deprecated for routing: retained temporarily for heuristic scheduler context.
function inferRecommendedDepartment(matchedFeatures) {
  if (matchedFeatures.concussionRehab && !matchedFeatures.stroke && !matchedFeatures.headache) {
    return "Physical Medicine and Rehabilitation";
  }

  if (matchedFeatures.stroke || matchedFeatures.headache || matchedFeatures.multipleSclerosis || matchedFeatures.epilepsy || matchedFeatures.movementDisorders || matchedFeatures.neuromuscular || matchedFeatures.sleep || matchedFeatures.neuroinfectious) {
    return "Neurology";
  }

  return "Needs clarification";
}

function isAgeCompatible(profile, patientAge) {
  if (patientAge === null) {
    return true;
  }
  if (typeof profile.minAge === "number" && patientAge < profile.minAge) {
    return false;
  }
  if (typeof profile.maxAge === "number" && patientAge > profile.maxAge) {
    return false;
  }
  return true;
}

function collectEvidenceMatches(profile, caseSignals) {
  const matches = [];

  profile.focusAreas.forEach((focusArea) => {
    const feature = FEATURE_DEFINITIONS[focusArea];
    if (!feature) {
      return;
    }

    caseSignals.evidenceSources.forEach((source) => {
      const normalizedText = normalizeText(source.text);
      const featureHits = feature.keywords.filter((keyword) => normalizedText.includes(normalizeText(keyword)));
      if (featureHits.length === 0) {
        return;
      }

      if (matches.some((item) => item.field === source.field)) {
        return;
      }

      matches.push({
        field: source.field,
        quote: truncateText(source.text),
      });
    });
  });

  if (matches.length > 0) {
    return matches.slice(0, 2);
  }

  return caseSignals.evidenceSources.slice(0, 1).map((source) => ({
    field: source.field,
    quote: truncateText(source.text),
  }));
}

function buildMatchRationale(profile, matchedAreas, evidenceMatches) {
  const focusLabel =
    FEATURE_DEFINITIONS[matchedAreas[0] || profile.focusAreas[0] || "generalNeurology"]?.label ||
    profile.subspecialty;

  if (evidenceMatches.length >= 2) {
    return `${profile.displayName} is a strong fit for ${focusLabel.toLowerCase()} because the ${evidenceMatches[0].field.toLowerCase()} notes "${evidenceMatches[0].quote}" and the ${evidenceMatches[1].field.toLowerCase()} highlights "${evidenceMatches[1].quote}".`;
  }

  if (evidenceMatches.length === 1) {
    return `${profile.displayName} is a strong fit for ${focusLabel.toLowerCase()} because the ${evidenceMatches[0].field.toLowerCase()} notes "${evidenceMatches[0].quote}".`;
  }

  return `${profile.displayName} is a good fit for ${focusLabel.toLowerCase()} based on the referral summary and recommended department.`;
}

function buildDefaultProfile(rawName) {
  return {
    rawName,
    displayName: formatProviderName(rawName),
    subspecialty: "General Neurology",
    clinic: "Johns Hopkins Neurology and Neurosurgery",
    departments: ["Neurology"],
    focusAreas: ["generalNeurology"],
  };
}

function getAgeGroupLabel(profile) {
  if (typeof profile.maxAge === "number" && profile.maxAge <= 17) {
    return "pediatric patients";
  }
  if (typeof profile.maxAge === "number" && profile.maxAge <= 25) {
    return "children, adolescents, and some young adults";
  }
  if (typeof profile.minAge === "number" && profile.minAge >= 18) {
    return "adult patients";
  }
  return "patients across a broad neurology population";
}

function splitCentersAndInstitutes(clinic) {
  return String(clinic || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildBackgroundSummary(profile) {
  if (profile.backgroundSummary) {
    return profile.backgroundSummary;
  }

  const focusLabels = profile.focusAreas
    .map((focusArea) => FEATURE_DEFINITIONS[focusArea]?.label)
    .filter(Boolean)
    .filter((label) => label !== "General Neurology");

  if (focusLabels.length > 0) {
    return `${profile.displayName} works in ${profile.subspecialty.toLowerCase()} at ${profile.clinic}. Their work is most closely aligned with ${focusLabels.join(" and ").toLowerCase()}, and they typically see ${getAgeGroupLabel(profile)}.`;
  }

  return `${profile.displayName} is part of ${profile.clinic}. Their listed subspecialty is ${profile.subspecialty.toLowerCase()}, and they typically see ${getAgeGroupLabel(profile)}.`;
}

function buildCentersAndInstitutes(profile) {
  if (Array.isArray(profile.centersAndInstitutes) && profile.centersAndInstitutes.length > 0) {
    return profile.centersAndInstitutes;
  }

  return [...new Set(splitCentersAndInstitutes(profile.clinic))];
}

function inferSpecialtyArea(profile) {
  if (profile.specialtyArea && SPECIALTY_AREA_SET.has(profile.specialtyArea)) {
    return profile.specialtyArea;
  }

  const corpus = [
    profile.subspecialty,
    profile.clinic,
    profile.backgroundSummary,
    ...(profile.centersAndInstitutes || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (corpus.includes("neurofibromatosis")) {
    return "Neurofibromatosis";
  }
  if (corpus.includes("brain tumor") || corpus.includes("neuro-oncology")) {
    return "Brain Tumor";
  }
  if (corpus.includes("cerebrospinal fluid") || corpus.includes("hydrocephalus") || corpus.includes("csf")) {
    return "Cerebral Fluid Disorders";
  }
  if (corpus.includes("encephalitis")) {
    return "Encephalitis";
  }
  if (corpus.includes("ataxia")) {
    return "Ataxia";
  }
  if (corpus.includes("vestibular") || corpus.includes("neuro-visual") || corpus.includes("neurovisual") || corpus.includes("neurotology") || corpus.includes("vertigo") || corpus.includes("dizziness")) {
    return "Vestibular and Neuro-Visual Disorders";
  }
  if (corpus.includes("als")) {
    return "Amyotrophic Lateral Sclerosis (ALS)";
  }

  if (profile.focusAreas.includes("headache")) {
    return "Headache";
  }
  if (profile.focusAreas.includes("epilepsy")) {
    return "Epilepsy";
  }
  if (profile.focusAreas.includes("movementDisorders")) {
    return "Parkinson's Disease and Movement Disorders";
  }
  if (profile.focusAreas.includes("multipleSclerosis")) {
    return "Multiple Sclerosis";
  }
  if (profile.focusAreas.includes("neuroinfectious")) {
    return "Neuroimmunology and Neurological Infections";
  }
  if (profile.focusAreas.includes("sleep")) {
    return "Restless Legs Syndrome";
  }
  if (profile.focusAreas.includes("stroke")) {
    return corpus.includes("stroke") ? "Stroke" : "Cerebrovascular Conditions";
  }
  if (profile.focusAreas.includes("neuromuscular")) {
    return "Neuromuscular Medicine";
  }

  return "Memory Disorders";
}

function buildDirectoryGroup(profile) {
  if (profile.directoryGroup) {
    return profile.directoryGroup;
  }

  return inferSpecialtyArea(profile);
}

function buildSpecialistProfile(rawName) {
  const profile = {
    ...buildDefaultProfile(rawName),
    ...(PROVIDER_OVERRIDES[rawName] || {}),
  };

  return {
    ...profile,
    centersAndInstitutes: buildCentersAndInstitutes(profile),
    backgroundSummary: buildBackgroundSummary(profile),
    specialtyArea: inferSpecialtyArea(profile),
    directoryGroup: buildDirectoryGroup(profile),
  };
}

export const SPECIALISTS = SPECIALIST_NAMES.map((rawName) => buildSpecialistProfile(rawName));

export function getSpecialistDirectoryGroups() {
  const grouped = SPECIALISTS.reduce((accumulator, specialist) => {
    const groupKey = specialist.directoryGroup;
    if (!accumulator[groupKey]) {
      accumulator[groupKey] = [];
    }
    accumulator[groupKey].push(specialist);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .map(([groupLabel, specialists]) => ({
      groupLabel,
      specialists: [...specialists].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    }))
    .sort((left, right) => {
      const leftIndex = SPECIALTY_AREAS.indexOf(left.groupLabel);
      const rightIndex = SPECIALTY_AREAS.indexOf(right.groupLabel);
      if (leftIndex !== -1 && rightIndex !== -1) {
        return leftIndex - rightIndex;
      }
      if (leftIndex !== -1) {
        return -1;
      }
      if (rightIndex !== -1) {
        return 1;
      }
      return left.groupLabel.localeCompare(right.groupLabel);
    });
}

// Deprecated for routing: kept for specialist directory display until LLM routing is fully validated.
export function getSpecialistMatches(referral, count = 3) {
  if (!referral?.id) {
    return [];
  }

  const caseSignals = collectCaseSignals(referral);
  const patientAge = getPatientAge(referral);

  return SPECIALISTS
    .map((profile) => {
      const matchedAreas = profile.focusAreas.filter((focusArea) => caseSignals.matchedFeatures[focusArea]);
      const evidenceMatches = collectEvidenceMatches(profile, caseSignals);
      let score = 42;

      if (matchedAreas.length > 0) {
        score += 24;
        score += Math.min(18, matchedAreas.length * 8);
      } else if (profile.focusAreas.includes("generalNeurology")) {
        score += 6;
      }

      if (isAgeCompatible(profile, patientAge)) {
        score += patientAge === null ? 6 : 16;
      } else {
        score -= 65;
      }

      if (caseSignals.recommendedDepartment !== "Needs clarification") {
        score += profile.departments.includes(caseSignals.recommendedDepartment) ? 12 : -6;
      }

      score += Math.min(12, evidenceMatches.length * 6);

      if (matchedAreas.length === 0 && profile.focusAreas.includes("generalNeurology")) {
        score += 4;
      }

      return {
        id: profile.rawName,
        displayName: profile.displayName,
        subspecialty: profile.subspecialty,
        clinic: profile.clinic,
        recommendedDepartment: caseSignals.recommendedDepartment,
        score: clamp(Math.round(score), 1, 99),
        rationale: buildMatchRationale(profile, matchedAreas, evidenceMatches),
        evidenceMatches,
      };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.displayName.localeCompare(right.displayName))
    .slice(0, count);
}

export function getSpecialistScoreExplanation() {
  return [
    "The match percentage is a heuristic score, not a scheduling rule.",
    "It increases when the provider's subspecialty matches the referral problem, the provider sees the patient's age group, the provider's department aligns with the routing guidance, and the HPI, physical exam, imaging, or lab sections contain supporting evidence.",
    "It does not account for real-time availability, insurance participation, or referral urgency.",
  ];
}
