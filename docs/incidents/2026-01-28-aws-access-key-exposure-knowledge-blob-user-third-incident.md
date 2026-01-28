# Incident: Third AWS access key exposure (knowledge-blob-user)

## TL;DR

AWS flagged the access key `AKIAQQABDFFFSFOO55BB` for IAM user `knowledge-blob-user` as potentially compromised.
CloudTrail analysis confirmed unauthorized API calls from IPs in the `193.32.126.0/24` range (France) — the same
attacker IP range observed in the December 2025 incident. The attacker performed reconnaissance including SES probing,
S3/Lambda/ECR/Secrets Manager enumeration — all denied except `GetCallerIdentity`. We rotated the key immediately,
updated App Runner, deleted the compromised key, and tainted the Terraform resource for state sync. This is the **third
incident** involving this IAM user, underscoring the urgent need to migrate from long-lived IAM user keys to IAM roles.

---

## Summary

On **2026-01-28**, AWS Support notified us of anomalous activity involving access key `AKIAQQABDFFFSFOO55BB` belonging
to IAM user `knowledge-blob-user`. CloudTrail evidence shows the attacker conducted reconnaissance from **2026-01-21
through 2026-01-27**, probing SES, S3, Lambda, ECR, and Secrets Manager — all of which were denied by IAM policy. Only
`GetCallerIdentity` succeeded, confirming the credentials were valid.

This is the **third credential exposure incident** for this IAM user:

1. **2025-12-26**: Production key compromised (IP range `193.32.126.x`, `95.173.222.x`)
2. **2026-01-08**: Preview key (PR-323) compromised (IPs `144.172.93.67`, `36.70.237.18`)
3. **2026-01-28**: Production key compromised again (IP range `193.32.126.x`)

## Severity

**Medium** (confirmed credential exposure; reconnaissance blocked; S3 data access cannot be ruled out due to missing
data event logging).

---

## Timeline (UTC unless stated otherwise)

* **2026-01-21 18:56:45 UTC**: First suspicious API call — `ses:GetSendQuota` (AccessDenied) from IP `193.32.126.237`.
* **2026-01-21 to 2026-01-25**: Continued SES probing from `193.32.126.x` IPs across multiple regions.
* **2026-01-26 20:40:55 UTC**: `sts:GetCallerIdentity` (SUCCESS) from IP `193.32.126.165` — **this is the event
  referenced in the AWS alert**.
* **2026-01-26 20:48:31 UTC**: Aggressive reconnaissance attempt:
    * `s3:ListBuckets` — AccessDenied
    * `lambda:ListFunctions` — AccessDenied
    * `ecr:ListRepositories` — AccessDenied
    * `secretsmanager:ListSecrets` — AccessDenied
* **2026-01-27 22:04:22 UTC**: Final observed activity — `GetCallerIdentity` + SES probe from `193.32.126.155`.
* **2026-01-28 ~08:30 UTC**: AWS Support Case notification received.
* **2026-01-28 08:50 UTC**: Incident response initiated.
    * Attempted to create new key — blocked by AWS limit (2 keys max)
    * Discovered stale key from December rotation (`AKIAQQABDFFFZAKFQM4Z`) still existed
    * Deleted stale key to make room
* **2026-01-28 08:56:22 UTC**: New access key created (`AKIAQQABDFFF4VJCC7NA`).
* **2026-01-28 ~09:00 UTC**: App Runner (`conversational-ui`) updated with new credentials via AWS Console.
* **2026-01-28 ~09:05 UTC**: Production verified working.
* **2026-01-28 09:06 UTC**: Compromised key `AKIAQQABDFFFSFOO55BB` deleted.
* **2026-01-28 09:10 UTC**: Terraform resource `aws_iam_access_key.knowledge_blob_access_key` tainted for state sync on
  next CI run.

---

## Detection and evidence

### AWS notification

AWS Support reported anomalous `GetCallerIdentity` call:

* **Access Key:** `AKIAQQABDFFFSFOO55BB`
* **IAM User:** `knowledge-blob-user`
* **Event:** `GetCallerIdentity`
* **Event Time:** 2026-01-26 20:40:55 UTC
* **IP:** `193.32.126.165` (France)

### CloudTrail findings (management events)

