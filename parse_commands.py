#!/usr/bin/env python3
"""
AGENT 1: Parse slash commands and generate API surface documentation
"""
import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

COMMANDS_DIR = Path(r"C:\automation_core\claude\commands")

def parse_command_file(filepath: Path) -> Dict[str, Any]:
    """Parse a single command markdown file"""
    content = filepath.read_text(encoding='utf-8')

    # Extract command name from filename
    cmd_name = filepath.stem

    # Extract title (first # heading)
    title_match = re.search(r'^#\s+(/[\w-]+)', content, re.MULTILINE)
    title = title_match.group(1) if title_match else f"/{cmd_name}"

    # Extract purpose section
    purpose_match = re.search(r'Purpose:(.*?)(?=\n#|\n\n[A-Z]|$)', content, re.DOTALL)
    purpose = purpose_match.group(1).strip() if purpose_match else ""

    # Extract what to run / usage section
    usage_match = re.search(r'(?:What to run:|Usage:|## Usage)(.*?)(?=\n#|$)', content, re.DOTALL)
    usage = usage_match.group(1).strip() if usage_match else ""

    # Extract parameters from code blocks or bullet points
    params = []
    param_matches = re.findall(r'--?([\w-]+)(?:\s+[<\[]?(\w+)[>\]]?)?(?:\s+-\s+(.+))?', content)
    for param_name, param_type, param_desc in param_matches:
        if param_name and not param_name.startswith('python'):
            params.append({
                'name': param_name,
                'type': param_type or 'string',
                'description': param_desc.strip() if param_desc else ''
            })

    # Detect dependencies (mentions of other commands)
    dependencies = []
    dep_matches = re.findall(r'/[\w-]+', content)
    for dep in dep_matches:
        if dep != title and dep not in dependencies:
            dependencies.append(dep)

    # Categorize by keywords
    categories = []
    if any(kw in content.lower() for kw in ['evolution', 'fitness', 'generation']):
        categories.append('evolution')
    if any(kw in content.lower() for kw in ['test', 'e2e', 'smoke', 'playwright']):
        categories.append('testing')
    if any(kw in content.lower() for kw in ['security', 'audit', 'threat']):
        categories.append('security')
    if any(kw in content.lower() for kw in ['orchestrate', 'chain', 'multi', 'swarm']):
        categories.append('orchestration')
    if any(kw in content.lower() for kw in ['rag', 'index', 'search', 'query']):
        categories.append('knowledge')
    if any(kw in content.lower() for kw in ['deploy', 'production', 'health', 'monitoring']):
        categories.append('operations')
    if any(kw in content.lower() for kw in ['abyssal', 'template', 'spawn']):
        categories.append('templates')
    if any(kw in content.lower() for kw in ['think', 'reason', 'cognitive', 'consciousness']):
        categories.append('cognition')

    if not categories:
        categories.append('utility')

    return {
        'name': title,
        'filename': cmd_name,
        'purpose': purpose,
        'usage': usage,
        'parameters': params,
        'dependencies': dependencies,
        'categories': categories,
        'file_path': str(filepath)
    }

def build_dependency_graph(commands: List[Dict]) -> Dict[str, List[str]]:
    """Build command dependency graph"""
    graph = defaultdict(list)
    cmd_names = {cmd['name'] for cmd in commands}

    for cmd in commands:
        for dep in cmd['dependencies']:
            if dep in cmd_names:
                graph[cmd['name']].append(dep)

    return dict(graph)

def build_taxonomy(commands: List[Dict]) -> Dict[str, List[str]]:
    """Build command taxonomy by category"""
    taxonomy = defaultdict(list)

    for cmd in commands:
        for category in cmd['categories']:
            taxonomy[category].append(cmd['name'])

    return dict(taxonomy)

