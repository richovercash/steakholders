/**
 * Tests for Cut Sheet Validation Engine
 *
 * Covers all validation rule types:
 * - exclusiveChoice: Radio button behavior
 * - excludes: Hard conflicts (T-bone conflict)
 * - conflictsWith: Soft conflicts (yield warnings)
 * - reducesYield: Yield reduction warnings
 * - requires: Required pairs (NY Strip + Filet)
 * - independent: Always available cuts
 */

import { describe, it, expect } from 'vitest'
import {
  validateCutSheet,
  getCutAvailability,
  getWouldDisable,
  canAddCut,
  getRequiredCuts,
  normalizeSelections,
  type CutSelection,
} from '../cut-sheet-validation'

describe('validateCutSheet', () => {
  describe('T-Bone Conflict (excludes)', () => {
    it('should pass with T-Bone only', () => {
      const selections: CutSelection[] = [{ cutId: 'tbone' }]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when T-Bone and NY Strip are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'tbone' },
        { cutId: 'nystrip' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(1)
      // Multiple errors: T-bone excludes NY Strip, NY Strip excludes T-bone, NY Strip requires Filet
      expect(result.errors.some(e => e.type === 'excludes')).toBe(true)
      expect(result.errors.some(e => e.cutId === 'tbone' && e.conflictingCutId === 'nystrip')).toBe(true)
    })

    it('should fail when T-Bone and Filet are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'tbone' },
        { cutId: 'filet' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.conflictingCutId === 'filet')).toBe(true)
    })

    it('should fail when Porterhouse and NY Strip are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'porterhouse' },
        { cutId: 'nystrip' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(false)
    })
  })

  describe('Required pairs (requires)', () => {
    it('should fail when NY Strip is selected without Filet', () => {
      const selections: CutSelection[] = [{ cutId: 'nystrip' }]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'requires')).toBe(true)
      expect(result.errors.some(e =>
        e.cutId === 'nystrip' && e.conflictingCutId === 'filet'
      )).toBe(true)
    })

    it('should pass when NY Strip and Filet are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'nystrip' },
        { cutId: 'filet' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Exclusive choice (exclusiveChoice)', () => {
    it('should fail when multiple brisket options are selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'whole_brisket' },
        { cutId: 'split_brisket' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'exclusiveChoice')).toBe(true)
    })

    it('should fail when multiple top round options are selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'top_round_steak' },
        { cutId: 'london_broil' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'exclusiveChoice')).toBe(true)
    })

    it('should pass with one option from each subsection', () => {
      const selections: CutSelection[] = [
        { cutId: 'top_round_steak' },
        { cutId: 'bottom_round_roast' },
        { cutId: 'eye_round_roast' },
        { cutId: 'sirloin_tip_steak' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(true)
    })
  })

  describe('Soft conflicts (conflictsWith)', () => {
    it('should warn when ribeye and prime rib are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'ribeye' },
        { cutId: 'primerib' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(true) // Warnings don't fail validation
      expect(result.warnings.some(w => w.type === 'conflictsWith')).toBe(true)
      expect(result.warnings.some(w =>
        w.cutId === 'ribeye' && w.affectedCutId === 'primerib'
      )).toBe(true)
    })

    it('should warn when pork chops and loin roast are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'pork_chops' },
        { cutId: 'loin_roast' }
      ]
      const result = validateCutSheet('pork', selections)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.type === 'conflictsWith')).toBe(true)
    })
  })

  describe('Yield reduction (reducesYield)', () => {
    it('should warn when tri-tip and sirloin steak are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'tritip' },
        { cutId: 'sirloin_steak' }
      ]
      const result = validateCutSheet('beef', selections)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.type === 'reducesYield')).toBe(true)
    })
  })

  describe('Disabled options', () => {
    it('should list NY Strip as disabled when T-Bone is selected', () => {
      const selections: CutSelection[] = [{ cutId: 'tbone' }]
      const result = validateCutSheet('beef', selections)

      expect(result.disabledOptions.some(d => d.cutId === 'nystrip')).toBe(true)
      expect(result.disabledOptions.some(d => d.cutId === 'filet')).toBe(true)
      expect(result.disabledOptions.some(d => d.cutId === 'porterhouse')).toBe(true)
    })

    it('should list other brisket options as disabled when one is selected', () => {
      const selections: CutSelection[] = [{ cutId: 'whole_brisket' }]
      const result = validateCutSheet('beef', selections)

      expect(result.disabledOptions.some(d => d.cutId === 'split_brisket')).toBe(true)
      expect(result.disabledOptions.some(d => d.cutId === 'corned_beef')).toBe(true)
    })
  })

  describe('Pork constraints', () => {
    it('should fail when bacon and fresh belly are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'bacon' },
        { cutId: 'fresh_belly' }
      ]
      const result = validateCutSheet('pork', selections)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'excludes')).toBe(true)
    })

    it('should fail when fresh ham and cured ham are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'fresh_ham' },
        { cutId: 'cured_ham' }
      ]
      const result = validateCutSheet('pork', selections)

      expect(result.isValid).toBe(false)
    })

    it('should allow tenderloin with any loin option (independent)', () => {
      const selections: CutSelection[] = [
        { cutId: 'loin_roast_whole' },
        { cutId: 'tenderloin' }
      ]
      const result = validateCutSheet('pork', selections)

      expect(result.isValid).toBe(true)
    })
  })

  describe('Lamb constraints', () => {
    it('should fail when whole rack and rib chops are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'whole_rack' },
        { cutId: 'rib_chops' }
      ]
      const result = validateCutSheet('lamb', selections)

      expect(result.isValid).toBe(false)
    })

    it('should fail when loin chops and saddle are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'loin_chops' },
        { cutId: 'saddle' }
      ]
      const result = validateCutSheet('lamb', selections)

      expect(result.isValid).toBe(false)
    })
  })

  describe('Goat constraints', () => {
    it('should fail when whole leg and leg steaks are both selected', () => {
      const selections: CutSelection[] = [
        { cutId: 'whole_leg' },
        { cutId: 'leg_steaks' }
      ]
      const result = validateCutSheet('goat', selections)

      expect(result.isValid).toBe(false)
    })
  })
})

