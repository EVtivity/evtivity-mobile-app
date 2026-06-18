Pod::Spec.new do |s|
  s.name           = 'EvtivityAttest'
  s.version        = '1.0.0'
  s.summary        = 'Apple App Attest bridge for EVtivity device attestation'
  s.description    = 'Exposes DCAppAttestService key generation, attestation, and assertion to JS.'
  s.author         = 'EVtivity'
  s.homepage       = 'https://evtivity.com'
  s.license        = 'BUSL-1.1'
  s.platforms      = { :ios => '14.0', :tvos => '14.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
