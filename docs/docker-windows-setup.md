# Docker Desktop unblock (Windows)

## Current blocker

Docker Desktop is installed, but the engine cannot start until Windows finishes enabling WSL2 / Virtual Machine Platform.

Status observed:

1. Docker Desktop installed (client OK)
2. WSL features enabled via DISM
3. Message: **Changes will not be effective until the system is rebooted**
4. Until reboot: `WSL2 is unable to start since virtualization is not enabled`

## What you must do

1. **Save your work**
2. **Reboot Windows**
3. After login, open **Docker Desktop** and wait until it says **Running** (whale icon steady)
4. Come back here and say: `Docker is running`

Then we will run:

```powershell
cd "c:\Users\91976\Downloads\FullStack Project\agentmesh"
Copy-Item .env.example .env -ErrorAction SilentlyContinue
$env:Path = "$env:ProgramFiles\Docker\Docker\resources\bin;" + $env:Path
docker compose up --build -d
```

## Optional BIOS check (only if still broken after reboot)

In BIOS/UEFI, ensure **Intel VT-x / AMD-V / SVM** is Enabled. Your machine already reports a hypervisor, so reboot alone should be enough in most cases.
