# Developer-Controlled Versioning — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the frontend to match the backend's new developer-controlled versioning API — replacing all auto-bump dropdowns with explicit version text inputs across bundle upload, rollback, and promote flows.

**Architecture:** Surgical fixes to 5 files. No new components. No abstraction layers. `validateVersionCode` in `ktwUtils.js` already validates `MAJOR.MINOR.PATCH` format and is used at all call sites. The `api.js` `promote` function accepts `screenIds` as a plain string array from the caller — no fetching inside `api.js`.

**Tech Stack:** Vite + React 18, Zustand, Axios, Tailwind CSS. No test framework configured — verification is done via dev server + curl against `https://api.ketoy.dev`.

---

## File Map

| File | Change |
|---|---|
| `src/services/ktwUtils.js` | Add `VERSION_TAKEN` to error map |
| `src/services/api.js` | Update `uploadBundleKtw`, `rollback`, `bundleAPI.promote` signatures |
| `src/components/VersionHistoryModal.jsx` | Add `rollbackNewVersion` input to rollback confirm overlay |
| `src/pages/ProjectDetailPage.jsx` | Replace bundle `bundleBump` dropdown → `bundleVersion` input; replace promote `promoteBump` dropdown → `promoteNewVersion` input |
| `src/pages/BundleSnapshotsPage.jsx` | Replace `promoteBump` dropdown → `promoteNewBundleVersion` input |

---

## Task 1: Add VERSION_TAKEN error + update api.js signatures

**Files:**
- Modify: `src/services/ktwUtils.js`
- Modify: `src/services/api.js`

### ktwUtils.js

- [ ] **Step 1: Add VERSION_TAKEN to the error code map**

In `src/services/ktwUtils.js`, find `const API_ERROR_MESSAGES = {` and add one entry:

```js
const API_ERROR_MESSAGES = {
  INVALID_KTW: 'File is not a valid KTW binary',
  BUNDLE_TOO_LARGE: 'Bundle exceeds 50 screens',
  UNSUPPORTED_MEDIA_TYPE: 'Wrong content type — use a .ktw file',
  FORBIDDEN: "You don't own this app",
  CONFLICT: 'App ID already exists',
  PAYLOAD_TOO_LARGE: 'File exceeds 1 MB limit',
  INVALID_VERSION: 'Version must be in MAJOR.MINOR.PATCH format (e.g. 1.0.3)',
  INVALID_JSON: 'Request body is not valid JSON',
  MISSING_FIELDS: 'A required field is missing from the request',
  VERSION_TAKEN: 'This version already exists. Choose a different version number.'
}
```

### api.js — uploadBundleKtw

- [ ] **Step 2: Update `uploadBundle` wrapper and `uploadBundleKtw`**

Find these two lines in `src/services/api.js`:

```js
  uploadBundle: (bundleId, screens, bump = 'patch') => screenAPI.uploadBundleKtw(bundleId, screens, bump),

  uploadBundleKtw: (bundleId, screens, bump = 'patch') => {
    const normalizedBump = ['patch', 'minor', 'major'].includes(bump) ? bump : 'patch'
    return api.post(`/apps/${encodeURIComponent(bundleId)}/screens/bundle/ktw`, { bump: normalizedBump, screens })
  },
```

Replace with:

```js
  uploadBundle: (bundleId, screens, bundleVersion) => screenAPI.uploadBundleKtw(bundleId, screens, bundleVersion),

  uploadBundleKtw: (bundleId, screens, bundleVersion) => {
    return api.post(`/apps/${encodeURIComponent(bundleId)}/screens/bundle/ktw`, {
      bundleVersion,
      screens: screens.map((s) => ({ screenId: s.screenId, version: bundleVersion, ktw: s.ktw }))
    })
  },
```

### api.js — rollback

- [ ] **Step 3: Update `rollback` to send `newVersion`**

Find:

```js
  rollback: (bundleId, screenId, version) => api.post(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}/rollback`, { version })
