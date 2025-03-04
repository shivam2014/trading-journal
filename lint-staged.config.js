module.exports = {
  // Run type-check on TypeScript files
  '**/*.(ts|tsx)': () => 'npm run tsc --noEmit',

  // Lint and format TypeScript and JavaScript files
  '**/*.(ts|tsx|js)': filenames => [
    `eslint --fix ${filenames.join(' ')}`,
    `prettier --write ${filenames.join(' ')}`
  ],

  // Format other files
  '**/*.(md|json)': filenames => `prettier --write ${filenames.join(' ')}`
}