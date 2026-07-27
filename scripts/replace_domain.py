import os, glob

root = os.path.dirname(os.path.abspath(__file__))
exclude_dirs = {'node_modules', '.git', '.claude', 'dist'}
extensions = {'.ts', '.tsx', '.js', '.json', '.html', '.xml', '.conf', '.yml', '.yaml', '.md', '.txt', '.env'}

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
    for f in filenames:
        if any(f.endswith(e) for e in extensions) or f == '.env':
            fp = os.path.join(dirpath, f)
            try:
                with open(fp, 'r', encoding='utf-8') as fh:
                    content = fh.read()
                if 'goodgamehubs.com' in content:
                    old_count = content.count('goodgamehubs.com')
                    content = content.replace('goodgamehubs.com', 'gghubs.com')
                    with open(fp, 'w', encoding='utf-8') as fh:
                        fh.write(content)
                    print(f'  ✅ {fp} ({old_count} replacements)')
            except (UnicodeDecodeError, PermissionError, FileNotFoundError):
                pass

print('\nDone!')