```

Replace with:

```js
  rollback: (bundleId, screenId, version, newVersion) => api.post(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}/rollback`, { version, newVersion })
```

### api.js — bundleAPI.promote

- [ ] **Step 4: Update `bundleAPI.promote` to accept `newBundleVersion` + `screenIds`**

Find:

```js
  promote: (bundleId, snapshotId, bump = 'major') => {
    const normalizedBump = ['patch', 'minor', 'major'].includes(bump) ? bump : 'major'
    return api.post(`/apps/${encodeURIComponent(bundleId)}/bundles/${encodeURIComponent(snapshotId)}/promote`, { bump: normalizedBump })
  }
```

Replace with:

```js
  promote: (bundleId, snapshotId, newBundleVersion, screenIds) => {
    return api.post(`/apps/${encodeURIComponent(bundleId)}/bundles/${encodeURIComponent(snapshotId)}/promote`, {
      newBundleVersion,
      screens: screenIds.map((screenId) => ({ screenId, newVersion: newBundleVersion }))
    })
  }
```

- [ ] **Step 5: Commit**

```bash
cd /home/parth/ccode/console-ui/ketoy-console-/console-ui
git add src/services/ktwUtils.js src/services/api.js
git commit -m "feat: update api.js to developer-controlled versioning — uploadBundleKtw, rollback, promote"
```

---

## Task 2: VersionHistoryModal — add `newVersion` input to rollback

**Files:**
- Modify: `src/components/VersionHistoryModal.jsx`

The rollback confirm overlay currently has no `newVersion` field. The user must specify what version the restored content will be published as.

- [ ] **Step 1: Add `rollbackNewVersion` state**

At the top of the component body (near line 43, after `const [rolling, setRolling] = useState(false)`), add:

```js
const [rollbackNewVersion, setRollbackNewVersion] = useState('')
```

- [ ] **Step 2: Reset `rollbackNewVersion` when the overlay opens**

In `handleClose` and whenever `pendingRollbackVersion` is cleared, also clear `rollbackNewVersion`. Find `handleClose`:

```js
const handleClose = () => {
  setFetchError(null)
  setSuccessMessage('')
  setPendingRollbackVersion('')
  onClose()
}
```

Replace with:

```js
const handleClose = () => {
  setFetchError(null)
  setSuccessMessage('')
  setPendingRollbackVersion('')
  setRollbackNewVersion('')
  onClose()
}
```

Also find the Cancel button handler inside the confirm overlay (`onClick={() => setPendingRollbackVersion('')}`) and update it:

```jsx
onClick={() => { setPendingRollbackVersion(''); setRollbackNewVersion('') }}
```

- [ ] **Step 3: Validate and call rollback with `newVersion`**

Find `handleRollback`. Replace the entire function:

```js
const handleRollback = async () => {
  if (!pendingRollbackVersion) return

  const versionError = validateVersionCode(rollbackNewVersion)
  if (versionError) {
    setFetchError(versionError)
    return
  }

  setRolling(true)
  setFetchError(null)

  try {
    const response = await screenAPI.rollback(packageName, screenName, pendingRollbackVersion, rollbackNewVersion)
    const data = response.data?.data || {}
    const newVersion = data.newVersion || rollbackNewVersion
    setSuccessMessage(`Version ${pendingRollbackVersion} restored and published as ${newVersion}`)
    await fetchVersions()
    setSelectedVersion('')
    setPendingRollbackVersion('')
    setRollbackNewVersion('')
    if (onLoadVersion) {
      onLoadVersion()
    }
  } catch (err) {
    const status = err?.response?.status
    const code = err?.response?.data?.error?.code
    if (status === 404) {
      setFetchError('Version history is not available in this environment.')
    } else if (code === 'VERSION_TAKEN' || status === 409) {
      setFetchError(mapApiErrorMessage(err, 'This version already exists. Choose a different version number.'))
    } else {
      setFetchError(mapApiErrorMessage(err, 'Failed to roll back the selected version.'))
    }
  } finally {
    setRolling(false)
  }
}
```

