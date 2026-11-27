/** The key and region as a .env file and as PowerShell commands for the current session. */
export function keyEnvLines(key: string, region: string): { dotenv: string; powershell: string } {
  return {
    dotenv: `UNCOIL_API_KEY=${key}\nUNCOIL_REGION=${region}`,
    powershell: `$env:UNCOIL_API_KEY="${key}"\n$env:UNCOIL_REGION="${region}"`,
  };
}
