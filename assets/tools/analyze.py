import argparse
import json
import sys
from collections import Counter

def main():
    parser = argparse.ArgumentParser(description="Analyze Skirmish factions from JSON payload.")
    parser.add_argument('--input', required=True, help="Path to the decks.json file")
    parser.add_argument('--output', required=True, help="Path to write the markdown report")
    
    args = parser.parse_args()
    
    try:
        with open(args.input, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {args.input}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Malformed JSON in {args.input}: {e}", file=sys.stderr)
        sys.exit(1)
        
    try:
        report_lines = [
            "# Faction Statistical Analysis\n",
            "This report details the distribution metrics for Skirmish decks.\n",
            "## 📊 Core Averages\n",
            "| Faction | Avg Cost | Avg Influence | Avg Amplifier |",
            "| :--- | :--- | :--- | :--- |"
        ]
        
        distributions = {}
        
        for faction, cards in data.items():
            if not cards:
                continue
                
            total_cards = len(cards)
            avg_cost = sum(c['cost'] for c in cards) / total_cards
            avg_inf = sum(c['influence'] for c in cards) / total_cards
            avg_amp = sum(c['fcAmplifier'] for c in cards) / total_cards
            
            report_lines.append(f"| **{faction}** | {avg_cost:.2f} | {avg_inf:.2f} | {avg_amp:.2f} |")
            
            costs = Counter(c['cost'] for c in cards)
            classes = Counter(c['fightingClass'] for c in cards)
            
            distributions[faction] = {
                'total': total_cards,
                'costs': costs,
                'classes': classes
            }
            
        report_lines.append("\n---\n")
        report_lines.append("## 📈 Cost Distribution\n")
        
        # Build dynamic cost table
        all_costs = set()
        for f in distributions.values():
            all_costs.update(f['costs'].keys())
        sorted_costs = sorted(list(all_costs))
        
        factions = list(distributions.keys())
        header = "| Cost | " + " | ".join(factions) + " |"
        separator = "| :---: | " + " | ".join([":---:"] * len(factions)) + " |"
        report_lines.extend([header, separator])
        
        for cost in sorted_costs:
            row = [f"**{cost}**"]
            for f in factions:
                count = distributions[f]['costs'].get(cost, 0)
                pct = count / distributions[f]['total'] * 100
                row.append(f"{pct:.1f}%")
            report_lines.append("| " + " | ".join(row) + " |")
            
        report_lines.append("\n---\n")
        report_lines.append("## ⚔️ Fighting Class Distribution\n")
        
        for faction in factions:
            report_lines.append(f"### {faction}")
            total = distributions[faction]['total']
            classes = distributions[faction]['classes']
            for cls, count in sorted(classes.items(), key=lambda x: -x[1]):
                pct = count / total * 100
                report_lines.append(f"- **{cls}:** {pct:.1f}%")
            report_lines.append("")
            
        with open(args.output, 'w') as f:
            f.write("\n".join(report_lines))
            
        print(f"Success! Analysis written to: {args.output}")
        
    except KeyError as e:
        missing_key = e.args[0]
        for faction, cards in data.items():
            for c in cards:
                if missing_key not in c:
                    print(f"Error: Missing key '{missing_key}' in faction '{faction}' for card ID '{c.get('id', 'Unknown')}' ({c.get('name', 'Unknown')}).", file=sys.stderr)
                    sys.exit(1)
        print(f"Error processing JSON structure. Missing key: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
