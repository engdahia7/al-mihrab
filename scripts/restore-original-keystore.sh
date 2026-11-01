#!/usr/bin/env bash
# Automatically locates and restores the original Upload Key (android.keystore)
# matching SHA1: 21:97:FA:1F:16:15:1A:96:0E:50:EA:12:29:B3:AF:AA:A8:73:13:8F
# from previous GitHub Releases or GitHub Actions Artifacts in this repository,
# so Google Play Console accepts the signed AAB without signature mismatch errors.

set -e

EXPECTED_SHA1="21:97:FA:1F:16:15:1A:96:0E:50:EA:12:29:B3:AF:AA:A8:73:13:8F"
TARGET_KEYSTORE="$GITHUB_WORKSPACE/android.keystore"
B64_CACHE_FILE="$GITHUB_WORKSPACE/signing-keystore.b64"

check_keystore_candidate() {
  local candidate_file="$1"
  if [ ! -f "$candidate_file" ] || [ ! -s "$candidate_file" ]; then
    return 1
  fi

  for pass in "${KEYSTORE_PASSWORD:-}" "HG97HDGpDRjL" "almihrab2026"; do
    if [ -z "$pass" ]; then
      continue
    fi
    local output
    if output=$(keytool -list -v -keystore "$candidate_file" -alias almihrab-key -storepass "$pass" 2>/dev/null); then
      local sha1
      sha1=$(echo "$output" | grep -i "SHA1:" | head -n 1 | sed 's/.*SHA1: //I' | tr -d ' \r\n' | tr '[:lower:]' '[:upper:]')
      local sha256
      sha256=$(echo "$output" | grep -i "SHA256:" | head -n 1 | sed 's/.*SHA256: //I' | tr -d ' \r\n' | tr '[:lower:]' '[:upper:]')
      echo "  -> Candidate keystore SHA1: $sha1 (password working)"
      if [ "$sha1" = "$EXPECTED_SHA1" ]; then
        cp "$candidate_file" "$TARGET_KEYSTORE"
        echo "RESOLVED_KEYSTORE_PASS=$pass" >> "$GITHUB_ENV"
        echo "SIGNING_SHA1=$sha1" >> "$GITHUB_ENV"
        echo "SIGNING_SHA256=$sha256" >> "$GITHUB_ENV"
        echo "✅ MATCH FOUND! Restored exact Google Play Upload Key ($EXPECTED_SHA1)"
        return 0
      fi
    fi
  done
  return 1
}

echo "Searching for Google Play Console Upload Key with SHA1: $EXPECTED_SHA1 ..."

# 1. Check if KEYSTORE_BASE64 secret is provided
if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "Checking ANDROID_KEYSTORE_BASE64 secret..."
  echo "$KEYSTORE_BASE64" | base64 --decode > /tmp/candidate_secret.keystore || true
  if check_keystore_candidate /tmp/candidate_secret.keystore; then
    exit 0
  fi
fi

# 2. Check if signing-keystore.b64 exists in repository
if [ -f "$B64_CACHE_FILE" ]; then
  echo "Checking repository signing-keystore.b64..."
  base64 --decode < "$B64_CACHE_FILE" > /tmp/candidate_b64.keystore || true
  if check_keystore_candidate /tmp/candidate_b64.keystore; then
    exit 0
  fi
fi

# 3. Search all previous GitHub Releases in this repository
if command -v gh >/dev/null 2>&1 && [ -n "${GH_TOKEN:-}" ]; then
  echo "Searching previous GitHub Releases in $GITHUB_REPOSITORY..."
  TAGS=$(gh release list --repo "$GITHUB_REPOSITORY" --limit 30 --json tagName -q '.[].tagName' 2>/dev/null || true)
  for tag in $TAGS; do
    echo "Checking Release $tag..."
    rm -f /tmp/release_candidate.keystore
    if gh release download "$tag" --repo "$GITHUB_REPOSITORY" -p "android.keystore" -O /tmp/release_candidate.keystore --clobber 2>/dev/null; then
      if check_keystore_candidate /tmp/release_candidate.keystore; then
        exit 0
      fi
    fi
  done

  # 4. Search all previous GitHub Actions Artifacts in this repository
  echo "Searching previous GitHub Actions Artifacts in $GITHUB_REPOSITORY..."
  ARTIFACT_IDS=$(gh api "repos/$GITHUB_REPOSITORY/actions/artifacts?per_page=30" -q '.artifacts[].id' 2>/dev/null || true)
  for aid in $ARTIFACT_IDS; do
    echo "Checking Artifact ID $aid..."
    rm -rf /tmp/artifact_dl /tmp/artifact.zip
    mkdir -p /tmp/artifact_dl
    if gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$aid/zip" > /tmp/artifact.zip 2>/dev/null; then
      unzip -q -o /tmp/artifact.zip -d /tmp/artifact_dl 2>/dev/null || true
      if [ -f /tmp/artifact_dl/android.keystore ]; then
        if check_keystore_candidate /tmp/artifact_dl/android.keystore; then
          exit 0
        fi
      fi
    fi
  done
fi

echo "⚠️ Original Upload Key ($EXPECTED_SHA1) was not found in Releases/Artifacts; checking fallback or generating..."
PASS="${KEYSTORE_PASSWORD:-HG97HDGpDRjL}"
if [ ! -f "$TARGET_KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$TARGET_KEYSTORE" \
    -alias almihrab-key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$PASS" \
    -keypass "$PASS" \
    -dname "CN=Al-Mihrab, OU=MobileEngineering, O=AlMihrabStudio, L=Makkah, S=Makkah, C=SA"
fi
SHA1=$(keytool -list -v -keystore "$TARGET_KEYSTORE" -alias almihrab-key -storepass "$PASS" | grep -i "SHA1:" | head -n 1 | sed 's/.*SHA1: //I' | tr -d ' \r\n')
SHA256=$(keytool -list -v -keystore "$TARGET_KEYSTORE" -alias almihrab-key -storepass "$PASS" | grep -i "SHA256:" | head -n 1 | sed 's/.*SHA256: //I' | tr -d ' \r\n')
echo "RESOLVED_KEYSTORE_PASS=$PASS" >> "$GITHUB_ENV"
echo "SIGNING_SHA1=$SHA1" >> "$GITHUB_ENV"
echo "SIGNING_SHA256=$SHA256" >> "$GITHUB_ENV"
