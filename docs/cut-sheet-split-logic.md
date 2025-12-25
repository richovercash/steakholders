# Cut Sheet Split Allocation Logic

## Overview

When a producer fills out a cut sheet, they specify how they want their animal processed. Some cuts come from the same primal (anatomical region) and compete for the same meat. This document explains how the split allocation system works.

## Core Concepts

### Primals
A primal is a major section of the animal (e.g., Rib, Loin, Chuck). Each primal contains multiple possible cuts.

### Cut Relationships

Cuts can have different types of relationships:

| Relationship | Description | Example |
|-------------|-------------|---------|
| `exclusiveChoice` | Only ONE cut can be selected from this primal | T-bone vs Porterhouse (can't have both) |
| `conflictsWith` | These cuts cannot be selected together | Ribeye steaks conflict with Prime Rib roast |
| `allowSplit` | Multiple cuts CAN be selected, but must share the primal's meat | 50% ribeye, 50% prime rib |

### Current Schema Examples

```typescript
// Exclusive - only one choice allowed
loin: {
  displayName: "Loin",
  exclusiveChoice: true,  // Radio button behavior
  choices: [
    { id: "tbone", name: "T-Bone Steaks" },
    { id: "porterhouse", name: "Porterhouse Steaks" },
    { id: "nystrip", name: "NY Strip + Filet Mignon" }
  ]
}

// Allow Split - multiple choices can share the primal
rib: {
  displayName: "Rib",
  allowSplit: true,  // Can combine with percentage allocation
  choices: [
    { id: "ribeye", name: "Rib-Eye Steaks", conflictsWith: ["primerib"] },
    { id: "primerib", name: "Prime Rib Roast", conflictsWith: ["ribeye"] }
  ]
}
```

## Current Split Allocation Implementation

### State Structure

```typescript
interface PrimalCutSheetState {
  // ... other fields
  splitAllocations: {
    [primalId: string]: {
      [cutId: string]: number  // percentage (0-100)
    }
  }
}

// Example:
{
  splitAllocations: {
    rib: {
      ribeye: 50,
      primerib: 50
    }
  }
}
```

### UI Behavior

1. **Single cut selected**: No split UI shown, 100% goes to that cut
2. **Two cuts selected**: Split allocation UI appears with sliders
3. **Validation**: Allocations must total 100% before saving

### Auto-Initialization

When a second cut is added to an `allowSplit` primal:
- System auto-sets even split (50/50 for 2 cuts, 33/33/34 for 3 cuts, etc.)
- User can then adjust with sliders

## Proposed Simplification

### Limit to 2 Selections Max

For MVP, limit `allowSplit` primals to maximum 2 concurrent selections:
- Simplifies UI (single slider axis)
- Clearer for producers to understand
- Matches most real-world use cases

### Slider Increments

Instead of fine-grained percentages:
- Use 25% increments: 0%, 25%, 50%, 75%, 100%
- This maps to common requests: "all", "most", "half", "some", "none"

### Axis-Based UI (Recommended)

For exactly 2 selections, use a single slider axis:

```
Ribeye Steaks ◄━━━━━━━━━━━●━━━━━━━━━━► Prime Rib Roast
     0%      25%     50%     75%    100%
```

Moving the slider left gives more to ribeye, right gives more to prime rib.

## Questions for Review

1. **Should we allow more than 2 selections per primal?**
   - Current: No limit (but validation requires 100% total)
   - Proposed: Limit to 2 selections max for simplicity

2. **What increment should splits use?**
   - Current: 1% increments (0-100)
   - Proposed: 25% increments (0, 25, 50, 75, 100)

3. **How should the UI handle the "other" allocation?**
   - Current: Independent sliders for each cut
   - Proposed: Single axis slider (cut A ↔ cut B)

4. **What happens to the remainder if neither gets 100%?**
   - Current: Validation error if total ≠ 100%
   - Alternative: Remainder goes to ground meat automatically?

## Technical Notes

### Files Involved

- `src/lib/cut-sheet-schema.ts` - Defines primals and cut relationships
- `src/lib/cut-sheet-validation.ts` - Validates cut selections
- `src/components/cutsheet/PrimalCutSheetBuilder.tsx` - Main UI component
- `src/lib/cut-sheet-filter.ts` - Filters cuts based on processor config

### Key Functions

```typescript
// Check if cuts can be selected together
getCutAvailability(animalType, selectedCuts)

// Validate current selections
validateCutSheet(animalType, selectedCuts)

// Get what would be disabled by selecting a cut
getWouldDisable(animalType, cutId)
```

## Example Workflow

1. Producer selects "Beef" animal type
2. Opens "Rib" primal section
3. Selects "Rib-Eye Steaks" (100% allocation by default)
4. Also selects "Prime Rib Roast"
5. Split UI appears with 50/50 default
6. Producer adjusts slider to 75% ribeye / 25% prime rib
7. Saves cut sheet

## Database Storage

Split allocations are stored in the cut sheet record:
- `cut_sheet_items` table contains each selected cut
- `split_percentage` column (to be added) stores the allocation
- Processor sees: "Rib: 75% Ribeye Steaks, 25% Prime Rib Roast"
