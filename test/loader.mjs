import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import babel from '@babel/core';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native') {
    return nextResolve('react-native-web', context);
  }
  if (specifier === 'expo-font') {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/expo-font.mjs')).href, context);
  }
  if (specifier.startsWith('@expo-google-fonts/')) {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/google-fonts.mjs')).href, context);
  }
  if (specifier === 'expo-linear-gradient') {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/expo-linear-gradient.mjs')).href, context);
  }
  if (specifier === '@expo/vector-icons') {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/vector-icons.mjs')).href, context);
  }
  if (specifier === 'expo-status-bar') {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/expo-status-bar.mjs')).href, context);
  }
  if (specifier === 'react-native-safe-area-context') {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/safe-area-context.mjs')).href, context);
  }
  if (specifier === 'expo-haptics') {
    return nextResolve(pathToFileURL(path.resolve('./test/mocks/expo-haptics.mjs')).href, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      try {
        return await nextResolve(specifier + '.js', context);
      } catch {}
      if (specifier.startsWith('.')) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
          const candidate = path.resolve(parentDir, specifier + ext);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return nextResolve(pathToFileURL(candidate).href, context);
          }
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.json')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    return {
      format: 'module',
      source: `export default ${source};`,
      shortCircuit: true,
    };
  }
  if (url.startsWith('file:') && (url.endsWith('.ts') || url.endsWith('.tsx'))) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    const transformed = babel.transformSync(source, {
      filename: filePath,
      presets: [
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    });
    return {
      format: 'module',
      source: transformed.code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