describe('getCutAvailability', () => {
  it('should return all cuts as available with no selections', () => {
    const availability = getCutAvailability('beef', [])

    expect(availability.every(a => a.available)).toBe(true)
  })

  it('should mark conflicting cuts as unavailable', () => {
    const availability = getCutAvailability('beef', [{ cutId: 'tbone' }])

    const nystrip = availability.find(a => a.cutId === 'nystrip')
    expect(nystrip?.available).toBe(false)
    expect(nystrip?.reason).toContain('T-Bone')

    const filet = availability.find(a => a.cutId === 'filet')
    expect(filet?.available).toBe(false)

    // Ribeye should still be available
    const ribeye = availability.find(a => a.cutId === 'ribeye')
    expect(ribeye?.available).toBe(true)
  })

  it('should mark exclusive choice options as unavailable', () => {
    const availability = getCutAvailability('beef', [{ cutId: 'whole_brisket' }])

    const split = availability.find(a => a.cutId === 'split_brisket')
    expect(split?.available).toBe(false)
  })
})

describe('getWouldDisable', () => {
  it('should return cuts that would be disabled by T-Bone', () => {
    const wouldDisable = getWouldDisable('beef', 'tbone')

    expect(wouldDisable.some(d => d.cutId === 'nystrip')).toBe(true)
    expect(wouldDisable.some(d => d.cutId === 'filet')).toBe(true)
    expect(wouldDisable.some(d => d.cutId === 'porterhouse')).toBe(true)
  })

  it('should return exclusive choice options for brisket', () => {
    const wouldDisable = getWouldDisable('beef', 'whole_brisket')

    expect(wouldDisable.some(d => d.cutId === 'split_brisket')).toBe(true)
    expect(wouldDisable.some(d => d.cutId === 'corned_beef')).toBe(true)
    expect(wouldDisable.some(d => d.cutId === 'brisket_ground')).toBe(true)
  })
})

describe('canAddCut', () => {
  it('should allow adding cut with no conflicts', () => {
    const result = canAddCut('beef', 'ribeye', [])

    expect(result.allowed).toBe(true)
  })

  it('should disallow adding NY Strip when T-Bone is selected', () => {
    const result = canAddCut('beef', 'nystrip', [{ cutId: 'tbone' }])

    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('should allow adding ribeye when T-Bone is selected (different primal)', () => {
    const result = canAddCut('beef', 'ribeye', [{ cutId: 'tbone' }])

    expect(result.allowed).toBe(true)
  })
})

describe('getRequiredCuts', () => {
  it('should return filet as required for NY Strip', () => {
    const required = getRequiredCuts('beef', 'nystrip')

    expect(required).toHaveLength(1)
    expect(required[0].id).toBe('filet')
  })

  it('should return NY Strip as required for filet', () => {
    const required = getRequiredCuts('beef', 'filet')

    expect(required).toHaveLength(1)
    expect(required[0].id).toBe('nystrip')
  })

  it('should return empty array for cuts without requirements', () => {
    const required = getRequiredCuts('beef', 'ribeye')

    expect(required).toHaveLength(0)
  })
})

describe('normalizeSelections', () => {
  it('should add required cuts automatically', () => {
    const result = normalizeSelections('beef', [{ cutId: 'nystrip' }])

    expect(result.added).toContain('filet')
    expect(result.selections.some(s => s.cutId === 'filet')).toBe(true)
    expect(result.messages.some(m => m.includes('Added'))).toBe(true)
  })

  it('should remove conflicting cuts (keep earlier selection)', () => {
    const result = normalizeSelections('beef', [
      { cutId: 'tbone' },
      { cutId: 'nystrip' }
    ])

    expect(result.removed).toContain('nystrip')
    expect(result.selections.some(s => s.cutId === 'tbone')).toBe(true)
    expect(result.selections.some(s => s.cutId === 'nystrip')).toBe(false)
  })

  it('should handle complex chains correctly', () => {
    // T-bone selected first, then try to add NY Strip + Filet
    const result = normalizeSelections('beef', [
      { cutId: 'tbone' },
      { cutId: 'nystrip' },
      { cutId: 'filet' }
    ])

    // Should keep T-bone, remove both NY Strip and Filet
    expect(result.selections.some(s => s.cutId === 'tbone')).toBe(true)
    expect(result.removed).toContain('nystrip')
    expect(result.removed).toContain('filet')
  })

  it('should return unchanged selections when valid', () => {
    const result = normalizeSelections('beef', [
      { cutId: 'ribeye' },
      { cutId: 'chuck_roast' }
    ])

    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.selections).toHaveLength(2)
  })
})

describe('Edge cases', () => {
  it('should handle empty selections', () => {
    const result = validateCutSheet('beef', [])

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should handle invalid animal type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateCutSheet('invalid' as any, [])

    expect(result.isValid).toBe(false)
  })

  it('should handle unknown cut IDs gracefully', () => {
    const result = validateCutSheet('beef', [{ cutId: 'unknown_cut' }])

    // Should not throw, just skip unknown cuts
    expect(result).toBeDefined()
  })
})
