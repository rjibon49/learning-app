
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.resolve(
  __dirname,
  '../prisma/schema.prisma'
);

if (!fs.existsSync(schemaPath)) {
  console.error('schema.prisma not found');
  process.exit(1);
}

const original = fs.readFileSync(
  schemaPath,
  'utf8'
);

// Create a backup before modifying anything.
const backupPath = `${schemaPath}.before-relation-fix.bak`;

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(schemaPath, backupPath);
}

let fixedCount = 0;

const updated = original.replace(
  /@relation\s*\(([^()]*)\)/g,
  (fullMatch, contents) => {
    let cleaned = contents
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Repair missing colons.
    cleaned = cleaned.replace(
      /\b(onDelete|onUpdate)\s+(Cascade|Restrict|SetNull|NoAction|SetDefault)\b/g,
      '$1: $2'
    );

    cleaned = cleaned.replace(
      /\b(fields|references)\s+(?=\[)/g,
      '$1: '
    );

    // Remove trailing comma.
    cleaned = cleaned.replace(/,\s*$/, '');

    if (fullMatch !== `@relation(${cleaned})`) {
      fixedCount++;
    }

    return `@relation(${cleaned})`;
  }
);

fs.writeFileSync(
  schemaPath,
  updated,
  'utf8'
);

console.log('====================================');
console.log('PRISMA RELATION SYNTAX FIX');
console.log('====================================');
console.log(`Fixed relation blocks: ${fixedCount}`);
console.log(`Backup: ${backupPath}`);
console.log(`Schema: ${schemaPath}`);
console.log('====================================');
console.log('Run: npx prisma validate');
