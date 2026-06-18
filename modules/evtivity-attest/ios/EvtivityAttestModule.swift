// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import ExpoModulesCore
import DeviceCheck
import CryptoKit

// Apple App Attest bridge. The challenge passed from JS is the server nonce; the
// clientDataHash signed on device is SHA256(challenge), which the backend
// recomputes when verifying the attestation and each assertion.
public class EvtivityAttestModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EvtivityAttest")

    Function("isSupported") { () -> Bool in
      if #available(iOS 14.0, *) {
        return DCAppAttestService.shared.isSupported
      }
      return false
    }

    AsyncFunction("generateKey") { (promise: Promise) in
      guard #available(iOS 14.0, *), DCAppAttestService.shared.isSupported else {
        promise.reject("UNSUPPORTED", "App Attest is not supported on this device")
        return
      }
      DCAppAttestService.shared.generateKey { keyId, error in
        if let error = error {
          promise.reject("KEYGEN_FAILED", error.localizedDescription)
          return
        }
        guard let keyId = keyId else {
          promise.reject("KEYGEN_FAILED", "generateKey returned no key id")
          return
        }
        promise.resolve(keyId)
      }
    }

    AsyncFunction("attestKey") { (keyId: String, challenge: String, promise: Promise) in
      guard #available(iOS 14.0, *) else {
        promise.reject("UNSUPPORTED", "App Attest is not supported on this device")
        return
      }
      let clientDataHash = Data(SHA256.hash(data: Data(challenge.utf8)))
      DCAppAttestService.shared.attestKey(keyId, clientDataHash: clientDataHash) { attestation, error in
        if let error = error {
          promise.reject("ATTEST_FAILED", error.localizedDescription)
          return
        }
        guard let attestation = attestation else {
          promise.reject("ATTEST_FAILED", "attestKey returned no object")
          return
        }
        promise.resolve(attestation.base64EncodedString())
      }
    }

    AsyncFunction("generateAssertion") { (keyId: String, challenge: String, promise: Promise) in
      guard #available(iOS 14.0, *) else {
        promise.reject("UNSUPPORTED", "App Attest is not supported on this device")
        return
      }
      let clientDataHash = Data(SHA256.hash(data: Data(challenge.utf8)))
      DCAppAttestService.shared.generateAssertion(keyId, clientDataHash: clientDataHash) { assertion, error in
        if let error = error {
          promise.reject("ASSERT_FAILED", error.localizedDescription)
          return
        }
        guard let assertion = assertion else {
          promise.reject("ASSERT_FAILED", "generateAssertion returned no object")
          return
        }
        promise.resolve(assertion.base64EncodedString())
      }
    }

    AsyncFunction("requestIntegrityToken") { (_ nonce: String, _ cloudProjectNumber: String?, promise: Promise) in
      promise.reject("UNSUPPORTED", "Play Integrity is Android-only")
    }
  }
}