Make sure `validateVersionCode` is imported. Check the import line at the top of the file:

```js
import { mapApiErrorMessage } from '../services/ktwUtils'
```

Update it to:

```js
import { mapApiErrorMessage, validateVersionCode } from '../services/ktwUtils'
```

- [ ] **Step 4: Add version input to the rollback confirm overlay**

Find the rollback confirm overlay JSX (the `{pendingRollbackVersion && (` block). Inside it, find the `<p>` tag describing the rollback. Add the input field and any version error display between the description paragraph and the buttons:

Replace the content of the confirm overlay inner div from:

```jsx
<h3 className="text-lg font-bold text-white mb-3">Rollback this version?</h3>
<p className="text-sm text-gray-300 mb-5">
  Rollback to <span className="font-mono text-white">{pendingRollbackVersion}</span>? This will create a new latest version with this content.
</p>
<div className="flex gap-3">
```

To:

```jsx
<h3 className="text-lg font-bold text-white mb-3">Rollback this version?</h3>
<p className="text-sm text-gray-300 mb-4">
  Restore content from <span className="font-mono text-white">{pendingRollbackVersion}</span> and publish it as a new version.
</p>
<div className="mb-5">
  <label className="block text-xs text-gray-400 mb-1">Publish restored content as</label>
  <input
    type="text"
    value={rollbackNewVersion}
    onChange={(e) => setRollbackNewVersion(e.target.value)}
    placeholder="e.g. 1.0.2"
    className="w-full bg-[#0f1c2e] border border-gray-700 rounded-md px-3 py-2 text-sm text-white font-mono"
  />
</div>
<div className="flex gap-3">
```

- [ ] **Step 5: Commit**

```bash
git add src/components/VersionHistoryModal.jsx
git commit -m "feat: rollback requires explicit newVersion input — developer-controlled versioning"
```

---

## Task 3: ProjectDetailPage — bundle upload + promote

**Files:**
- Modify: `src/pages/ProjectDetailPage.jsx`

Two independent UI changes in the same file. Make them sequentially.

### Part A — Bundle upload: replace `bundleBump` → `bundleVersion`

- [ ] **Step 1: Replace `bundleBump` state with `bundleVersion`**

Find (around line 44):

```js
const [bundleBump, setBundleBump] = useState('patch')
```

Replace with:

```js
const [bundleVersion, setBundleVersion] = useState('')
```

- [ ] **Step 2: Add `validateVersionCode` import**

Find the import from `ktwUtils`:

```js
import { fileToBase64, formatDateTime, formatKtwSizeKb, mapApiErrorMessage, prepareKtwUploadBinary, validateKtwFile } from '../services/ktwUtils'
```

Replace with:

```js
import { fileToBase64, formatDateTime, formatKtwSizeKb, mapApiErrorMessage, prepareKtwUploadBinary, validateKtwFile, validateVersionCode } from '../services/ktwUtils'
```

- [ ] **Step 3: Add version validation and pass `bundleVersion` in `handleBundleUpload`**

Find inside `handleBundleUpload`, the block just after the `bundleFiles.length > 50` check and before `setBundleUploading(true)`:

```js
    setBundleUploading(true)
    setBundleUploadMessage('')
    setBundleUploadResults([])
    setBundleUploadError('')
```

Replace with:

```js
    const versionError = validateVersionCode(bundleVersion)
    if (versionError) {
      setBundleUploadError(versionError)
      return
    }

    setBundleUploading(true)
    setBundleUploadMessage('')
    setBundleUploadResults([])
    setBundleUploadError('')
```

Then find the `uploadBundleKtw` call:

```js
      const response = await screenAPI.uploadBundleKtw(packageName, payload, bundleBump)
```

Replace with:

```js
      const response = await screenAPI.uploadBundleKtw(packageName, payload, bundleVersion)
```

- [ ] **Step 4: Replace bump dropdown with version text input in the JSX**

Find the bundle upload section JSX. The bump dropdown looks like:

