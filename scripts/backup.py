"""
Documentation generation utilities for project backup

Creates three documentation files:
- .claude/documentation/database-structure.txt: Complete SQLite schema
- .claude/documentation/folder-structure.txt: Project directory tree
- requirements.txt: Python package dependencies (project root)

DEPENDENCIES:
    - dbsqlite: sql (database schema queries)
    - subprocess: pip freeze execution
    - os, fnmatch: File system operations and pattern matching

DATABASE QUERIES:
    - sqlite_master: SELECT table names
    - PRAGMA table_info: Get column details for each table
    - PRAGMA foreign_key_list: Get foreign key relationships

EXCLUSION PATTERNS:
    - Full exclude: env_*, __pycache__, node_modules, .git, static/media
    - Reduced display: bootstrap, fontawesome, jquery, uploads

CALLED BY:
    - Manual execution via __main__
    - Backup/documentation workflows

KEY FUNCTIONS:
    - generate_database_structure(): Export complete DB schema
    - generate_folder_structure(): Export filtered directory tree
    - generate_pipfreeze_output(): Export Python dependencies
"""

import fnmatch
import subprocess
from libs.dbsqlite import sql
import os
import sys

# We are going to create a backup system where we store the requirements, the database schema, and the folder structure
sys.stdout.reconfigure(encoding='utf-8')

def generate_database_structure(output_file=".claude/documentation/database-structure.txt"):
    """
    Export complete SQLite database schema to text file

    Queries sqlite_master for all tables, then PRAGMA commands for column
    details and foreign keys. Skips system tables (sqlite_*, sqlean_).

    OUTPUT FORMAT:
        TABLE: table_name
        ----------------------------------------
          cid  column_name          TYPE NOT NULL PRIMARY KEY DEFAULT value

          Foreign Keys:
            column -> referenced_table.referenced_column

    Args:
        output_file (str): Path to output file

    Side Effects:
        Creates parent directory if missing
        Overwrites output_file if exists
    """

    tables_exported = []

    # Ensure parent directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, "w") as f:
        f.write("=== UNIBOT DATABASE STRUCTURE ===\n\n")

        # Get all tables
        tables = sql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [])

        tables_exported.extend([table['name'] for table in tables])

        for table in tables:
            # #print(f"Processing table: {table['name']}")
            table_name = table['name']

            # Skip system/internal tables
            ignore_tables = ['sqlean_define']
            if table_name.startswith('sqlite_') or table_name in ignore_tables:
                # #print(f"Skipping system table: {table_name}")
                continue

            f.write(f"TABLE: {table_name}\n")
            f.write("-" * 40 + "\n")

            # Get table info (columns, types, etc.)
            columns = sql(f"PRAGMA table_info({table_name})", [])

            # #print(f"Columns in {table_name}: {columns}")

            for col in columns:
                # #print(f"Column details: {col}")
                cid = col['cid']
                name = col['name']
                type = col['type']
                notnull = col['notnull']
                dflt_value = col['dflt_value']
                pk = col['pk']

                # Rebuild column description
                desc_parts = []
                if type:
                    desc_parts.append(type)
                if notnull:
                    desc_parts.append("NOT NULL")

                if pk:
                    desc_parts.append("PRIMARY KEY")

                if dflt_value is not None:
                    desc_parts.append(f"DEFAULT {dflt_value}")
                else:
                    desc_parts.append("DEFAULT NULL")

                # Write column details to file
                f.write(f"  {cid:<3} {name:<20} {' '.join(desc_parts)}\n")

            # Get foreign keys if any
            foreign_keys = sql(f"PRAGMA foreign_key_list({table_name})", [])
            if foreign_keys:
                f.write("\n  Foreign Keys:\n")
                for fk in foreign_keys:
                   f.write(f"    {fk['from']} -> {fk['table']}.{fk['to']}\n")

            f.write("\n")

    tables_list = '\n'.join(tables_exported)
    return f"Exported {len(tables_exported)} tables.\n\n{tables_list}\n\nSaved to {output_file}."

    #print(f"Database structure written to {output_file}")


def generate_database_overview(output_file=".claude/documentation/database-overview.txt"):
    """
    Export compact database schema overview (one line per table)

    OUTPUT FORMAT:
        table_name (col1, col2, col3, ...)

    Args:
        output_file (str): Path to output file
    """
    tables_exported = []
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, "w") as f:
        f.write("=== DATABASE OVERVIEW ===\n")
        f.write("For full schema with types/constraints: database-structure.txt\n\n")

        tables = sql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [])

        for table in tables:
            table_name = table['name']
            if table_name.startswith('sqlite_') or table_name == 'sqlean_define':
                continue

            columns = sql(f"PRAGMA table_info({table_name})", [])
            col_names = [col['name'] for col in columns]
            f.write(f"{table_name} ({', '.join(col_names)})\n")
            tables_exported.append(table_name)

    return f"Exported {len(tables_exported)} tables (overview).\nSaved to {output_file}."


