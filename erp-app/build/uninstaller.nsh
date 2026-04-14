; Custom uninstaller script for md-PRO
; Detects system language and shows message in Arabic, French, or English

!macro customUnInstall

  ; --- detect system language ---
  ReadRegStr $0 HKCU "Control Panel\International" "LocaleName"

  ; French
  StrCpy $1 $0 2
  StrCmp $1 "fr" is_french
  ; Arabic
  StrCmp $1 "ar" is_arabic

  ; Default: English
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to delete all application data?$\n$\n(Database, settings, and backups)" \
    IDNO skip_data_removal
  Goto do_removal

  is_french:
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Voulez-vous supprimer toutes les données de l'application ?$\n$\n(Base de données, paramètres et sauvegardes)" \
    IDNO skip_data_removal
  Goto do_removal

  is_arabic:
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "هل تريد حذف جميع بيانات التطبيق أيضاً؟$\n$\n(قاعدة البيانات، الإعدادات، والنسخ الاحتياطية)" \
    IDNO skip_data_removal

  do_removal:
    RMDir /r "$APPDATA\erp-app"
    RMDir /r "$LOCALAPPDATA\erp-app"

  skip_data_removal:
!macroend
