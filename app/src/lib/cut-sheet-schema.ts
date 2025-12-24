/**
 * Primal-Based Cut Sheet Schema
 *
 * This module defines the anatomically-accurate cut sheet data structure.
 * Cuts are organized by primal (major muscle group) with proper constraint rules.
 *
 * Based on industry standards from:
 * - USDA Meat Buyer's Guide
 * - Custom processor cut sheets
 * - cutsheet/logic/cut_sheet_schema.json
 */

import type { AnimalType } from '@/types/database'

// ============================================================================
// Core Types
// ============================================================================

export type CutType =
  | 'steak'
  | 'roast'
  | 'chop'
  | 'ribs'
  | 'ground'
  | 'cubed'
  | 'cured'
  | 'shank'
  | 'bacon'
  | 'meat'

export interface ParameterOption<T> {
  options: T[]
  default: T
  unit?: string
}

export interface BooleanParameter {
  type: 'boolean'
  default: boolean
  label?: string
}

export interface CutParameters {
  thickness?: ParameterOption<number> | ParameterOption<string>  // Can be numeric (1, 1.5) or string ("regular", "thick")
  perPackage?: ParameterOption<number>
  weight?: ParameterOption<number>
  size?: ParameterOption<string>
  style?: ParameterOption<string>
  cut?: ParameterOption<string>
  portion?: ParameterOption<string>
  boneIn?: BooleanParameter
  frenched?: BooleanParameter
  spiral?: BooleanParameter
  smoked?: BooleanParameter
  keepWhole?: BooleanParameter
  packageSize?: ParameterOption<number>
}

export interface CutChoice {
  id: string
  name: string
  type: CutType

  // Constraint rules
  excludes?: string[]           // Hard conflict - selecting this disables these
  conflictsWith?: string[]      // Soft conflict - can coexist but reduces yield
  reducesYield?: string         // This cut comes from the same area
  requires?: string[]           // Must be selected together
  independent?: boolean         // Can keep regardless of other choices

  // Metadata
  boneIn?: boolean              // Default bone-in state
  specialty?: boolean           // Not commonly requested
  additionalFee?: boolean       // Requires extra processing fee
  note?: string                 // Explanation for users

  // Customizable parameters
  parameters?: CutParameters
}

export interface Primal {
  displayName: string
  description?: string

  // Constraint configuration
  conflictGroup?: string        // All choices share this conflict namespace
  allowSplit?: boolean          // Can split between multiple options
  exclusiveChoice?: boolean     // Only ONE option allowed (radio buttons)

  // Structure
  subSections?: Record<string, Primal>  // For complex primals like Round
  choices: CutChoice[]
}

export interface GroundParameters {
  parameters: {
    packageSize: ParameterOption<number>
    leanRatio?: ParameterOption<string>
    makePatties?: {
      enabled: BooleanParameter
      pattySize: ParameterOption<number>
      quantity?: { type: 'number'; unit: string }
    }
    makeSausage?: {
      enabled: BooleanParameter
      flavor: ParameterOption<string>
      style: ParameterOption<string>
    }
  }
}

export interface AnimalSchema {
  displayName: string
  note?: string
  primals: Record<string, Primal>
  groundOptions?: GroundParameters
}

export interface CutSheetSchema {
  version: string
  animals: Record<AnimalType, AnimalSchema>
  validationRules: Record<string, string>
  processingOptions: Record<string, {
    displayName: string
    additionalFee: boolean
    appliesTo: string[]
  }>
}

// ============================================================================
// Schema Data
// ============================================================================

