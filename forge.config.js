const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { CHROME_BUILD } = require('./src/chromeVersion');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './src/icons/icons/mac/icon',
    name: 'SpotPlot',
    extraResource: [
      './src/icon.png',
      './src/icons/icons/mac/icon.icns',
      `${process.env.HOME}/.cache/puppeteer/chrome/mac_arm-${CHROME_BUILD}/chrome-mac-arm64/Google Chrome for Testing.app`,
    ],
    osxSign: {
      identity: 'Developer ID Application: WHEELER DAVID MOON (299TQ9H5QB)',
      'hardened-runtime': true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      // Stop the build on a signing error instead of carrying on unsigned and failing later at notarization
      continueOnError: false,
      // Only sign actual programs (Mach-O files). The signer otherwise also signs thousands of resource
      // files (locale.pak, icons…) one by one, each needing Apple's timestamp server, and a single dropped
      // request fails the build. Resources are covered by the app bundle's own seal anyway.
      ignore: (filePath) => {
        const fs = require('fs');
        try {
          if (fs.statSync(filePath).isDirectory()) return false;
          const fd = fs.openSync(filePath, 'r');
          const magic = Buffer.alloc(4);
          fs.readSync(fd, magic, 0, 4, 0);
          fs.closeSync(fd);
          const MACHO = ['feedface', 'cefaedfe', 'feedfacf', 'cffaedfe', 'cafebabe', 'bebafeca'];
          return !MACHO.includes(magic.toString('hex'));
        } catch (e) { return false; }
      },
    },
    // No osxNotarize here: the postPackage hook re-signs the app (which would void a notarization
    // done at this stage) and then notarizes it once, with retries.
        protocols: [
      {
        name: 'SpotPlot Show File',
        schemes: ['spotplot'],
      },
    ],
    // Registers .spotplot files with macOS so Finder shows the SpotPlot icon for them.
    // (Electron Packager has no `fileAssociations` option; this has to go in Info.plist.)
    // icon.icns is copied into Contents/Resources by the extraResource entry above.
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'SpotPlot Show File',
          CFBundleTypeRole: 'Editor',
          LSHandlerRank: 'Owner',
          CFBundleTypeIconFile: 'icon.icns',
          LSItemContentTypes: ['com.electron.spotplot.show'],
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'com.electron.spotplot.show',
          UTTypeDescription: 'SpotPlot Show File',
          // Not public.json: Finder would show a text preview of the file instead of the SpotPlot icon
          UTTypeConformsTo: ['public.data', 'public.content'],
          UTTypeIconFile: 'icon.icns',
          UTTypeTagSpecification: { 'public.filename-extension': ['spotplot'] },
        },
      ],
    },
  },
  rebuildConfig: {},
  hooks: {
    postPackage: async (forgeConfig, options) => {
      if (process.platform !== 'darwin') return;
      const { execSync } = require('child_process');
      const path = require('path');
      const appPath = options.outputPaths[0] + '/SpotPlot.app';
      const zipPath = options.outputPaths[0] + '/SpotPlot.zip';
      console.log('Signing:', appPath);
      execSync(`codesign --deep --force --options runtime --entitlements entitlements.plist --sign "Developer ID Application: WHEELER DAVID MOON (299TQ9H5QB)" "${appPath}"`, { stdio: 'inherit' });
      console.log('Zipping for notarization...');
      execSync(`ditto -c -k --keepParent "${appPath}" "${zipPath}"`, { stdio: 'inherit' });
      // Uploading ~300 MB to Apple can hit a network blip; retry a few times before giving up
      for (let attempt = 1; ; attempt++) {
        try {
          console.log(`Notarizing (attempt ${attempt} of 3)...`);
          execSync(`xcrun notarytool submit "${zipPath}" --keychain-profile "AC_PASSWORD" --wait`, { stdio: 'inherit' });
          break;
        } catch (e) {
          if (attempt >= 3) throw e;
          console.log('Notarization upload failed; retrying in 30 seconds...');
          execSync('sleep 30');
        }
      }
      console.log('Stapling...');
      execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
      console.log('Creating release zip...');
      execSync(`ditto -c -k --keepParent "${appPath}" "${path.join(options.outputPaths[0], '..', '..', 'make', 'zip', 'darwin', 'arm64', 'SpotPlot-darwin.zip')}"`, { stdio: 'inherit' });
    },
    postMake: async (forgeConfig, makeResults) => {
      if (process.platform !== 'darwin') return makeResults;
      const { execSync } = require('child_process');
      const path = require('path');
      const allArtifacts = makeResults.flatMap(r => r.artifacts);
      const dmgArtifact = allArtifacts.find(a => a.endsWith('.dmg'));
      if (!dmgArtifact) return makeResults;
      const appPath = dmgArtifact.replace('/make/SpotPlot.dmg', '/SpotPlot-darwin-arm64/SpotPlot.app');
      const settingsPath = path.join(__dirname, 'dmgbuild_settings.py');
      const newDmgPath = dmgArtifact.replace('.dmg', '_licensed.dmg');
      try {
        execSync(`dmgbuild -s "${settingsPath}" -D app="${appPath}" "SpotPlot" "${newDmgPath}"`, { stdio: 'inherit' });
        const fs = require('fs');
        fs.renameSync(newDmgPath, dmgArtifact);
        console.log('License added to DMG successfully');
      } catch(e) {
        console.warn('Could not add license to DMG:', e.message);
      }
      return makeResults;
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
    {
    name: '@electron-forge/maker-dmg',
    config: {
      format: 'ULFO',
      name: 'SpotPlot',
    },
  },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
