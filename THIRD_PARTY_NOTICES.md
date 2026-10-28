# Third-party notices and redistribution scope

This document does not license FinGuard or authorize model/image distribution. The candidate distributes application source, documentation, aggregate excerpts and reviewed screenshots, plus selected upstream notice texts. It does not vendor Python/Node packages, native model payloads, a built frontend or a container image. Imports and version locks identify dependencies obtained separately under their own licenses.

`release/third_party_metadata.json` inventories the 22 runtime Python distributions and all 333 frontend lock entries, including optional platform packages. `release/license_text_inventory.json` lists actual copied license/notice texts with hashes and provenance. Upstream copyright-holder names in these texts are intentional attributions, not private project identifiers. `release/container_packages.json` records the Debian inventory of the verified 8A-2 image; it does not ship those packages.

## Python

MIT/BSD/PSF/Apache and python-dateutil's dual-license metadata apply per package, not to FinGuard as a whole. NumPy/SciPy wheel notices also describe bundled numerical libraries and compiler runtimes (including OpenBLAS/LAPACK and applicable GCC runtime exceptions). A manylinux wheel's binary obligations cannot be inferred from its top-level SPDX label alone. Python itself uses PSF terms and includes third-party notices. Retain the license/copyright texts supplied with actual wheels when redistributing them.

## Frontend

Next.js, React, Zod and Lucide notices are preserved when available from the installed locked packages; build tooling has separate licenses. Sharp **0.35.5 is Apache-2.0**. The locked `@img/sharp-libvips-linux-x64` **1.3.4 declares LGPL-3.0-or-later**; this is a platform-binary package and must not be confused with sharp's own license or a blanket assertion about every libvips build. Lightning CSS **1.32.0 is MPL-2.0**, and caniuse-lite **1.0.30001819 is CC-BY-4.0** according to the reviewed lock. Preserve notices/attribution and examine exact bundled-library/source/relinking requirements before shipping compiled output or platform binaries.

Authoritative references: [sharp installation/licensing context](https://sharp.pixelplumbing.com/install/), [sharp-libvips packaging](https://github.com/lovell/sharp-libvips), [Lightning CSS license](https://github.com/parcel-bundler/lightningcss/blob/master/LICENSE), [caniuse-lite license](https://github.com/browserslist/caniuse-lite/blob/main/LICENSE). Host/build-only, optional and client-shipped content are distinct scopes. Installed macOS notices do not complete Linux/Windows optional-package obligations.

## Docker, Python base and Debian

The official Python slim-trixie image combines Python's license with licenses of individual Debian/base components. The [docker-library/python recipe license](https://github.com/docker-library/python/blob/master/LICENSE) is not a blanket license for every image byte. The verified image includes libgomp1/libstdc++6 14.2.0-19, with GCC/GPL runtime exceptions as applicable, and glibc 2.41-12+deb13u4 under its supplied notices. Review `/usr/share/doc/*/copyright`, `/usr/share/common-licenses` and the exact wheel/binary notices before any image distribution. Preserve required corresponding-source offers/materials where the applicable component license requires them; do not assume a link-only index always suffices.

## Completion boundary

The source-candidate notices and attribution are prepared, with exact copied-text inventories. No project license is invented. Complete binary redistribution clearance remains **pending** for any built frontend/container/native package set: collect exact target-platform notices and source obligations, reconcile the final SBOM and retain evidence before publishing binaries. Dataset/trained-model review remains independent in [model distribution](docs/model_distribution.md).
