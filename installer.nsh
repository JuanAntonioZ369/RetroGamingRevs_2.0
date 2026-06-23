; installer.nsh — Instala Visual C++ Redistributable 2015-2022 si no está presente
; Incluido automáticamente por electron-builder via "include" en nsis config

!macro customInstall
  ; Verificar si VC++ Redist x64 ya está instalado
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != "1"
    DetailPrint "Instalando Visual C++ Redistributable 2022..."
    ; Descargar e instalar silenciosamente
    inetc::get /SILENT \
      "https://aka.ms/vs/17/release/vc_redist.x64.exe" \
      "$TEMP\vc_redist.x64.exe" \
      /END
    ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart' $1
    ${If} $1 != 0
      MessageBox MB_OK|MB_ICONINFORMATION \
        "No se pudo instalar Visual C++ Redistributable automáticamente.$\n\
Descárgalo manualmente desde:$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe$\n\
y reinstala GamingRevs."
    ${EndIf}
    Delete "$TEMP\vc_redist.x64.exe"
  ${EndIf}
!macroend

!macro customUnInstall
!macroend
