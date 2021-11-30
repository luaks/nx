import {
  addDependenciesToPackageJson,
  formatFiles,
  getProjects,
  joinPathFragments,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { nxVersion } from '../../utils/versions';

async function findBabelRcFiles(tree: Tree): Promise<string[]> {
  const projects = await getProjects(tree);

  const babelConfigs = [];
  for (const [, project] of projects) {
    const potentialBabelConfig = joinPathFragments(project.root, '.babelrc');
    if (tree.exists(potentialBabelConfig)) {
      babelConfigs.push(potentialBabelConfig);
    }
  }

  return babelConfigs;
}

function updateBabelPreset(tree: Tree, pathToBabelRc: string): boolean {
  let babelRcWasUpdated = false;
  updateJson(tree, pathToBabelRc, (json: BabelRc) => {
    json.presets = json.presets || [];

    const newPresets = [];
    for (let preset of json.presets) {
      if (typeof preset === 'string' && preset === '@nrwl/web/babel') {
        newPresets.push('@nrwl/js/babel');
        babelRcWasUpdated = true;
      } else if (Array.isArray(preset) && preset?.[0] === '@nrwl/web/babel') {
        preset[0] = '@nrwl/js/babel';
        newPresets.push(preset);
        babelRcWasUpdated = true;
      } else {
        newPresets.push(preset);
      }
    }

    json.presets = newPresets;

    return json;
  });

  return babelRcWasUpdated;
}

export default async function update(tree: Tree) {
  const babelPaths = await findBabelRcFiles(tree);

  let addNrwlJs = false;
  for (const pathToBabelRc of babelPaths) {
    // accumulate if any of the babelrc files were updated to update devDeps
    addNrwlJs = updateBabelPreset(tree, pathToBabelRc) || addNrwlJs;
  }

  if (addNrwlJs) {
    addDependenciesToPackageJson(tree, {}, { '@nrwl/js': nxVersion });
  }

  return await formatFiles(tree);
}

interface BabelRc {
  presets?: Array<string | [string, object]>;
}