export const CUT_SHEET_SCHEMA: CutSheetSchema = {
  version: "1.0",

  animals: {
    beef: {
      displayName: "Beef",
      primals: {
        shortLoin: {
          displayName: "Short Loin",
          conflictGroup: "tbone_conflict",
          description: "Contains both NY Strip and Tenderloin connected by T-shaped bone",
          choices: [
            {
              id: "tbone",
              name: "T-Bone Steaks",
              type: "steak",
              boneIn: true,
              excludes: ["nystrip", "filet", "porterhouse"],
              parameters: {
                thickness: { options: [0.75, 1, 1.25, 1.5], default: 1, unit: "inches" },
                perPackage: { options: [1, 2, 4], default: 2 }
              }
            },
            {
              id: "porterhouse",
              name: "Porterhouse Steaks",
              type: "steak",
              boneIn: true,
              excludes: ["nystrip", "filet", "tbone"],
              parameters: {
                thickness: { options: [1, 1.25, 1.5, 2], default: 1.25, unit: "inches" },
                perPackage: { options: [1, 2], default: 2 }
              }
            },
            {
              id: "nystrip",
              name: "NY Strip Steaks",
              type: "steak",
              boneIn: false,
              excludes: ["tbone", "porterhouse"],
              requires: ["filet"],
              parameters: {
                thickness: { options: [0.75, 1, 1.25, 1.5], default: 1, unit: "inches" },
                perPackage: { options: [1, 2, 4], default: 2 }
              }
            },
            {
              id: "filet",
              name: "Filet Mignon / Tenderloin",
              type: "steak",
              boneIn: false,
              excludes: ["tbone", "porterhouse"],
              requires: ["nystrip"],
              parameters: {
                thickness: { options: [1, 1.5, 2], default: 1.5, unit: "inches" },
                perPackage: { options: [1, 2], default: 2 },
                keepWhole: { type: "boolean", default: false, label: "Keep tenderloin whole" }
              }
            }
          ]
        },

        rib: {
          displayName: "Rib",
          conflictGroup: "rib_allocation",
          description: "Can be steaks OR roasts, or a combination",
          allowSplit: true,
          choices: [
            {
              id: "ribeye",
              name: "Rib-Eye Steaks",
              type: "steak",
              conflictsWith: ["primerib"],
              parameters: {
                thickness: { options: [0.75, 1, 1.25, 1.5, 2], default: 1, unit: "inches" },
                perPackage: { options: [1, 2, 4], default: 2 },
                boneIn: { type: "boolean", default: false }
              }
            },
            {
              id: "primerib",
              name: "Prime Rib / Standing Rib Roast",
              type: "roast",
              conflictsWith: ["ribeye"],
              parameters: {
                size: { options: ["2-rib", "3-rib", "4-rib", "whole"], default: "3-rib" },
                boneIn: { type: "boolean", default: true }
              }
            },
            {
              id: "rib_ground",
              name: "Ground to Hamburger",
              type: "ground",
              conflictsWith: ["ribeye", "primerib"]
            }
          ]
        },

        chuck: {
          displayName: "Chuck",
          allowSplit: true,
          description: "Front shoulder - can be steaks, roasts, stew, or ground",
          choices: [
            {
              id: "chuck_roast",
              name: "Chuck Roasts",
              type: "roast",
              parameters: {
                weight: { options: [2, 3, 4, 5], default: 3, unit: "lbs" },
                boneIn: { type: "boolean", default: false }
              }
            },
            {
              id: "chuck_steak",
              name: "Chuck Steaks",
              type: "steak",
              parameters: {
                thickness: { options: [0.75, 1, 1.25], default: 1, unit: "inches" },
                perPackage: { options: [2, 4], default: 2 }
              }
            },
            {
              id: "denver_steak",
              name: "Denver Steaks",
              type: "steak",
              specialty: true,
              conflictsWith: ["chuck_roast", "chuck_steak"],
              parameters: {
                thickness: { options: [1, 1.25], default: 1, unit: "inches" }
              }
            },
            {
              id: "flat_iron",
              name: "Flat Iron Steaks",
              type: "steak",
              specialty: true,
              conflictsWith: ["chuck_roast", "chuck_steak"],
              parameters: {
                thickness: { options: [0.75, 1], default: 1, unit: "inches" }
              }
            },
            {
              id: "stew_meat",
              name: "Stew Meat",
              type: "cubed",
              parameters: {
                packageSize: { options: [1, 2], default: 1, unit: "lbs" }
              }
            },
            {
              id: "chuck_ground",
              name: "Ground to Hamburger",
              type: "ground"
            }
          ]
        },

        round: {
          displayName: "Round",
          description: "Rear leg - multiple sections each with their own options",
          subSections: {
            topRound: {
              displayName: "Top Round",
              exclusiveChoice: true,
              choices: [
                { id: "top_round_steak", name: "Round Steaks", type: "steak" },
                { id: "london_broil", name: "London Broil", type: "steak", note: "Thick cut ~2 inches" },
                { id: "top_round_roast", name: "Top Round Roast", type: "roast" },
                { id: "top_round_ground", name: "Ground to Hamburger", type: "ground" }
              ]
            },
            bottomRound: {
              displayName: "Bottom Round",
              exclusiveChoice: true,
              choices: [
                { id: "bottom_round_roast", name: "Bottom Round Roast", type: "roast" },
                { id: "cube_steak", name: "Cube Steaks (Tenderized)", type: "steak" },
                { id: "bottom_round_ground", name: "Ground to Hamburger", type: "ground" }
              ]
            },
            eyeRound: {
              displayName: "Eye of Round",
              exclusiveChoice: true,
              choices: [
                { id: "eye_round_roast", name: "Eye Round Roast", type: "roast" },
                { id: "eye_round_steak", name: "Eye Round Steaks (Medallions)", type: "steak" },
                { id: "eye_round_ground", name: "Ground to Hamburger", type: "ground" }
              ]
            },
            sirloinTip: {
              displayName: "Sirloin Tip",
              exclusiveChoice: true,
              choices: [
                { id: "sirloin_tip_roast", name: "Sirloin Tip Roast", type: "roast" },
                { id: "sirloin_tip_steak", name: "Sirloin Tip Steaks", type: "steak" },
                { id: "sirloin_tip_ground", name: "Ground to Hamburger", type: "ground" }
              ]
            }
          },
          choices: [] // Choices are in subSections
        },

        sirloin: {
          displayName: "Sirloin",
          allowSplit: true,
          choices: [
            {
              id: "sirloin_steak",
              name: "Sirloin Steaks",
              type: "steak",
              parameters: {
                thickness: { options: [0.75, 1, 1.25], default: 1, unit: "inches" }
              }
            },
            {
              id: "tritip",
              name: "Tri-Tip Roast",
              type: "roast",
              reducesYield: "sirloin_steak"
            },
            {
              id: "picanha",
              name: "Picanha (Coulotte)",
              type: "roast",
              specialty: true,
              reducesYield: "sirloin_steak"
            },
            {
              id: "sirloin_ground",
              name: "Ground to Hamburger",
              type: "ground"
            }
          ]
        },

        brisket: {
          displayName: "Brisket",
          exclusiveChoice: true,
          choices: [
            { id: "whole_brisket", name: "Whole Packer Brisket", type: "roast" },
            { id: "split_brisket", name: "Split (Flat and Point)", type: "roast" },
            { id: "corned_beef", name: "Corned Beef (Cured)", type: "cured", additionalFee: true },
            { id: "brisket_ground", name: "Ground to Hamburger", type: "ground" }
          ]
        },

        shortRibs: {
          displayName: "Short Ribs",
          choices: [
            {
              id: "short_ribs_bone",
              name: "Bone-In Short Ribs",
              type: "ribs",
              parameters: {
                style: { options: ["english", "flanken", "plate"], default: "english" }
              }
            },
            { id: "short_ribs_boneless", name: "Boneless Short Rib Meat", type: "meat" },
            { id: "short_ribs_ground", name: "Ground to Hamburger", type: "ground" }
          ]
        },

        flank: {
          displayName: "Flank",
          choices: [
            { id: "flank_steak", name: "Flank Steak", type: "steak" },
            { id: "flank_ground", name: "Ground to Hamburger", type: "ground" }
          ]
        },

        skirt: {
          displayName: "Skirt",
          choices: [
            { id: "skirt_steak", name: "Skirt Steak (Fajita)", type: "steak" },
            { id: "skirt_ground", name: "Ground to Hamburger", type: "ground" }
          ]
        }
      },

      groundOptions: {
        parameters: {
          packageSize: { options: [1, 2, 5, 10], default: 1, unit: "lbs" },
          leanRatio: { options: ["80/20", "85/15", "90/10"], default: "85/15" },
          makePatties: {
            enabled: { type: "boolean", default: false },
            pattySize: { options: [0.25, 0.33, 0.5], default: 0.33, unit: "lbs" },
            quantity: { type: "number", unit: "lbs" }
          }
        }
      }
    },

    pork: {
      displayName: "Pork",
      primals: {
        loin: {
          displayName: "Loin",
          allowSplit: true,
          choices: [
            {
              id: "pork_chops",
              name: "Pork Chops",
              type: "chop",
              conflictsWith: ["loin_roast_whole"],
              parameters: {
                thickness: { options: [0.75, 1, 1.5, 2], default: 1, unit: "inches" },
                perPackage: { options: [2, 4, 6], default: 4 },
                boneIn: { type: "boolean", default: true },
                cut: { options: ["center-cut", "rib", "sirloin", "mixed"], default: "mixed" }
              }
            },
            {
              id: "loin_roast",
              name: "Loin Roast",
              type: "roast",
              conflictsWith: ["pork_chops"],
              parameters: {
                weight: { options: [3, 4, 5], default: 4, unit: "lbs" },
                boneIn: { type: "boolean", default: false }
              }
            },
            {
              id: "loin_roast_whole",
              name: "Whole Loin Roast",
              type: "roast",
              excludes: ["pork_chops"]
            },
            {
              id: "tenderloin",
              name: "Tenderloin",
              type: "roast",
              independent: true,
              note: "Separate muscle - can be kept regardless of chop/roast choice"
            },
            {
              id: "baby_back_ribs",
              name: "Baby Back Ribs",
              type: "ribs",
              reducesYield: "loin"
            }
          ]
        },

        ham: {
          displayName: "Leg / Ham",
          conflictGroup: "ham_processing",
          choices: [
            {
              id: "fresh_ham",
              name: "Fresh Ham (Uncured Roast)",
              type: "roast",
              excludes: ["cured_ham", "smoked_ham"],
              parameters: {
                portion: { options: ["whole", "shank", "butt"], default: "whole" },
                boneIn: { type: "boolean", default: true }
              }
            },
            {
              id: "cured_ham",
              name: "Cured Ham",
              type: "cured",
              excludes: ["fresh_ham"],
              additionalFee: true,
              parameters: {
                spiral: { type: "boolean", default: false },
                smoked: { type: "boolean", default: true }
              }
            },
            {
              id: "ham_steaks",
              name: "Ham Steaks",
              type: "steak",
              reducesYield: "ham"
            }
          ]
        },

        shoulder: {
          displayName: "Shoulder",
          subSections: {
            bostonButt: {
              displayName: "Boston Butt",
              choices: [
                { id: "boston_butt_whole", name: "Whole (for smoking/pulling)", type: "roast" },
                { id: "boston_butt_roasts", name: "Smaller Roasts", type: "roast" },
                { id: "boston_butt_steaks", name: "Blade Steaks", type: "steak" },
                { id: "boston_butt_ground", name: "Ground/Sausage", type: "ground" }
              ]
            },
            picnicShoulder: {
              displayName: "Picnic Shoulder",
              choices: [
                { id: "picnic_roast", name: "Picnic Roast", type: "roast" },
                { id: "picnic_ground", name: "Ground/Sausage", type: "ground" }
              ]
            }
          },
          choices: []
        },

        belly: {
          displayName: "Belly / Side",
          conflictGroup: "belly_processing",
          choices: [
            {
              id: "bacon",
              name: "Bacon (Cured/Smoked)",
              type: "cured",
              excludes: ["fresh_belly"],
              additionalFee: true,
              parameters: {
                thickness: { options: ["regular", "thick"], default: "regular" }
              }
            },
            {
              id: "fresh_belly",
              name: "Fresh Pork Belly",
              type: "roast",
              excludes: ["bacon"]
            },
            {
              id: "spare_ribs",
              name: "Spare Ribs",
              type: "ribs",
              reducesYield: "belly",
              parameters: {
                style: { options: ["full", "st-louis"], default: "full" }
              }
            }
          ]
        }
      },

      groundOptions: {
        parameters: {
          packageSize: { options: [1, 2, 5], default: 1, unit: "lbs" },
          makeSausage: {
            enabled: { type: "boolean", default: false },
            flavor: { options: ["breakfast", "italian-mild", "italian-hot", "bratwurst", "chorizo", "maple"], default: "breakfast" },
            style: { options: ["bulk", "links"], default: "bulk" }
          }
        }
      }
    },

    lamb: {
      displayName: "Lamb",
      primals: {
        rack: {
          displayName: "Rack",
          conflictGroup: "rack_allocation",
          choices: [
            {
              id: "whole_rack",
              name: "Whole Rack of Lamb",
              type: "roast",
              excludes: ["rib_chops", "lamb_lollipops", "crown_roast"],
              parameters: {
                frenched: { type: "boolean", default: true }
              }
            },
            {
              id: "rib_chops",
              name: "Rib Chops (Cutlets)",
              type: "chop",
              excludes: ["whole_rack", "crown_roast"],
              parameters: {
                perPackage: { options: [2, 4], default: 4 },
                frenched: { type: "boolean", default: true }
              }
            },
            {
              id: "lamb_lollipops",
              name: "Lamb Lollipops (French-trimmed chops)",
              type: "chop",
              excludes: ["whole_rack", "rib_chops"]
            },
            {
              id: "crown_roast",
              name: "Crown Roast",
              type: "roast",
              excludes: ["whole_rack", "rib_chops"],
              note: "Uses both racks tied together"
            }
          ]
        },

        loin: {
          displayName: "Loin",
          conflictGroup: "loin_allocation",
          choices: [
            {
              id: "loin_chops",
              name: "Loin Chops (Lamb T-Bones)",
              type: "chop",
              excludes: ["loin_roast", "saddle"],
              parameters: {
                thickness: { options: [0.75, 1, 1.25], default: 1, unit: "inches" },
                perPackage: { options: [2, 4], default: 4 }
              }
            },
            {
              id: "loin_roast",
              name: "Boneless Loin Roast",
              type: "roast",
              excludes: ["loin_chops", "saddle"]
            },
            {
              id: "saddle",
              name: "Saddle (Bone-in Loin Roast)",
              type: "roast",
              excludes: ["loin_chops", "loin_roast"]
            }
          ]
        },

        leg: {
          displayName: "Leg",
          conflictGroup: "leg_allocation",
          choices: [
            {
              id: "whole_leg",
              name: "Whole Leg Roast (Bone-in)",
              type: "roast",
              excludes: ["butterflied_leg", "leg_steaks"]
            },
            {
              id: "butterflied_leg",
              name: "Butterflied Leg (Boneless)",
              type: "roast",
              excludes: ["whole_leg"]
            },
            {
              id: "leg_steaks",
              name: "Leg Steaks",
              type: "steak",
              reducesYield: "leg"
            },
            {
              id: "boneless_leg_roast",
              name: "Boneless Leg Roast (Rolled/Tied)",
              type: "roast",
              excludes: ["whole_leg"]
            }
          ]
        },

        shoulder: {
          displayName: "Shoulder",
          allowSplit: true,
          choices: [
            {
              id: "shoulder_roast",
              name: "Whole Shoulder Roast",
              type: "roast",
              conflictsWith: ["shoulder_chops"]
            },
            {
              id: "shoulder_chops",
              name: "Shoulder Chops (Blade/Arm)",
              type: "chop",
              conflictsWith: ["shoulder_roast"]
            },
            {
              id: "lamb_stew",
              name: "Stew Meat (Cubed)",
              type: "cubed"
            },
            {
              id: "lamb_ground",
              name: "Ground Lamb",
              type: "ground"
            }
          ]
        },

        breast: {
          displayName: "Breast/Shank",
          choices: [
            { id: "denver_ribs", name: "Denver Ribs", type: "ribs" },
            { id: "riblets", name: "Riblets", type: "ribs" },
            { id: "foreshank", name: "Foreshanks", type: "shank" },
            { id: "breast_ground", name: "Ground", type: "ground" }
          ]
        }
      },

      groundOptions: {
        parameters: {
          packageSize: { options: [1, 2], default: 1, unit: "lbs" }
        }
      }
    },

    goat: {
      displayName: "Goat",
      note: "Goat follows similar structure to lamb",
      primals: {
        rack: {
          displayName: "Rack",
          conflictGroup: "rack_allocation",
          choices: [
            {
              id: "whole_rack",
              name: "Whole Rack of Goat",
              type: "roast",
              excludes: ["rib_chops"]
            },
            {
              id: "rib_chops",
              name: "Rib Chops",
              type: "chop",
              excludes: ["whole_rack"],
              parameters: {
                perPackage: { options: [2, 4], default: 4 }
              }
            }
          ]
        },

        loin: {
          displayName: "Loin",
          conflictGroup: "loin_allocation",
          choices: [
            {
              id: "loin_chops",
              name: "Loin Chops",
              type: "chop",
              excludes: ["loin_roast"],
              parameters: {
                thickness: { options: [0.75, 1], default: 1, unit: "inches" }
              }
            },
            {
              id: "loin_roast",
              name: "Loin/Saddle Roast",
              type: "roast",
              excludes: ["loin_chops"]
            }
          ]
        },

        leg: {
          displayName: "Leg",
          conflictGroup: "leg_allocation",
          choices: [
            {
              id: "whole_leg",
              name: "Whole Leg Roast",
              type: "roast",
              excludes: ["leg_steaks"],
              parameters: {
                boneIn: { type: "boolean", default: true }
              }
            },
            {
              id: "leg_steaks",
              name: "Leg Steaks",
              type: "steak",
              excludes: ["whole_leg"]
            }
          ]
        },

        shoulder: {
          displayName: "Shoulder",
          allowSplit: true,
          choices: [
            { id: "shoulder_roast", name: "Shoulder Roast", type: "roast" },
            { id: "shoulder_chops", name: "Shoulder Chops", type: "chop" },
            { id: "curry_meat", name: "Curry Meat (Cubed)", type: "cubed" },
            { id: "stew_meat", name: "Stew Meat", type: "cubed" },
            { id: "goat_ground", name: "Ground Goat", type: "ground" }
          ]
        },

        shank: {
          displayName: "Shank",
          choices: [
            { id: "osso_bucco", name: "Osso Bucco (Cross-cut)", type: "shank" },
            { id: "whole_shank", name: "Whole Shanks", type: "shank" }
          ]
        }
      },

      groundOptions: {
        parameters: {
          packageSize: { options: [1, 2], default: 1, unit: "lbs" }
        }
      }
    }
  },

  validationRules: {
    exclusiveChoice: "Only one option can be selected from this group",
    excludes: "Selecting this option disables the listed options",
    conflictsWith: "Can coexist but choosing more of one reduces the other",
    reducesYield: "This cut comes from the same area and reduces available quantity",
    requires: "These options must be selected together",
    independent: "This cut can be kept regardless of other choices in this primal"
  },

  processingOptions: {
    curing: {
      displayName: "Curing/Smoking",
      additionalFee: true,
      appliesTo: ["ham", "bacon", "corned_beef"]
    },
    tenderizing: {
      displayName: "Mechanical Tenderizing",
      additionalFee: true,
      appliesTo: ["cube_steak", "round_steak"]
    },
    sausage: {
      displayName: "Sausage Making",
      additionalFee: true,
      appliesTo: ["ground"]
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all cuts for an animal type, flattened from primals
 */
export function getAllCuts(animalType: AnimalType): CutChoice[] {
  const animal = CUT_SHEET_SCHEMA.animals[animalType]
  if (!animal) return []

  const cuts: CutChoice[] = []

  for (const primal of Object.values(animal.primals)) {
    cuts.push(...primal.choices)

    if (primal.subSections) {
      for (const subSection of Object.values(primal.subSections)) {
        cuts.push(...subSection.choices)
      }
    }
  }

  return cuts
}

/**
 * Get a specific cut by ID
 */
export function getCutById(animalType: AnimalType, cutId: string): CutChoice | null {
  const cuts = getAllCuts(animalType)
  return cuts.find(c => c.id === cutId) || null
}

/**
 * Get primal info for a cut
 */
export function getPrimalForCut(animalType: AnimalType, cutId: string): { primal: Primal; subSection?: Primal } | null {
  const animal = CUT_SHEET_SCHEMA.animals[animalType]
  if (!animal) return null

  for (const primal of Object.values(animal.primals)) {
    if (primal.choices.some(c => c.id === cutId)) {
      return { primal }
    }

    if (primal.subSections) {
      for (const subSection of Object.values(primal.subSections)) {
        if (subSection.choices.some(c => c.id === cutId)) {
          return { primal, subSection }
        }
      }
    }
  }

  return null
}
