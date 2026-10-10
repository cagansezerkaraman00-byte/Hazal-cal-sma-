# Release checks

Do not publish preview features until the user approves them. Preserve user data.

1. Check every JavaScript file with `node --check` and run affected regression tests.
2. Set a new version and run `node scripts/build-release.cjs` after all source edits.
3. Test `tests/service-worker.test.cjs` against the generated manifest.
4. Upload large source files as base64 Git blobs. Before updating the branch, compare the remote tree's blob SHA for **every changed file** against the local Git blob SHA (`sha1("blob " + byteLength + "\0" + bytes)`). Stop on any mismatch. A successful connector response alone is not proof of complete upload.
5. Fetch the current branch head and use an expected-SHA update to preserve concurrent changes.
6. Wait for Pages deployment success, verify startup and affected features, and state any device/browser test limitations.

The 2.3.5 published app.js was incomplete despite local syntax tests passing. The complete copy was restored in 2.3.7 and all 37 published file hashes were verified. Do not reuse content fetched or uploaded without verifying full-file integrity.
