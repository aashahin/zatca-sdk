
@echo off

SET VAR=
FOR /F %%I IN ('jq .version %FATOORA_HOME%/global.json') DO set "VAR=%%I"


set "VAR=%VAR:~1,-1%"


if exist "%FATOORA_HOME%/zatca-einvoicing-sdk-%VAR%.jar" call java -Djdk.module.illegalAccess=deny -Dfile.encoding=UTF-8 -jar %FATOORA_HOME%/zatca-einvoicing-sdk-%VAR%.jar --globalVersion %VAR% %*
