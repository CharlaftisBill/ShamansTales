# Skirmish Faction Analyzer

The Faction Analyzer is a Python CLI utility designed to calculate statistical distributions and balance metrics across the Skirmish `decks.json` payload. It computes average stats (Cost, Influence, Amplifier) and percentage distribution counts (Cost tiers, Fighting Classes) to ensure each faction strictly adheres to its designed archetype.

## Location
The script is located at:
`assets/tools/analyze.py`

## Usage

The script is entirely read-only and non-destructive; it will **never** overwrite or alter your source data. To run the analysis, you must explicitly pass the path to your source JSON and the desired path for the output markdown report.

```bash
python3 assets/tools/analyze.py --input data/decks.json --output analysis_report.md
```

### Arguments
- `--input` (required): Absolute or relative path to the source `decks.json` file.
- `--output` (required): Absolute or relative path to write the generated markdown report.

### Error Handling
- If the target JSON file contains syntax errors (e.g., a missing comma from manual edits), the script will cleanly exit and print the specific JSON parsing error to the terminal.
- If you forget to provide an `--input` or `--output` path, it will prompt you with the required flags.

### Output
The resulting markdown artifact includes:
1. **Core Averages**: A unified table comparing Average Cost, Influence, and Amplifier across all four factions.
2. **Cost Distribution**: A percentage breakdown of the cost curve per faction.
3. **Fighting Class Distribution**: A percentage breakdown of the class representation per faction.
