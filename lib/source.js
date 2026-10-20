const fs = require('fs');
const path = require('path');

/**
 * A source exposes the files of a project so the analyzer can inspect them.
 * The same analyzer logic then works for a folder on disk, a cloned GitHub
 * repository, or a folder the user picked in their browser.
 */

/** Reads a project from the file system. */
function createLocalSource(root) {
  return {
    kind: 'local',
    display: root,
    exists(rel) {
      try {
        return fs.existsSync(path.join(root, rel));
      } catch {
        return false;
      }
    },
    read(rel) {
      try {
        return fs.readFileSync(path.join(root, rel), 'utf8');
      } catch {
        return null;
      }
    },
    list() {
      const out = [];
      const walk = (dir, prefix) => {
        let entries;
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
          else out.push(rel);
        }
      };
      try {
        walk(root, '');
      } catch {
        /* ignore */
      }
      return out;
    },
  };
}

/**
 * Reads a project from an in-memory map of relative path to file contents.
 * This is what a browser sends when the user picks a local folder.
 *
 * The .git directory is never uploaded (it can be huge), so the caller
 * passes hasGit to record that the folder did contain a git repository.
 */
function createMemorySource(files, display, hasGit = false) {
  const map = new Map(Object.entries(files || {}));

  return {
    kind: 'memory',
    display: display || 'selected folder',
    hasGit: hasGit === true,
    exists(rel) {
      return map.has(rel);
    },
    read(rel) {
      const value = map.get(rel);
      return value === undefined ? null : value;
    },
    list() {
      return [...map.keys()];
    },
  };
}

module.exports = { createLocalSource, createMemorySource };
