// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

package com.evtivity.attest

import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Google Play Integrity bridge. The nonce passed from JS is the server
// challenge; the backend decodes the returned token and checks the nonce echoes
// back. Classic request flow: setCloudProjectNumber is optional for apps served
// by Play and only used when the caller supplies it.
class EvtivityAttestModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EvtivityAttest")

    Function("isSupported") {
      true
    }

    AsyncFunction("requestIntegrityToken") { nonce: String, cloudProjectNumber: String?, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject(Exceptions.ReactContextLost())
        return@AsyncFunction
      }
      val manager = IntegrityManagerFactory.create(context)
      val builder = IntegrityTokenRequest.builder().setNonce(nonce)
      cloudProjectNumber?.toLongOrNull()?.let { builder.setCloudProjectNumber(it) }
      manager
        .requestIntegrityToken(builder.build())
        .addOnSuccessListener { response -> promise.resolve(response.token()) }
        .addOnFailureListener { e -> promise.reject("INTEGRITY_FAILED", e.message ?: "Play Integrity request failed", e) }
    }

    AsyncFunction("generateKey") { promise: Promise ->
      promise.reject("UNSUPPORTED", "App Attest is iOS-only", null)
    }

    AsyncFunction("attestKey") { _: String, _: String, promise: Promise ->
      promise.reject("UNSUPPORTED", "App Attest is iOS-only", null)
    }

    AsyncFunction("generateAssertion") { _: String, _: String, promise: Promise ->
      promise.reject("UNSUPPORTED", "App Attest is iOS-only", null)
    }
  }
}