def generate_folder_structure(output_file=".claude/documentation/folder-structure.txt"):
    """
    Generate filtered project directory tree and save to text file

    Walks entire project directory, applying exclusion patterns to skip
    unwanted folders and reducing large vendor folders to collapsed entries.

    Args:
        output_file (str): Path to output file

    Side Effects:
        Creates parent directory if missing
        Overwrites output_file if exists
    """

    try:
        exclude_folders = [
            'env_*', '__pycache__', '.git', '.vscode', 'node_modules', 'scripts/tests/browser/suno_session',
            'modules/musicvideos/*/images', 'modules/musicvideos/*/videos',
            'modules/musicvideos/*/output', 'modules/musicvideos/*/temp_assembly',
            'static/media', '*__pycache__',
            '.claude/summaries/archive', 'output', 'outputs', 'modules/musicvideos/sora_session',
        ]

        reduced_folders = ['bootstrap', 'fontawesome', 'jquery', 'uploads', 'models', 'modules', 'fonts', 'webfonts',
                       '.claude/output', '.claude/backups', '.claude/temp', 'mini-upload-form', 'temp/']

        exclude_files = ['*.tmp.*', '*.pyc', '.DS_Store', 'client_secret*.json', 'hello_from_agent.txt']

        exclude_paths = [
            'asset_library/images/*.png',
            'asset_library/videos/*.mp4',
            'services/generated_portraits/*.png',
            'services/references/*.png',
            'static/images/generated/*.png',
        ]

        output_lines = []

        folder_names = []

        for root, dirs, files in os.walk('.'):

            # folder_names.append(os.path.basename(root) or '.')

            # Sort for consistent VS Code-style output
            dirs.sort()
            files.sort()

            skip_folder = any(fnmatch.fnmatch(os.path.relpath(root, '.'), pat) for pat in exclude_folders)
            #print(f"Skipping folder: {root}")

            # Calculate depth for indentation
            level = root.replace('.', '').count(os.sep)
            indent = '    ' * level
            folder_name = os.path.basename(root)

            if skip_folder:
                output_lines.append(f"{indent}{folder_name}\\ [excluded]")
                continue

            # Add folder name
            output_lines.append(f"{indent}{folder_name}\\")
            # Handle subdirectories - check for exclusions
            sub_indent = '    ' * (level + 1)
            dirs_to_remove = []

            for d in dirs:
                full_path = os.path.join(root, d)
                rel_path = os.path.relpath(full_path, '.').replace('\\', '/')

                if any(exclude in rel_path for exclude in reduced_folders):
                    # Collapse large vendor folders
                    output_lines.append(f"{sub_indent}{d}\\")
                    output_lines.append(f"{sub_indent}    ...")
                    dirs_to_remove.append(d)
                elif any(fnmatch.fnmatch(rel_path, exclude) for exclude in exclude_folders):
                    # Fully exclude unwanted folders
                    output_lines.append(f"{sub_indent}{d}/ [excluded]")
                    dirs_to_remove.append(d)
                else:
                    # Add the full folder name to our list
                    folder_names.append(rel_path + '/')


            # Remove excluded directories from traversal
            for d in dirs_to_remove:
                dirs.remove(d)



            # Add files
            for file in files:
                # Skip by filename pattern
                if any(fnmatch.fnmatch(file, pat) for pat in exclude_files):
                    continue
                # Skip by full path pattern
                file_rel_path = os.path.join(root, file).replace('\\', '/').lstrip('./')
                if any(fnmatch.fnmatch(file_rel_path, pat) for pat in exclude_paths):
                    continue
                output_lines.append(f"{sub_indent}{file}")

        # Ensure parent directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(output_lines))

        folders_list = '\n'.join(folder_names)
        return f"Exported {len(folder_names)} folders.\n\n{folders_list}\n\nSaved to {output_file}."

        #print("Folder structure written to docs/folder_structure.txt")

    except Exception as e:
        #print(f"Error generating folder structure: {e}")
        pass


def generate_pipfreeze_output(output_file="requirements.txt"):
    """
    Export Python package dependencies via pip freeze

    Executes 'py -m pip freeze' subprocess and writes output to requirements.txt.
    Captures current environment's installed packages with exact versions.

    Args:
        output_file (str): Path to output file (default: project root)

    Side Effects:
        Overwrites output_file if exists
    """

    included_modules = []

    try:
        output_lines = subprocess.check_output(['py', '-m', 'pip', 'freeze']).decode().strip().split('\n')

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(output_lines))
            included_modules.extend([line.split('==')[0] for line in output_lines if '==' in line])

        modules_list = '\n'.join(included_modules)
        return f"Exported {len(included_modules)} packages.\n\n{modules_list}\n\nSaved to {output_file}."

        #print("Pip freeze output written to docs/requirements.txt")

    except Exception as e:
        #print(f"Error generating pip freeze output: {e}")
        pass



if __name__ == "__main__":
    print(generate_database_structure())
    print(generate_database_overview())
    print(generate_folder_structure())
    print(generate_pipfreeze_output())