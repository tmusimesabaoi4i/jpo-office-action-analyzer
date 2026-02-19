"""
Python test orchestrator for JS test suite.
Runs: node run_tests.js and validates exit code + summary line.
Saves stdout/stderr to test_log.txt for traceability.
Usage: python test_runner.py
"""
import subprocess
import sys
import re
import os
import shutil
import datetime

LOG_FILE = "test_log.txt"


def find_node():
    """Locate node executable: PATH first, then fnm installation."""
    node = shutil.which("node")
    if node:
        return node
    fnm_dir = os.path.join(os.path.expanduser("~"), ".fnm", "node-versions")
    if os.path.isdir(fnm_dir):
        for ver in sorted(os.listdir(fnm_dir), reverse=True):
            candidate = os.path.join(fnm_dir, ver, "installation", "node.exe")
            if os.path.isfile(candidate):
                return candidate
            candidate = os.path.join(fnm_dir, ver, "installation", "bin", "node")
            if os.path.isfile(candidate):
                return candidate
    return "node"


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__)) or "."

    node = find_node()
    print(f"Using node: {node}")

    # Verify node exists
    try:
        ver = subprocess.run(
            [node, "-v"], capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        print(f"Node version: {ver.stdout.strip()}")
    except FileNotFoundError:
        print("ERROR: node not found.", file=sys.stderr)
        sys.exit(2)

    result = subprocess.run(
        [node, "run_tests.js"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=base_dir,
    )

    stdout = result.stdout
    stderr = result.stderr

    # Save log
    log_path = os.path.join(base_dir, LOG_FILE)
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"=== Test run: {datetime.datetime.now().isoformat()} ===\n")
        f.write(f"Node: {node}\n")
        f.write(f"Exit code: {result.returncode}\n\n")
        f.write("--- stdout ---\n")
        f.write(stdout)
        if stderr:
            f.write("\n--- stderr ---\n")
            f.write(stderr)

    print(stdout)
    if stderr:
        print("--- stderr ---", file=sys.stderr)
        print(stderr, file=sys.stderr)

    # Double-check: parse summary line "Passed: N, Failed: M"
    m = re.search(r"Passed:\s*(\d+),\s*Failed:\s*(\d+)", stdout)
    if not m:
        print("ERROR: Could not find summary line in output.", file=sys.stderr)
        sys.exit(2)

    passed = int(m.group(1))
    failed = int(m.group(2))

    print(f"\n=== Python orchestrator result ===")
    print(f"Passed: {passed}, Failed: {failed}")
    print(f"Log saved to: {log_path}")

    if result.returncode != 0:
        print(f"ERROR: node process exited with code {result.returncode}", file=sys.stderr)
        sys.exit(1)

    if failed > 0:
        print(f"ERROR: {failed} test(s) failed.", file=sys.stderr)
        sys.exit(1)

    print("All tests passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
