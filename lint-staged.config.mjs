import path from "node:path";

// Run each app's locally-installed eslint + prettier from inside the app dir so
// the flat ESLint config and .prettierrc resolve correctly. Staged paths come in
// absolute; we rebase them relative to the app before passing them along.
const perApp = (app) => (files) => {
  const rel = files.map((f) => `"${path.relative(app, f)}"`).join(" ");
  return [`bash -c "cd ${app} && eslint --fix ${rel} && prettier --write ${rel}"`];
};

export default {
  "backend/**/*.ts": perApp("backend"),
  "frontend/**/*.{ts,tsx,js,jsx}": perApp("frontend"),
};
