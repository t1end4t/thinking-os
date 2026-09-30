{
  lib,
  buildNpmPackage,
  importNpmLock,
  makeWrapper,
  nodejs,
}:

buildNpmPackage {
  pname = "thinking-os";
  version = "0.1.0";

  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../package.json
      ../package-lock.json
      ../index.html
      ../tsconfig.json
      ../vite.config.ts
      ../public
      ../server
      ../src
      ../templates
    ];
  };

  npmDeps = importNpmLock { npmRoot = ../.; };
  npmConfigHook = importNpmLock.npmConfigHook;

  nativeBuildInputs = [ makeWrapper ];

  installPhase = ''
    runHook preInstall

    appDir=$out/libexec/thinking-os
    mkdir -p $appDir
    cp -r dist server templates node_modules package.json vite.config.ts $appDir/

    makeWrapper ${lib.getExe nodejs} $out/bin/thinking-os \
      --chdir $appDir \
      --set THINKING_OS_RUNTIME_EXEC 1 \
      --add-flags "$appDir/node_modules/vite/bin/vite.js preview --configLoader runner --host 127.0.0.1 --port 3000 --open"

    runHook postInstall
  '';

  meta.mainProgram = "thinking-os";
}
