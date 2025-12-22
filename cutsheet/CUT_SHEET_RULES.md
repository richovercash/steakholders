# Cut Sheet Rules & Data Model
## Extracted from Form Analysis

Based on the analysis of `Steak_Holders_Form_Analysis.xlsx`, the following rules and data structures have been identified.

---

## Animal Types

| Animal | Unique Features |
|--------|-----------------|
| Beef | Most cut variety, T-Bone conflict rule |
| Pork | Sausage varieties, Ham/Shoulder slice vs roast options, Bacon/Belly |
| Lamb | Rack of Lamb, Shanks |
| Goat | Similar to Lamb, fewer cuts |

---

## Cut Categories

### 1. Steaks (Beef, Pork Chops, Lamb/Goat Chops)
**Parameters:**
- `thickness`: 1/2", 3/4", 1", 1 1/2", 2"
- `pieces_per_package`: 1, 2, 3, 4

**Beef Steaks:**
- Fillet / Filet Mignon
- NY Strip  
- T-Bone Steak ⚠️
- Rib Eye Steak
- Sirloin Steak
- Round Steak (Top/Bottom)
- Cubed Steak
- Flank Steak
- Skirt Steak

### 2. Roasts
**Parameters:**
- `weight`: 2, 3, 4, 5 lbs
- `pieces_per_package`: typically 1

**Beef Roasts:**
- Chuck Roast
- Arm Roast
- Sirloin Tip Roast
- Rump Roast
- Round Roast
- Brisket
- Prime Rib / Rib Roast

### 3. Ground Meat
**Parameters:**
- `package_weight`: 1, 2 lbs
- `type`: bulk, vacuum-packed, patties

**Options:**
- Ground (bulk)
- Vacuum Packed Ground
- Patties (1/4 lb, 1/3 lb)

### 4. Organs (Binary: Keep / Don't Keep)
- Liver
- Heart
- Tongue
- Kidneys
- Oxtail (beef)
- Bones (marrow, soup, dog)

---

## Validation Rules

### 1. T-Bone Conflict Rule (BEEF ONLY)
```
IF selected("T-Bone") THEN
    CANNOT select("NY Strip")
    CANNOT select("Fillet")
END IF
```

**Reason:** T-Bone steaks include portions of both the NY Strip and Fillet/Tenderloin. The primal section can only be cut one way.

### 2. Thickness Applies To
- All steaks
- Pork chops
- NOT roasts
- NOT ground meat
- NOT organs

### 3. Weight Applies To
- Roasts
- Ground meat packages
- NOT steaks (determined by thickness)
- NOT organs

### 4. Pork-Specific Options
- Sausage flavors (Hot, Medium, Mild, Sweet Italian, Chorizo, Bratwurst, Polish)
- Bacon vs Fresh Belly
- Ham: Sliced vs Roast
- Shoulder: Sliced vs Roast
- Fat Back / Lard fat
- Jowls

### 5. Required Fields by Cut Type

| Cut Type | Thickness | Weight | Pieces/Pkg | Pounds |
|----------|-----------|--------|------------|--------|
| Steak    | ✅        | ❌     | ✅         | ❌     |
| Roast    | ❌        | ✅     | ✅         | ❌     |
| Ground   | ❌        | ✅     | ❌         | ❌     |
| Sausage  | ❌        | ❌     | ❌         | ✅     |
| Organ    | ❌        | ❌     | ❌         | ❌     |

---

## Data Model (JSON Schema)

```json
{
  "cut_sheet": {
    "id": "uuid",
    "processing_order_id": "uuid",
    "animal_type": "beef|pork|lamb|goat",
    "hanging_weight": 642,
    "cuts": {
      "steaks": [
        {
          "cut_id": "ribeye",
          "name": "Rib Eye Steak",
          "thickness": "1\"",
          "pieces_per_package": 2,
          "quantity": null
        }
      ],
      "roasts": [
        {
          "cut_id": "chuck_roast",
          "name": "Chuck Roast",
          "weight_lbs": 3,
          "pieces_per_package": 1
        }
      ],
      "ground": {
        "type": "bulk|vacuum|patties",
        "package_weight_lbs": 2,
        "patty_size": "1/4|1/3"
      },
      "sausage": [
        {
          "flavor": "mild",
          "pounds": 10
        }
      ],
      "organs": {
        "liver": true,
        "heart": false,
        "tongue": false,
        "kidneys": false,
        "oxtail": false,
        "bones": true
      },
      "other": {
        "stew_meat": true,
        "short_ribs": true,
        "soup_bones": true
      }
    },
    "special_instructions": "Please cut ribeyes extra thick. Family prefers bone-in when possible.",
    "created_at": "2025-12-21T00:00:00Z",
    "updated_at": "2025-12-21T00:00:00Z"
  }
}
```

---

## Post-Processing Charges (from forms)

| Charge | Unit | Notes |
|--------|------|-------|
| Slaughter/Kill Fee | flat | Per animal |
| Processing | $/lb | Based on hanging weight |
| Vacuum Pack | $/lb | Optional upgrade |
| Patties | $/lb | Making patties |
| Casings | flat | For sausage |
| Seasonings | flat | For sausage |
| Storage | per day/week | If not picked up promptly |
| Boxes | per box | Packaging |

---

## UI/UX Recommendations

1. **Visual animal diagram** - Show primals, let users click to select
2. **Progress indicator** - Show completion % as cuts are selected
3. **Conflict warnings** - Highlight when T-Bone conflicts with Strip/Fillet
4. **"What others choose"** - Show popular selections (from original notes)
5. **Template saving** - Let producers reuse their preferred cut sheet
6. **Weight-based suggestions** - Estimate yields based on hanging weight
7. **Mobile-friendly** - Processors may need to reference on shop floor

---

## Estimated Yields (Beef)

| From Hanging Weight | Percentage |
|--------------------|------------|
| Take-home meat | 60-65% |
| Steaks | ~15% |
| Roasts | ~25% |
| Ground/Other | ~25% |
| Waste/Trim | 35-40% |

Example: 642 lb hanging weight → ~400 lbs take-home meat