def generate_api_surface_md(commands: List[Dict], taxonomy: Dict, dep_graph: Dict) -> str:
    """Generate API_SURFACE.md"""
    md = []
    md.append("# Claude Automation Core - API Surface\n")
    md.append("Complete command reference for all 80+ slash commands\n")
    md.append(f"**Total Commands:** {len(commands)}\n")

    md.append("\n## Command Taxonomy\n")
    for category, cmds in sorted(taxonomy.items()):
        md.append(f"\n### {category.title()} ({len(cmds)} commands)\n")
        for cmd in sorted(cmds):
            md.append(f"- `{cmd}`\n")

    md.append("\n## Command Reference\n")
    for cmd in sorted(commands, key=lambda x: x['name']):
        md.append(f"\n### {cmd['name']}\n")
        md.append(f"**Category:** {', '.join(cmd['categories'])}\n\n")

        if cmd['purpose']:
            md.append(f"**Purpose:**\n{cmd['purpose']}\n\n")

        if cmd['parameters']:
            md.append("**Parameters:**\n")
            for param in cmd['parameters']:
                desc = f" - {param['description']}" if param['description'] else ""
                md.append(f"- `--{param['name']}` ({param['type']}){desc}\n")
            md.append("\n")

        if cmd['name'] in dep_graph and dep_graph[cmd['name']]:
            md.append(f"**Dependencies:** {', '.join(f'`{d}`' for d in dep_graph[cmd['name']])}\n\n")

        if cmd['usage']:
            md.append(f"**Usage:**\n```bash\n{cmd['usage']}\n```\n\n")

    md.append("\n## Dependency Graph\n")
    md.append("```\n")
    for cmd, deps in sorted(dep_graph.items()):
        if deps:
            md.append(f"{cmd}\n")
            for dep in deps:
                md.append(f"  -> {dep}\n")
    md.append("```\n")

    return ''.join(md)

def update_elite_skills_registry(commands: List[Dict], taxonomy: Dict) -> str:
    """Generate updated ELITE_SKILLS_REGISTRY.md section"""
    md = []
    md.append("# Elite Skills Registry - Command Catalog\n")
    md.append(f"**Last Updated:** Auto-generated by AGENT 1\n")
    md.append(f"**Total Commands:** {len(commands)}\n")

    md.append("\n## Quick Reference by Category\n")
    for category, cmds in sorted(taxonomy.items()):
        md.append(f"\n### {category.title()}\n")
        for cmd in sorted(cmds):
            cmd_data = next((c for c in commands if c['name'] == cmd), None)
            if cmd_data and cmd_data['purpose']:
                # Get first line of purpose
                first_line = cmd_data['purpose'].split('\n')[0].strip('- ').strip()
                md.append(f"- `{cmd}` - {first_line}\n")
            else:
                md.append(f"- `{cmd}`\n")

    return ''.join(md)

def main():
    print("AGENT 1: Parsing slash commands...")

    # Parse all command files
    commands = []
    for filepath in sorted(COMMANDS_DIR.glob("*.md")):
        try:
            cmd_data = parse_command_file(filepath)
            commands.append(cmd_data)
            print(f"  [OK] Parsed {cmd_data['name']}")
        except Exception as e:
            print(f"  [FAIL] Failed to parse {filepath.name}: {e}")

    print(f"\nTotal commands parsed: {len(commands)}")

    # Build dependency graph
    print("\nBuilding dependency graph...")
    dep_graph = build_dependency_graph(commands)
    print(f"  [OK] Found {len(dep_graph)} commands with dependencies")

    # Build taxonomy
    print("\nBuilding command taxonomy...")
    taxonomy = build_taxonomy(commands)
    print(f"  [OK] Categorized into {len(taxonomy)} categories")
    for category, cmds in sorted(taxonomy.items()):
        print(f"    - {category}: {len(cmds)} commands")

    # Generate API_SURFACE.md
    print("\nGenerating API_SURFACE.md...")
    api_surface = generate_api_surface_md(commands, taxonomy, dep_graph)
    output_path = Path(r"C:\Users\Ouroboros\Desktop\portflio-agent1\docs\API_SURFACE.md")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(api_surface, encoding='utf-8')
    print(f"  [OK] Written to {output_path}")

    # Update ELITE_SKILLS_REGISTRY.md
    print("\nGenerating ELITE_SKILLS_REGISTRY.md...")
    registry = update_elite_skills_registry(commands, taxonomy)
    registry_path = Path(r"C:\Users\Ouroboros\Desktop\portflio-agent1\docs\ELITE_SKILLS_REGISTRY.md")
    registry_path.write_text(registry, encoding='utf-8')
    print(f"  [OK] Written to {registry_path}")

    # Export structured data
    print("\nExporting structured data...")
    data_path = Path(r"C:\Users\Ouroboros\Desktop\portflio-agent1\docs\commands_data.json")
    data_path.write_text(json.dumps({
        'commands': commands,
        'taxonomy': taxonomy,
        'dependency_graph': dep_graph,
        'stats': {
            'total_commands': len(commands),
            'total_categories': len(taxonomy),
            'commands_with_dependencies': len(dep_graph),
            'commands_with_parameters': sum(1 for c in commands if c['parameters'])
        }
    }, indent=2), encoding='utf-8')
    print(f"  [OK] Written to {data_path}")

    print("\n[COMPLETE] AGENT 1")
    print(f"  - {len(commands)} commands parsed")
    print(f"  - {len(taxonomy)} categories")
    print(f"  - {len(dep_graph)} dependency relationships")

if __name__ == '__main__':
    main()
