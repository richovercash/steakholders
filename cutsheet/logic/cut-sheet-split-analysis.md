# Cut Sheet Split Allocation Analysis

## For Steakholders Platform Development

---

## Part 1: Real-World Split Selection Frequency

### Question
How often do butchers take more than two cut selections from the same primal part when each selection reduces the availability of making the other cut?

### Answer
**Almost never. Two selections max is the real-world standard.**

---

### Primals That Are Strictly Exclusive (Pick ONE)

These don't even allow splits - it's radio button behavior:

| Primal | Why Only One |
|--------|--------------|
| **Short Loin** | T-bone vs Porterhouse vs (NY Strip + Filet) - physically impossible to do more than one |
| **Lamb/Goat Rack** | Whole rack vs Chops vs Crown roast - you're either cutting it or keeping it whole |
| **Lamb/Goat Loin** | Loin chops vs Saddle roast - same logic |
| **Pork Ham** | Fresh vs Cured - it's a processing decision, not a split |
| **Pork Belly** | Bacon vs Fresh belly - same, processing decision |

---

### Primals That Allow a 2-Way Split

These are the ONLY ones where splitting occurs, and it's always between exactly 2 options:

| Primal | Split Between | Typical Request |
|--------|---------------|-----------------|
| **Rib** | Ribeye Steaks ↔ Prime Rib Roast | "Half and half" or "6 steaks, 1 small roast" |
| **Chuck** | Chuck Roasts ↔ Chuck Steaks | Usually all roasts OR all steaks, rarely split |
| **Sirloin** | Sirloin Steaks ↔ Tri-tip | Keep tri-tip whole, rest as steaks |

---

### Why 3+ Splits Don't Happen

1. **Physical reality**: Once you cut a ribeye steak, that meat is gone. You can't also make it into a roast AND ground beef from the same piece.

2. **Processor workflow**: Butchers work through each primal systematically. "How much as steaks, how much as roasts?" is the question. Not "give me 30% steaks, 25% roasts, 20% stew, 25% ground."

3. **What about ground/stew?** These typically come from:
   - Trim (fat, connective tissue scraps)
   - Explicitly designated primals ("grind the whole chuck")
   - NOT from splitting a primal 3+ ways

---

### Recommendation for Implementation

The proposed simplification is **correct for the real world**:

```typescript
// This is all you need:
allowSplit: true  // Max 2 selections
// OR
exclusiveChoice: true  // Max 1 selection
```

The 25% increment slider is also smart - matches how people actually think:
- "All ribeyes"
- "Mostly ribeyes, one small roast"  
- "Half and half"
- "Mostly roast, a few steaks"
- "All prime rib"

---

### Edge Case: Chuck Specialty Steaks

For Chuck specifically, some processors offer "specialty steaks" (Denver, Flat Iron) as a third option. But in practice, customers either get those OR traditional chuck cuts - not a 3-way split. Could be modeled as:

```typescript
chuck: {
  exclusiveChoice: true,  // Pick your style
  choices: [
    { id: "traditional", name: "Traditional (Roasts/Steaks)", allowSplit: true },
    { id: "specialty", name: "Specialty Steaks (Denver, Flat Iron)" },
    { id: "all_ground", name: "All Ground" }
  ]
}
```

But this might be over-complicating it for MVP. The 2-selection limit is solid.

---

---

## Part 2: Split Percentage vs Parameter Hierarchy

### Question
If I say 50/50 for a two-part split, will it override the selection for lbs of weight or steak thickness?

### Answer
**No, they work together, not override each other.**

---

### How the Hierarchy Works

```
┌─────────────────────────────────────────────────────────┐
│  1. SPLIT % determines HOW MUCH meat goes to each cut   │
│     (50% ribeye / 50% prime rib)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ RIBEYE (50%)    │       │ PRIME RIB (50%) │
│ ~10 lbs         │       │ ~10 lbs         │
└────────┬────────┘       └────────┬────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ 2. PARAMETERS   │       │ 2. PARAMETERS   │
│ • 1" thick      │       │ • Bone-in       │
│ • 2 per pack    │       │ • 4-5 lb roasts │
└────────┬────────┘       └────────┬────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ YIELD:          │       │ YIELD:          │
│ ~8-10 steaks    │       │ ~2 roasts       │
│ (4-5 packs)     │       │                 │
└─────────────────┘       └─────────────────┘
```

---

### Real Example

Say the hanging rib primal is **20 lbs** and producer selects:
- 50% Ribeye (1" thick, 2 per pack)
- 50% Prime Rib (bone-in, 4-5 lb roasts)

**Result:**
- ~10 lbs → Ribeyes → yields 8-10 steaks at 1" → 4-5 packs of 2
- ~10 lbs → Prime Rib → yields 2 roasts at ~5 lbs each

---

### Parameters Don't "Use Up" More Than Allocated

If someone says "I want 1.5 inch thick ribeyes" that doesn't eat into the prime rib allocation - it just means they get **fewer, thicker steaks** from their 50%.

| Thickness | Approx Yield from 10 lbs |
|-----------|-------------------------|
| 3/4"      | 12-14 steaks |
| 1"        | 8-10 steaks |
| 1.5"      | 6-7 steaks |
| 2"        | 4-5 steaks |

---

### What About Specific Quantities?

This is where it gets tricky. If a customer says:

> "I want exactly 12 ribeye steaks at 1.5" thick"

That might require **more** than 50% of the rib. Two design choices:

#### Option A: Split % is King (Recommended for MVP)
- Producer sets split %
- Parameters set style
- Yield is "whatever fits"
- Processor communicates approximate yields

#### Option B: Quantity-Based (More Complex)
- Producer specifies exact counts
- System calculates required split %
- Warns if impossible given animal size

**Most custom processors use Option A** because yield varies by animal. A 1200 lb steer has different primal weights than a 900 lb steer. The cut sheet is instructions, not a guaranteed shopping list.

---

### Suggested UI Language

```
Rib Section
├── Ribeye Steaks ◄────●────────► Prime Rib Roast
│        50%                   50%
│
├── Ribeye Options:
│   Thickness: [  1"  ▼]
│   Per Package: [ 2  ▼]
│   Estimated yield: 8-10 steaks
│
└── Prime Rib Options:
    Style: [Bone-in ▼]
    Roast Size: [4-5 lbs ▼]
    Estimated yield: 2 roasts
```

The "estimated yield" helps set expectations without promising exact counts.

---

## Summary

| Concept | Implementation |
|---------|----------------|
| Max selections per primal | **2** (for `allowSplit`) or **1** (for `exclusiveChoice`) |
| Split increments | **25%** (0, 25, 50, 75, 100) |
| Split UI | **Single axis slider** between two cuts |
| Parameters | **Per-cut**, applied AFTER split allocation |
| Yield display | **Estimated ranges**, not exact counts |
| Remainder handling | Validation requires 100% total allocation |

---

## Related Documents

- `cut_constraints.md` - Full cut conflict reference for all 4 animal types
- `cut_sheet_schema.json` - JSON schema for validation logic
- `cut-sheet-split-logic.md` - Original split allocation specification