#### Events observed in `eu-west-3` (primary region)

| Time (UTC)          | Event        | Source IP      | Result       |
|---------------------|--------------|----------------|--------------|
| 2026-01-21 18:56:45 | GetSendQuota | 193.32.126.237 | AccessDenied |
| 2026-01-21 21:24:51 | GetSendQuota | 193.32.126.237 | AccessDenied |
| 2026-01-23 09:01:59 | GetSendQuota | 193.32.126.165 | AccessDenied |
| 2026-01-24 10:24:00 | GetSendQuota | 193.32.126.165 | AccessDenied |
| 2026-01-25 20:31:42 | GetSendQuota | 193.32.126.165 | AccessDenied |
| 2026-01-26 20:40:57 | GetSendQuota | 193.32.126.165 | AccessDenied |
| 2026-01-27 22:04:24 | GetSendQuota | 193.32.126.155 | AccessDenied |

#### Events observed in `us-east-1` (global endpoint)

| Time (UTC)          | Event                 | Source IP      | Result       |
|---------------------|-----------------------|----------------|--------------|
| 2026-01-23 09:01:49 | GetAccount (SES)      | 193.32.126.165 | AccessDenied |
| 2026-01-23 09:01:57 | GetCallerIdentity     | 193.32.126.165 | **SUCCESS**  |
| 2026-01-24 11:23:58 | GetCallerIdentity     | 193.32.126.165 | **SUCCESS**  |
| 2026-01-25 21:31:40 | GetCallerIdentity     | 193.32.126.165 | **SUCCESS**  |
| 2026-01-26 20:40:55 | GetCallerIdentity     | 193.32.126.165 | **SUCCESS**  |
| 2026-01-26 20:48:31 | GetCallerIdentity     | 193.32.126.165 | **SUCCESS**  |
| 2026-01-26 20:48:31 | ListBuckets           | 193.32.126.165 | AccessDenied |
| 2026-01-26 20:48:31 | ListFunctions20150331 | 193.32.126.165 | AccessDenied |
| 2026-01-26 20:48:31 | ListRepositories      | 193.32.126.165 | AccessDenied |
| 2026-01-26 20:48:31 | ListSecrets           | 193.32.126.165 | AccessDenied |
| 2026-01-27 22:04:22 | GetCallerIdentity     | 193.32.126.155 | **SUCCESS**  |

#### Multi-region SES probing

The attacker probed SES `GetSendQuota` across multiple regions simultaneously:

* eu-west-1, eu-west-2, eu-west-3
* ap-south-1, ap-southeast-1
* us-east-1

All returned `AccessDenied`.

### What succeeded

* `sts:GetCallerIdentity` — Attacker verified credentials were valid and obtained IAM user ARN

### What was blocked

* All SES calls (`GetSendQuota`, `GetAccount`) — AccessDenied
* `s3:ListBuckets` — AccessDenied
* `lambda:ListFunctions` — AccessDenied
* `ecr:ListRepositories` — AccessDenied
* `secretsmanager:ListSecrets` — AccessDenied

### Important limitation

**No CloudTrail trail is configured for S3 data events.** The IAM user has permissions for `s3:GetObject`,
`s3:PutObject`, `s3:ListBucket`, and `s3:DeleteObject` on the knowledge blob bucket. We cannot confirm whether the
attacker accessed bucket objects because S3 data events are not logged.

---

## Impact assessment

### Confirmed impact

* Access key was used by unauthorized parties from `193.32.126.0/24` (France)
* Attacker verified credential validity via `GetCallerIdentity`
* Attacker attempted service enumeration (S3, Lambda, ECR, Secrets Manager, SES)

### Likely intent

Automated credential probing for:

1. SES spam distribution capability
2. General AWS account access for crypto mining or data exfiltration

### Observed outcome

* All privileged actions were denied by IAM policy
* No evidence of IAM mutations or privilege escalation

### Potential impact that cannot be ruled out

* S3 object access (read/write/delete) on the knowledge blob bucket — no data event logging to confirm or deny

---

## Root cause

### Immediate cause

The access key `AKIAQQABDFFFSFOO55BB` was exposed to an unauthorized third party. This key was created on **2025-12-29
** (3 days after the December incident rotation), suggesting either:

1. The leak vector from December was not fully closed
2. A new leak occurred shortly after rotation

### Systemic cause

Continued use of **long-lived IAM user access keys** despite recommendations from previous incidents to migrate to IAM
roles. The architectural fix identified in December 2025 has not been implemented.

### Possible leak vectors (unchanged from previous incidents)

* Terraform state file exposure
* CI/CD log capture of environment variables
* Local `.env` files committed or shared
* Developer machine compromise

---

## Remediation performed

### 1. Credential rotation

* Deleted stale key `AKIAQQABDFFFZAKFQM4Z` (from December rotation, never cleaned up)
* Created new access key `AKIAQQABDFFF4VJCC7NA`
* Updated App Runner (`conversational-ui`) environment variables via AWS Console

### 2. Credential revocation

* Deleted compromised key `AKIAQQABDFFFSFOO55BB`

### 3. Production verification

* Confirmed App Runner service healthy with new credentials

### 4. Terraform state sync

* Tainted `aws_iam_access_key.knowledge_blob_access_key` resource
* Next CI/CD run will recreate the key and update state

---

## Next steps (prevent recurrence)

### 1. Enable CloudTrail S3 data events (HIGH PRIORITY)

Enable data event logging for the knowledge blob bucket to provide auditability for `GetObject`, `PutObject`,
`DeleteObject`.

### 2. Migrate to IAM roles (CRITICAL — third time recommended)

Eliminate long-lived IAM user keys entirely:

* **App Runner:** Attach S3 permissions to the instance role
* **Lambda/Worker:** Attach S3 permissions to the execution role
* Remove `BLOB_ACCESS_KEY_ID` and `BLOB_READ_WRITE_TOKEN` environment variables

### 3. Add explicit deny guardrails

Add permission boundaries or SCPs to explicitly deny services not required:

* Deny SES, SNS, EC2, Secrets Manager for this IAM user/role

### 4. Audit and close leak vectors

* Review Terraform state access controls
* Audit CI/CD logs for credential exposure
* Enable secret scanning on repositories
* Review local development credential handling

---

## Action items

* [ ] **P0**: Migrate App Runner and Lambda to IAM roles for S3 access — eliminate IAM user keys
* [ ] **P1**: Enable CloudTrail S3 data events for knowledge blob bucket
* [ ] **P1**: Add explicit deny policies for unused services (SES, EC2, etc.)
* [ ] **P2**: Audit Terraform state access and CI/CD log sanitization
* [ ] **P2**: Implement automated key rotation alerts
* [ ] After next CI run: delete orphaned key `AKIAQQABDFFF4VJCC7NA`

---

## Appendix — Commands used

### List access keys for IAM user

```bash
aws iam list-access-keys --user-name knowledge-blob-user
```

### Query CloudTrail for compromised key activity

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue="AKIAQQABDFFFSFOO55BB" \
  --start-time 2026-01-20T00:00:00Z \
  --end-time 2026-01-28T23:59:59Z \
  --max-results 50 \
  --output json
```

### Multi-region CloudTrail scan

```bash
for region in us-east-1 eu-west-1 eu-west-2 eu-west-3 ap-south-1; do
  echo "=== $region ==="
  aws cloudtrail lookup-events \
    --region "$region" \
    --lookup-attributes AttributeKey=AccessKeyId,AttributeValue="AKIAQQABDFFFSFOO55BB" \
    --start-time 2026-01-20T00:00:00Z \
    --end-time 2026-01-28T23:59:59Z \
    --max-results 20 \
    --query 'Events[].{Time:EventTime,Name:EventName}' \
    --output table
done
```

### Delete access key

```bash
aws iam delete-access-key \
  --user-name knowledge-blob-user \
  --access-key-id AKIAQQABDFFFSFOO55BB
```

### Taint Terraform resource

```bash
cd operations/01-provision
terraform workspace select production
terraform taint aws_iam_access_key.knowledge_blob_access_key
```

---

## Current status

* Compromised key `AKIAQQABDFFFSFOO55BB` is **deleted**
* New key `AKIAQQABDFFF4VJCC7NA` is active and in use by App Runner
* Production services are healthy
* Terraform resource tainted for state sync on next CI run
* AWS Support Case response pending