```jsx
<label className="text-xs text-gray-500 whitespace-nowrap">Version bump</label>
<select
  value={bundleBump}
  onChange={(event) => setBundleBump(event.target.value)}
  className="bg-[#0f1c2e] border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white"
>
  <option value="major">Major</option>
  <option value="minor">Minor</option>
  <option value="patch">Patch</option>
</select>
```

Replace with:

```jsx
<label className="text-xs text-gray-500 whitespace-nowrap">Bundle Version</label>
<input
  type="text"
  value={bundleVersion}
  onChange={(event) => setBundleVersion(event.target.value)}
  placeholder="e.g. 1.0.0"
  className="bg-[#0f1c2e] border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white font-mono w-32"
/>
```

### Part B — Promote: replace `promoteBump` → `promoteNewVersion` + fetch screen IDs

- [ ] **Step 5: Replace `promoteBump` state with `promoteNewVersion`**

Find:

```js
const [promoteBump, setPromoteBump] = useState('major')
```

Replace with:

```js
const [promoteNewVersion, setPromoteNewVersion] = useState('')
```

- [ ] **Step 6: Update `handlePromoteSnapshot` to fetch screen IDs and validate**

Find `handlePromoteSnapshot`. Replace the entire function:

```js
const handlePromoteSnapshot = async (snapshot) => {
  const versionError = validateVersionCode(promoteNewVersion)
  if (versionError) {
    setPromoteError(versionError)
    return
  }

  setPromotingSnapshotId(snapshot.snapshotId)
  setPromoteError('')
  setPromoteMessage('')

  try {
    const detailResponse = await bundleAPI.getDetails(packageName, snapshot.snapshotId)
    const detailData = detailResponse.data?.data || {}
    const screenIds = Object.keys(detailData.screens || {})

    const response = await bundleAPI.promote(packageName, snapshot.snapshotId, promoteNewVersion, screenIds)
    const data = response.data?.data || {}
    const newBundleVersion = data.newBundleVersion || promoteNewVersion
    const screenResults = Array.isArray(data.results)
      ? data.results.filter((item) => item?.ok).map((item) => `${item.screenId}:${item.newVersion || '-'}`)
      : []
    const versionsLine = screenResults.length > 0 ? ` Screens: ${screenResults.join(', ')}` : ''
    setPromoteMessage(`Promoted successfully. Bundle version ${newBundleVersion}.${versionsLine}`)
    setConfirmPromoteSnapshotId('')
    setPromoteNewVersion('')
    await fetchScreens()
    await fetchSnapshots()
  } catch (err) {
    const code = err?.response?.data?.error?.code
    const status = err?.response?.status
    if (code === 'VERSION_TAKEN' || status === 409) {
      setPromoteError(mapApiErrorMessage(err, 'This version already exists. Choose a different version number.'))
    } else {
      setPromoteError(mapApiErrorMessage(err, 'Failed to promote snapshot'))
    }
  } finally {
    setPromotingSnapshotId('')
  }
}
```

- [ ] **Step 7: Replace the promote bump dropdown with a version text input in the JSX**

Inside the `{isConfirming && (` block, find:

```jsx
<div className="mt-3 max-w-[180px]">
  <label className="block text-xs text-amber-100/80 mb-1">Version bump</label>
  <select
    value={promoteBump}
    onChange={(event) => setPromoteBump(event.target.value)}
    className="w-full bg-[#0f1c2e] border border-amber-500/40 rounded-md px-2.5 py-1.5 text-xs text-white"
  >
    <option value="major">Major</option>
    <option value="minor">Minor</option>
    <option value="patch">Patch</option>
  </select>
</div>
```

Replace with:

```jsx
<div className="mt-3 max-w-[180px]">
  <label className="block text-xs text-amber-100/80 mb-1">New Bundle Version</label>
  <input
    type="text"
    value={promoteNewVersion}
    onChange={(event) => setPromoteNewVersion(event.target.value)}
    placeholder="e.g. 2.0.0"
    className="w-full bg-[#0f1c2e] border border-amber-500/40 rounded-md px-2.5 py-1.5 text-xs text-white font-mono"
  />
</div>
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProjectDetailPage.jsx
git commit -m "feat: bundle upload and promote use explicit version inputs — developer-controlled versioning"
```

