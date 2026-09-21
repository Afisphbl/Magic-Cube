import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import babel from '@babel/core';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if ((err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') && specifier.startsWith('.')) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        const candidate = path.resolve(parentDir, specifier + ext);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && (url.endsWith('.ts') || url.endsWith('.tsx'))) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    const transformed = babel.transformSync(source, {
      filename: filePath,
      presets: ['@babel/preset-typescript'],
    });
    return {
      format: 'module',
      source: transformed.code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
