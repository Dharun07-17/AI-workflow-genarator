param(
  [string]$BaseUrl = "http://localhost:8000",
  [string]$Email,
  [string]$Password,
  [string]$Otp
)

function Read-PlainText([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $Email) {
  $Email = Read-Host "Email"
}
if (-not $Password) {
  $Password = Read-PlainText "Password"
}

$loginBody = @{
  email = $Email
  password = $Password
} | ConvertTo-Json

try {
  $loginResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" -ContentType "application/json" -Body $loginBody
} catch {
  Write-Error "Login failed: $($_.Exception.Message)"
  exit 1
}

if (-not $loginResp.success) {
  Write-Error "Login failed."
  exit 1
}

$accessToken = $null
if ($loginResp.data.requires_mfa -eq $true) {
  if (-not $Otp) {
    $Otp = Read-Host "MFA Code"
  }
  $mfaBody = @{
    mfa_token = $loginResp.data.mfa_token
    otp_code = $Otp
  } | ConvertTo-Json

  try {
    $mfaResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/mfa/verify" -ContentType "application/json" -Body $mfaBody
  } catch {
    Write-Error "MFA verify failed: $($_.Exception.Message)"
    exit 1
  }
  $accessToken = $mfaResp.data.access_token
} else {
  $accessToken = $loginResp.data.access_token
}

if (-not $accessToken) {
  Write-Error "No access token received."
  exit 1
}

try {
  $checkResp = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/admin/ai/check" -Headers @{ Authorization = "Bearer $accessToken" }
  $checkResp | ConvertTo-Json -Depth 6
} catch {
  Write-Error "AI check failed: $($_.Exception.Message)"
  exit 1
}