---

## Task 4: BundleSnapshotsPage — promote with explicit version

**Files:**
- Modify: `src/pages/BundleSnapshotsPage.jsx`

The `detail` state already holds snapshot detail (including `detail.screens`) when the user selects a snapshot — no extra fetch needed.

- [ ] **Step 1: Replace `promoteBump` state with `promoteNewBundleVersion`**

Find (around line 19):

```js
const [promoteBump, setPromoteBump] = useState('major')
```

Replace with:

```js
const [promoteNewBundleVersion, setPromoteNewBundleVersion] = useState('')
```

- [ ] **Step 2: Add `validateVersionCode` import**

Find the import from `ktwUtils`:

```js
import { formatDateTime, mapApiErrorMessage } from '../services/ktwUtils'
```

Replace with:

```js
import { formatDateTime, mapApiErrorMessage, validateVersionCode } from '../services/ktwUtils'
```

- [ ] **Step 3: Update `handlePromote` to validate and use `detail.screens`**

Find `handlePromote`. Replace the entire function:

```js
const handlePromote = async () => {
  if (!selectedSnapshotId) return

  const versionError = validateVersionCode(promoteNewBundleVersion)
  if (versionError) {
    setError(versionError)
    return
  }

  if (!detail?.screens || Object.keys(detail.screens).length === 0) {
    setError('Snapshot detail not loaded. Select the snapshot first.')
    return
  }

  setPromoting(true)
  setMessage('')
  setError('')

  try {
    const screenIds = Object.keys(detail.screens)
    const response = await bundleAPI.promote(packageName, selectedSnapshotId, promoteNewBundleVersion, screenIds)
    const data = response.data?.data || {}
    const newBundleVersion = data.newBundleVersion || promoteNewBundleVersion
    const screenResults = Array.isArray(data.results)
      ? data.results.filter((item) => item?.ok).map((item) => `${item.screenId}:${item.newVersion || '-'}`)
      : []
    const versionsLine = screenResults.length > 0 ? ` Screens: ${screenResults.join(', ')}` : ''
    setMessage(`Snapshot promoted. Bundle version ${newBundleVersion}.${versionsLine}`)
    setPromoteNewBundleVersion('')
    await fetchDetail(selectedSnapshotId)
    await fetchList()
  } catch (err) {
    const code = err?.response?.data?.error?.code
    const status = err?.response?.status
    if (code === 'VERSION_TAKEN' || status === 409) {
      setError(mapApiErrorMessage(err, 'This version already exists. Choose a different version number.'))
    } else {
      setError(mapApiErrorMessage(err, 'Failed to promote snapshot'))
    }
  } finally {
    setPromoting(false)
    setShowPromoteConfirm(false)
  }
}
```

Note: keep `setShowPromoteConfirm(false)` in `finally` so the dialog always closes after the attempt (success or non-409 error). On 409 we set an error but the dialog closes — the error appears in the main page error banner. This is consistent with the existing pattern.

- [ ] **Step 4: Replace bump dropdown in the promote dialog JSX**

Find inside the `{showPromoteConfirm && (` block:

```jsx
<div className="mb-5">
  <label className="block text-xs text-gray-400 mb-1">Version bump</label>
  <select
    value={promoteBump}
    onChange={(event) => setPromoteBump(event.target.value)}
    className="w-full bg-[#0f1c2e] border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
  >
    <option value="major">Major</option>
    <option value="minor">Minor</option>
    <option value="patch">Patch</option>
  </select>
</div>
```

Replace with:

```jsx
<div className="mb-5">
  <label className="block text-xs text-gray-400 mb-1">New Bundle Version</label>
  <input
    type="text"
    value={promoteNewBundleVersion}
    onChange={(event) => setPromoteNewBundleVersion(event.target.value)}
    placeholder="e.g. 2.0.0"
    className="w-full bg-[#0f1c2e] border border-gray-700 rounded-md px-3 py-2 text-sm text-white font-mono"
  />
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/BundleSnapshotsPage.jsx
git commit -m "feat: bundle snapshots promote uses explicit version input — developer-controlled versioning"
```

---

## Task 5: Verify end-to-end against live API

Start the dev server:

```bash
cd /home/parth/ccode/console-ui/ketoy-console-/console-ui
pnpm dev
```

Work through each flow in order. Use the credentials from `API_TESTING_V5.md`.

### Verify 1 — Single screen upload (already worked, sanity check)

1. Navigate to a screen's editor page.
2. Choose a `.ktw` file, type version `1.0.0`, click Upload.
3. Expected: success banner. Screen info panel shows updated version.
4. Try uploading again with the same version `1.0.0`.
5. Expected: inline error "This version already exists. Choose a different version number."

### Verify 2 — Rollback

1. Open Version History on a screen that has ≥2 versions.
2. Select any non-current version, click Rollback.
3. The confirm overlay should show the "Publish restored content as" input.
4. Leave it blank and click Confirm → expected: inline error "Version code is required."
5. Type an invalid version like `bad` → expected: inline error about MAJOR.MINOR.PATCH.
6. Type a new valid version (e.g. `1.5.0`) → confirm.
7. Expected: success message "Version X.Y.Z restored and published as 1.5.0".
8. Try rolling back again using `1.5.0` → expected: "This version already exists."

### Verify 3 — Bundle upload

1. Navigate to a project with screens.
2. In the bundle upload section, select 1-2 `.ktw` files.
3. Leave Bundle Version blank, click Upload → expected: inline error.
4. Type `bad-version` → expected: format error.
5. Type `2.0.0`, click Upload.
6. Expected: success message showing `Bundle version 2.0.0`. Results table shows per-screen versions as `2.0.0`.
7. Upload again with the same files and version `2.0.0` → expected: "This version already exists."

### Verify 4 — Promote from ProjectDetailPage

1. On a project with a bundle snapshot, click Promote on a snapshot.
2. Confirm inline panel opens showing "New Bundle Version" input.
3. Leave blank → expected: validation error shown inline.
4. Type `3.0.0`, click Confirm Promote.
5. Expected: success message "Promoted successfully. Bundle version 3.0.0."

### Verify 5 — Promote from BundleSnapshotsPage

1. Navigate to `/projects/{appId}/bundles`.
2. Click a snapshot row to select it (loads detail).
3. Click Promote → dialog opens with "New Bundle Version" input.
4. Type `4.0.0`, click Confirm Promote.
5. Expected: success message with bundle version and per-screen versions.
6. Try `4.0.0` again → expected: 409 error shown inline.

---

## Self-Review Checklist

- [x] `uploadBundleKtw` body matches spec: `{ bundleVersion, screens: [{ screenId, version, ktw }] }`
- [x] `rollback` body matches spec: `{ version, newVersion }`
- [x] `promote` body matches spec: `{ newBundleVersion, screens: [{ screenId, newVersion }] }`
- [x] `snapshotId` in promote URL uses the variable directly (it's now the bundle version string, but the template `${encodeURIComponent(snapshotId)}` is unchanged — correct)
- [x] `VERSION_TAKEN` error code mapped in `ktwUtils.js` and caught at all three call sites (rollback, bundle upload, promote)
- [x] `validateVersionCode` called before every API call that accepts a version
- [x] Rollback `newVersion` state cleared on close, on cancel, and on success
- [x] `promoteNewVersion` / `promoteNewBundleVersion` cleared on success
- [x] `bundleVersion` state is NOT cleared on success (user may want to bump minor next)
- [x] `ProjectDetailPage` promote fetches snapshot detail to get `screenIds` — `api.js` does not fetch internally
- [x] `BundleSnapshotsPage` uses `detail.screens` (already loaded) — no extra fetch
- [x] No bump/auto-version logic remains anywhere
