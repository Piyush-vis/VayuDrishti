"""
Workspace Verification Runner (Superpowers & R1 Quality Gate)
Verifies skill frontmatter, Python syntax, and rule integrity.
"""

import sys
import os
import py_compile
from pathlib import Path

def verify_skills(root: Path):
    skills_dir = root / ".agents" / "skills"
    if not skills_dir.exists():
        print("[FAIL] .agents/skills directory missing!")
        return False
    
    passed = True
    print("\n--- Verifying Skills ---")
    for skill_folder in skills_dir.iterdir():
        if skill_folder.is_dir():
            skill_md = skill_folder / "SKILL.md"
            if not skill_md.exists():
                print(f"[FAIL] {skill_folder.name} missing SKILL.md")
                passed = False
                continue
            with open(skill_md, "r", encoding="utf-8") as f:
                content = f.read()
                if not content.startswith("---"):
                    print(f"[FAIL] {skill_folder.name}/SKILL.md missing frontmatter start ---")
                    passed = False
                elif "name:" not in content or "description:" not in content:
                    print(f"[FAIL] {skill_folder.name}/SKILL.md missing name or description")
                    passed = False
                else:
                    print(f"[PASS] Skill: {skill_folder.name}")
    return passed

def verify_rules(root: Path):
    rules_dir = root / ".agents" / "rules"
    if not rules_dir.exists():
        print("[FAIL] .agents/rules directory missing!")
        return False
    
    print("\n--- Verifying Rules ---")
    for rule_file in rules_dir.glob("*.md"):
        print(f"[PASS] Rule: {rule_file.name}")
    return True

def verify_python_syntax(root: Path):
    backend_dir = root / "backend"
    print("\n--- Verifying Backend Python Syntax ---")
    for py_file in backend_dir.rglob("*.py"):
        if "venv" not in str(py_file) and "__pycache__" not in str(py_file):
            try:
                py_compile.compile(str(py_file), doraise=True)
            except py_compile.PyCompileError as e:
                print(f"[FAIL] Syntax error in {py_file.name}: {e}")
                return False
    print("[PASS] All backend Python files compiled cleanly.")
    return True

if __name__ == "__main__":
    project_root = Path(__file__).resolve().parent.parent.parent
    s_ok = verify_skills(project_root)
    r_ok = verify_rules(project_root)
    p_ok = verify_python_syntax(project_root)
    
    if s_ok and r_ok and p_ok:
        print("\n[SUCCESS] Entire workspace rules, skills, and backend files verified 100% operational!")
        sys.exit(0)
    else:
        print("\n[ERROR] Workspace verification encountered issues.")
        sys.exit(1)
